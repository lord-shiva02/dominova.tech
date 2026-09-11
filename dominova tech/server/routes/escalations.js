const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { createNotification, createLeadActivity } = require('../middleware/helpers');

const router = express.Router();

// GET /api/escalations — List escalations
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const user = req.user;
  const { status, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT me.*, 
      l.lead_id, l.client_name as lead_client_name, l.phone as lead_phone,
      u1.name as salesperson_name, u2.name as manager_name
    FROM manager_escalations me
    JOIN leads l ON me.lead_id = l.id
    LEFT JOIN users u1 ON me.salesperson_id = u1.id
    LEFT JOIN users u2 ON me.manager_id = u2.id
    WHERE me.is_deleted = 0
  `;
  const params = [];

  if (user.role === 'sales') {
    query += ' AND me.salesperson_id = ?'; params.push(user.id);
  } else if (user.role === 'manager') {
    query += ' AND me.manager_id = ?'; params.push(user.id);
  } else if (user.role === 'developer') {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (status) { query += ' AND me.status = ?'; params.push(status); }
  query += ` ORDER BY me.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const escalations = db.prepare(query).all(...params);
  res.json({ escalations });
});

// GET /api/escalations/:id — Single escalation
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const esc = db.prepare(`
    SELECT me.*, 
      l.lead_id, l.client_name, l.phone, l.email, l.org_name, l.google_business_url, l.instagram_url,
      u1.name as salesperson_name, u2.name as manager_name
    FROM manager_escalations me
    JOIN leads l ON me.lead_id = l.id
    LEFT JOIN users u1 ON me.salesperson_id = u1.id
    LEFT JOIN users u2 ON me.manager_id = u2.id
    WHERE me.id = ? AND me.is_deleted = 0
  `).get(req.params.id);

  if (!esc) return res.status(404).json({ error: 'Escalation not found' });

  const user = req.user;
  if (user.role === 'sales' && esc.salesperson_id !== user.id) return res.status(403).json({ error: 'Access denied' });
  if (user.role === 'manager' && esc.manager_id !== user.id) return res.status(403).json({ error: 'Access denied' });

  res.json({ escalation: esc });
});

// PUT /api/escalations/:id — Manager updates escalation
router.put('/:id', authenticate, requireRole('admin', 'manager'), (req, res) => {
  const db = getDb();
  const esc = db.prepare('SELECT * FROM manager_escalations WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!esc) return res.status(404).json({ error: 'Escalation not found' });

  if (req.user.role === 'manager' && esc.manager_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { status, manager_notes, followup_date } = req.body;
  const validStatuses = ['PENDING_MANAGER','IN_DISCUSSION','FOLLOW_UP','CONVERTED','LOST','CLOSED'];

  const updates = {};
  if (status && validStatuses.includes(status)) updates.status = status;
  if (manager_notes !== undefined) updates.manager_notes = manager_notes;
  if (followup_date) updates.followup_date = followup_date;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE manager_escalations SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    .run(...Object.values(updates), req.params.id);

  // Notify salesperson of manager response
  createNotification(db, {
    userId: esc.salesperson_id, title: 'Manager Updated Escalation',
    message: `Manager has updated your escalation for lead ${esc.lead_id}. Status: ${status || 'updated'}`,
    type: 'INFO', entityType: 'escalation', entityId: esc.id,
    link: `/sales/leads/${esc.lead_id}`,
  });

  res.json({ message: 'Escalation updated' });
});

// POST /api/escalations/:id/convert — Manager converts escalated lead
router.post('/:id/convert', authenticate, requireRole('admin', 'manager'), (req, res) => {
  const db = getDb();
  const esc = db.prepare(`
    SELECT me.*, l.* FROM manager_escalations me 
    JOIN leads l ON me.lead_id = l.id 
    WHERE me.id = ? AND me.is_deleted = 0
  `).get(req.params.id);

  if (!esc) return res.status(404).json({ error: 'Escalation not found' });

  const { full_project_amount, advance_amount, requirements, specifications, website_expectations, notes } = req.body;
  if (!full_project_amount) return res.status(400).json({ error: 'full_project_amount is required' });

  function nextProjectId() {
    const row = db.prepare("SELECT MAX(CAST(SUBSTR(project_id, 10) AS INTEGER)) as n FROM projects").get();
    return `DOM-PROJ-${String((row.n || 0) + 1).padStart(4, '0')}`;
  }

  const projectId = nextProjectId();
  const projectResult = db.prepare(`
    INSERT INTO projects 
    (project_id, lead_id, salesperson_id, client_name, org_name, phone, email,
     google_business_url, instagram_url, requirements, specifications, website_expectations,
     full_project_amount, advance_amount, status, payment_status, salesperson_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_ADMIN_APPROVAL', ?, ?)
  `).run(
    projectId, esc.lead_id, esc.salesperson_id,
    esc.client_name, esc.org_name, esc.phone, esc.email,
    esc.google_business_url, esc.instagram_url,
    requirements || esc.requirements, specifications || null, website_expectations || null,
    parseFloat(full_project_amount), parseFloat(advance_amount || 0),
    advance_amount > 0 ? 'PARTIAL' : 'PENDING', notes || esc.manager_notes
  );

  db.prepare(`UPDATE manager_escalations SET status = 'CONVERTED', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  db.prepare(`UPDATE leads SET status = 'CONVERTED', updated_at = datetime('now') WHERE id = ?`).run(esc.lead_id);

  createLeadActivity(db, {
    leadId: esc.lead_id, userId: req.user.id,
    activityType: 'CONVERTED', description: `Converted by manager. Project ${projectId} created.`,
  });

  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
  for (const admin of admins) {
    createNotification(db, {
      userId: admin.id, title: 'New Project from Manager',
      message: `Manager converted escalation to project ${projectId}`,
      type: 'ACTION_REQUIRED', entityType: 'project', entityId: projectResult.lastInsertRowid,
      link: `/admin/projects/${projectResult.lastInsertRowid}`,
    });
  }

  res.json({ message: 'Lead converted by manager', projectId });
});

module.exports = router;
