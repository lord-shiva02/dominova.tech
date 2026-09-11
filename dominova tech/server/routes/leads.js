const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { createAuditLog, createLeadActivity, createNotification } = require('../middleware/helpers');

const router = express.Router();

function nextLeadId(db) {
  const row = db.prepare("SELECT MAX(CAST(SUBSTR(lead_id, 10) AS INTEGER)) as n FROM leads").get();
  const n = (row.n || 0) + 1;
  return `DOM-LEAD-${String(n).padStart(4, '0')}`;
}

function getLeadWithDetails(db, leadId) {
  return db.prepare(`
    SELECT l.*, 
      u1.name as assigned_to_name, u1.email as assigned_to_email,
      u2.name as created_by_name
    FROM leads l
    LEFT JOIN users u1 ON l.assigned_to = u1.id
    LEFT JOIN users u2 ON l.created_by = u2.id
    WHERE l.id = ? AND l.is_deleted = 0
  `).get(leadId);
}

// GET /api/leads — List leads with filters
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { status, assigned_to, search, from_date, to_date, page = 1, limit = 50 } = req.query;
  const user = req.user;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT l.*, 
      u1.name as assigned_to_name,
      u2.name as created_by_name
    FROM leads l
    LEFT JOIN users u1 ON l.assigned_to = u1.id
    LEFT JOIN users u2 ON l.created_by = u2.id
    WHERE l.is_deleted = 0
  `;
  const params = [];

  // Role-based filtering: sales can only see their own leads
  if (user.role === 'sales') {
    query += ' AND l.assigned_to = ?';
    params.push(user.id);
  } else if (user.role === 'developer') {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (status) { query += ' AND l.status = ?'; params.push(status); }
  if (assigned_to && user.role === 'admin') { query += ' AND l.assigned_to = ?'; params.push(assigned_to); }
  if (search) {
    query += ` AND (l.client_name LIKE ? OR l.org_name LIKE ? OR l.phone LIKE ? 
               OR l.lead_id LIKE ? OR l.email LIKE ? OR u1.name LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s, s, s);
  }
  if (from_date) { query += ' AND DATE(l.created_at) >= ?'; params.push(from_date); }
  if (to_date) { query += ' AND DATE(l.created_at) <= ?'; params.push(to_date); }

  const countQuery = query.replace('SELECT l.*, \n      u1.name as assigned_to_name,\n      u2.name as created_by_name', 'SELECT COUNT(*) as total');
  const total = db.prepare(countQuery).get(...params).total;

  query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const leads = db.prepare(query).all(...params);
  res.json({ leads, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/leads/stats — Dashboard stats
router.get('/stats', authenticate, (req, res) => {
  const db = getDb();
  const user = req.user;
  let base = 'FROM leads WHERE is_deleted = 0';
  const params = [];

  if (user.role === 'sales') {
    base += ' AND assigned_to = ?';
    params.push(user.id);
  }

  const stats = {
    total: db.prepare(`SELECT COUNT(*) as n ${base}`).get(...params).n,
    new: db.prepare(`SELECT COUNT(*) as n ${base} AND status = 'NEW'`).get(...params).n,
    assigned: db.prepare(`SELECT COUNT(*) as n ${base} AND status = 'ASSIGNED'`).get(...params).n,
    contacted: db.prepare(`SELECT COUNT(*) as n ${base} AND status = 'CONTACTED'`).get(...params).n,
    interested: db.prepare(`SELECT COUNT(*) as n ${base} AND status = 'INTERESTED'`).get(...params).n,
    follow_up: db.prepare(`SELECT COUNT(*) as n ${base} AND status = 'FOLLOW_UP'`).get(...params).n,
    manager_review: db.prepare(`SELECT COUNT(*) as n ${base} AND status = 'MANAGER_REVIEW'`).get(...params).n,
    converted: db.prepare(`SELECT COUNT(*) as n ${base} AND status = 'CONVERTED'`).get(...params).n,
    lost: db.prepare(`SELECT COUNT(*) as n ${base} AND status = 'LOST'`).get(...params).n,
    followups_due_today: db.prepare(`
      SELECT COUNT(*) as n FROM lead_followups lf
      JOIN leads l ON lf.lead_id = l.id
      WHERE lf.status = 'PENDING' AND DATE(lf.followup_date) = DATE('now')
      ${user.role === 'sales' ? 'AND l.assigned_to = ?' : ''}
    `).get(...(user.role === 'sales' ? [user.id] : [])).n,
  };
  res.json({ stats });
});

// GET /api/leads/:id — Single lead detail
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const lead = getLeadWithDetails(db, req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  // Sales can only see their own leads
  if (req.user.role === 'sales' && lead.assigned_to !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (req.user.role === 'developer') return res.status(403).json({ error: 'Access denied' });

  const followups = db.prepare(`
    SELECT lf.*, u.name as created_by_name 
    FROM lead_followups lf JOIN users u ON lf.created_by = u.id 
    WHERE lf.lead_id = ? ORDER BY lf.followup_date DESC
  `).all(req.params.id);

  const activities = db.prepare(`
    SELECT la.*, u.name as user_name FROM lead_activities la 
    JOIN users u ON la.user_id = u.id 
    WHERE la.lead_id = ? ORDER BY la.created_at DESC
  `).all(req.params.id);

  const escalations = db.prepare(`
    SELECT me.*, u1.name as salesperson_name, u2.name as manager_name
    FROM manager_escalations me
    LEFT JOIN users u1 ON me.salesperson_id = u1.id
    LEFT JOIN users u2 ON me.manager_id = u2.id
    WHERE me.lead_id = ? AND me.is_deleted = 0
  `).all(req.params.id);

  res.json({ lead, followups, activities, escalations });
});

// POST /api/leads — Create lead
router.post('/', authenticate, requireRole('admin', 'sales'), (req, res) => {
  const db = getDb();
  const {
    client_name, org_name, phone, email, google_business_url, instagram_url,
    other_url, lead_source, assigned_to, notes, requirements
  } = req.body;

  if (!client_name || !phone) {
    return res.status(400).json({ error: 'Client name and phone are required' });
  }

  const leadId = nextLeadId(db);
  const assignedTo = req.user.role === 'sales' ? req.user.id : (assigned_to || null);
  const status = assignedTo ? 'ASSIGNED' : 'NEW';

  const result = db.prepare(`
    INSERT INTO leads (lead_id, client_name, org_name, phone, email, google_business_url, 
      instagram_url, other_url, lead_source, assigned_to, status, notes, requirements, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(leadId, client_name, org_name || null, phone, email || null,
    google_business_url || null, instagram_url || null, other_url || null,
    lead_source || 'Manual', assignedTo, status, notes || null, requirements || null, req.user.id);

  const newLead = getLeadWithDetails(db, result.lastInsertRowid);

  createAuditLog(db, {
    userId: req.user.id, action: 'CREATE_LEAD', entityType: 'lead',
    entityId: result.lastInsertRowid,
    description: `Lead ${leadId} created for ${client_name}`,
  });

  createLeadActivity(db, {
    leadId: result.lastInsertRowid, userId: req.user.id,
    activityType: 'CREATED', description: `Lead created by ${req.user.name}`,
  });

  // Notify assigned salesperson
  if (assignedTo && assignedTo !== req.user.id) {
    createNotification(db, {
      userId: assignedTo, title: 'New Lead Assigned',
      message: `You have been assigned lead ${leadId} — ${client_name}`,
      type: 'ACTION_REQUIRED', entityType: 'lead', entityId: result.lastInsertRowid,
      link: `/sales/leads/${result.lastInsertRowid}`,
    });
  }

  res.status(201).json({ lead: newLead, message: 'Lead created successfully' });
});

// PUT /api/leads/:id — Update lead details
router.put('/:id', authenticate, (req, res) => {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const user = req.user;
  if (user.role === 'sales' && lead.assigned_to !== user.id) {
    return res.status(403).json({ error: 'Access denied — not your lead' });
  }
  if (user.role === 'developer') return res.status(403).json({ error: 'Access denied' });

  const allowed = ['client_name','org_name','phone','email','google_business_url','instagram_url',
    'other_url','lead_source','notes','requirements','quoted_amount'];
  // Admin can also update: assigned_to, status
  if (user.role === 'admin') allowed.push('assigned_to', 'status', 'advance_amount', 'full_project_amount');

  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE leads SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    .run(...Object.values(updates), req.params.id);

  createLeadActivity(db, {
    leadId: req.params.id, userId: user.id,
    activityType: 'UPDATED', description: `Lead updated by ${user.name}: ${Object.keys(updates).join(', ')}`,
  });

  const updated = getLeadWithDetails(db, req.params.id);
  res.json({ lead: updated, message: 'Lead updated' });
});

// POST /api/leads/:id/assign — Admin assigns lead to salesperson
router.post('/:id/assign', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const { salesperson_id } = req.body;
  if (!salesperson_id) return res.status(400).json({ error: 'salesperson_id required' });

  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const salesperson = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'sales' AND is_active = 1").get(salesperson_id);
  if (!salesperson) return res.status(404).json({ error: 'Salesperson not found' });

  db.prepare(`UPDATE leads SET assigned_to = ?, status = 'ASSIGNED', updated_at = datetime('now') WHERE id = ?`)
    .run(salesperson_id, req.params.id);

  createLeadActivity(db, {
    leadId: req.params.id, userId: req.user.id,
    activityType: 'ASSIGNED', description: `Lead assigned to ${salesperson.name} by admin`,
  });

  createNotification(db, {
    userId: salesperson_id, title: 'Lead Assigned to You',
    message: `Lead ${lead.lead_id} (${lead.client_name}) has been assigned to you.`,
    type: 'ACTION_REQUIRED', entityType: 'lead', entityId: lead.id,
    link: `/sales/leads/${lead.id}`,
  });

  res.json({ message: `Lead assigned to ${salesperson.name}` });
});

// POST /api/leads/:id/contact — Record contact result
router.post('/:id/contact', authenticate, requireRole('admin', 'sales'), (req, res) => {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const user = req.user;
  if (user.role === 'sales' && lead.assigned_to !== user.id) {
    return res.status(403).json({ error: 'Access denied — not your lead' });
  }

  const { result, notes } = req.body;
  const validResults = ['INTERESTED', 'FOLLOW_UP', 'MANAGER_REVIEW', 'CONVERTED', 'LOST'];
  if (!result || !validResults.includes(result)) {
    return res.status(400).json({ error: `Result must be one of: ${validResults.join(', ')}` });
  }

  db.prepare(`UPDATE leads SET status = ?, notes = COALESCE(?, notes), 
    last_contacted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`)
    .run(result === 'CONVERTED' ? 'INTERESTED' : result, notes || null, req.params.id);

  createLeadActivity(db, {
    leadId: req.params.id, userId: user.id,
    activityType: 'CONTACTED',
    description: `Contact result: ${result}. Notes: ${notes || 'None'}`,
  });

  res.json({ message: 'Contact result recorded', status: result });
});

// POST /api/leads/:id/followup — Create follow-up
router.post('/:id/followup', authenticate, requireRole('admin', 'sales', 'manager'), (req, res) => {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const user = req.user;
  if (user.role === 'sales' && lead.assigned_to !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { followup_date, followup_time, reason, client_position, notes } = req.body;
  if (!followup_date || !reason) {
    return res.status(400).json({ error: 'followup_date and reason are required' });
  }

  const result = db.prepare(`
    INSERT INTO lead_followups (lead_id, created_by, followup_date, followup_time, reason, client_position, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, user.id, followup_date, followup_time || null, reason, client_position || null, notes || null);

  db.prepare(`UPDATE leads SET status = 'FOLLOW_UP', next_followup_date = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(followup_date, req.params.id);

  createLeadActivity(db, {
    leadId: req.params.id, userId: user.id,
    activityType: 'FOLLOW_UP_CREATED',
    description: `Follow-up scheduled for ${followup_date}: ${reason}`,
  });

  res.status(201).json({ message: 'Follow-up created', followupId: result.lastInsertRowid });
});

// POST /api/leads/:id/escalate — Push to manager
router.post('/:id/escalate', authenticate, requireRole('admin', 'sales'), (req, res) => {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const user = req.user;
  if (user.role === 'sales' && lead.assigned_to !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { quoted_price, requirements, reason, salesperson_notes, manager_id } = req.body;
  if (!reason) return res.status(400).json({ error: 'Reason for escalation is required' });

  // Find a manager if not specified
  let managerId = manager_id;
  if (!managerId) {
    const mgr = db.prepare("SELECT id FROM users WHERE role = 'manager' AND is_active = 1 LIMIT 1").get();
    if (mgr) managerId = mgr.id;
  }

  const escResult = db.prepare(`
    INSERT INTO manager_escalations 
    (lead_id, salesperson_id, manager_id, quoted_price, requirements, reason, salesperson_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, user.id, managerId, quoted_price || lead.quoted_amount,
    requirements || lead.requirements, reason, salesperson_notes || null);

  db.prepare(`UPDATE leads SET status = 'MANAGER_REVIEW', updated_at = datetime('now') WHERE id = ?`)
    .run(req.params.id);

  createLeadActivity(db, {
    leadId: req.params.id, userId: user.id,
    activityType: 'ESCALATED_TO_MANAGER',
    description: `Lead escalated to manager: ${reason}`,
  });

  if (managerId) {
    createNotification(db, {
      userId: managerId, title: 'Lead Escalated to You',
      message: `${user.name} has escalated lead ${lead.lead_id} (${lead.client_name}) for your review.`,
      type: 'ACTION_REQUIRED', entityType: 'lead', entityId: lead.id,
      link: `/manager/escalations/${escResult.lastInsertRowid}`,
    });
  }

  res.status(201).json({ message: 'Lead escalated to manager', escalationId: escResult.lastInsertRowid });
});

// POST /api/leads/:id/convert — Push to Admin / Convert
router.post('/:id/convert', authenticate, requireRole('admin', 'sales', 'manager'), (req, res) => {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const user = req.user;
  if (user.role === 'sales' && lead.assigned_to !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const {
    client_name, org_name, phone, email, google_business_url, instagram_url,
    requirements, specifications, website_expectations,
    full_project_amount, advance_amount, payment_status, salesperson_notes
  } = req.body;

  if (!full_project_amount || !requirements) {
    return res.status(400).json({ error: 'full_project_amount and requirements are required' });
  }

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
    projectId, lead.id, user.role === 'sales' ? user.id : lead.assigned_to,
    client_name || lead.client_name, org_name || lead.org_name, phone || lead.phone,
    email || lead.email, google_business_url || lead.google_business_url,
    instagram_url || lead.instagram_url, requirements, specifications || null,
    website_expectations || null, parseFloat(full_project_amount), parseFloat(advance_amount || 0),
    payment_status || 'PARTIAL', salesperson_notes || null
  );

  // Update lead status
  db.prepare(`UPDATE leads SET status = 'CONVERTED', full_project_amount = ?, advance_amount = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(parseFloat(full_project_amount), parseFloat(advance_amount || 0), req.params.id);

  createLeadActivity(db, {
    leadId: req.params.id, userId: user.id,
    activityType: 'CONVERTED',
    description: `Lead converted. Project ${projectId} created. Amount: ₹${full_project_amount}`,
  });

  // Record status history
  db.prepare(`INSERT INTO project_status_history (project_id, old_status, new_status, changed_by)
    VALUES (?, NULL, 'PENDING_ADMIN_APPROVAL', ?)`).run(projectResult.lastInsertRowid, user.id);

  // Notify admin
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
  for (const admin of admins) {
    createNotification(db, {
      userId: admin.id, title: 'New Project Pending Approval',
      message: `Project ${projectId} (${client_name || lead.client_name}) submitted by ${user.name} is awaiting your approval.`,
      type: 'ACTION_REQUIRED', entityType: 'project', entityId: projectResult.lastInsertRowid,
      link: `/admin/projects/${projectResult.lastInsertRowid}`,
    });
  }

  res.status(201).json({
    message: 'Lead converted. Project submitted for Admin approval.',
    projectId, projectDbId: projectResult.lastInsertRowid,
  });
});

// DELETE /api/leads/:id — Soft delete (Admin only)
router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  db.prepare("UPDATE leads SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  createAuditLog(db, {
    userId: req.user.id, action: 'DELETE_LEAD', entityType: 'lead', entityId: req.params.id,
    description: `Lead ${lead.lead_id} soft-deleted by admin`,
  });

  res.json({ message: 'Lead deleted' });
});

module.exports = router;
