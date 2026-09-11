const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  createAuditLog, createNotification, recordProjectStatusChange, creditWallet
} = require('../middleware/helpers');

const router = express.Router();

function getProjectDetail(db, id, field = 'id') {
  return db.prepare(`
    SELECT p.*,
      u1.name as salesperson_name, u1.email as salesperson_email,
      u2.name as developer_name, u2.email as developer_email,
      u3.name as approved_by_name,
      l.lead_id
    FROM projects p
    LEFT JOIN users u1 ON p.salesperson_id = u1.id
    LEFT JOIN users u2 ON p.developer_id = u2.id
    LEFT JOIN users u3 ON p.approved_by = u3.id
    LEFT JOIN leads l ON p.lead_id = l.id
    WHERE p.${field} = ? AND p.is_deleted = 0
  `).get(id);
}

// GET /api/projects — List projects
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const user = req.user;
  const { status, developer_id, salesperson_id, search, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT p.*, u1.name as salesperson_name, u2.name as developer_name
    FROM projects p
    LEFT JOIN users u1 ON p.salesperson_id = u1.id
    LEFT JOIN users u2 ON p.developer_id = u2.id
    WHERE p.is_deleted = 0
  `;
  const params = [];

  if (user.role === 'sales') {
    query += ' AND p.salesperson_id = ?'; params.push(user.id);
  } else if (user.role === 'developer') {
    query += ` AND (p.developer_id = ? OR p.status = 'AVAILABLE_FOR_DEVELOPER')`;
    params.push(user.id);
  } else if (user.role === 'manager') {
    // managers can see all projects for context
  }

  if (status) { query += ' AND p.status = ?'; params.push(status); }
  if (developer_id && user.role === 'admin') { query += ' AND p.developer_id = ?'; params.push(developer_id); }
  if (salesperson_id && user.role === 'admin') { query += ' AND p.salesperson_id = ?'; params.push(salesperson_id); }
  if (search) {
    query += ` AND (p.client_name LIKE ? OR p.org_name LIKE ? OR p.phone LIKE ? OR p.project_id LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  const countQuery = query.replace('SELECT p.*, u1.name as salesperson_name, u2.name as developer_name', 'SELECT COUNT(*) as total');
  const total = db.prepare(countQuery).get(...params).total;

  query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const projects = db.prepare(query).all(...params);
  res.json({ projects, total });
});

// GET /api/projects/stats
router.get('/stats', authenticate, (req, res) => {
  const db = getDb();
  const user = req.user;
  let base = 'FROM projects WHERE is_deleted = 0';
  const p = [];

  if (user.role === 'sales') { base += ' AND salesperson_id = ?'; p.push(user.id); }
  else if (user.role === 'developer') { base += ' AND developer_id = ?'; p.push(user.id); }

  const s = (status) => db.prepare(`SELECT COUNT(*) as n ${base} AND status = ?`).get(...p, status).n;

  res.json({
    pending_admin_approval: s('PENDING_ADMIN_APPROVAL'),
    available_for_developer: s('AVAILABLE_FOR_DEVELOPER'),
    assigned: s('ASSIGNED'),
    in_development: s('IN_DEVELOPMENT'),
    pending_final_approval: s('PENDING_FINAL_APPROVAL'),
    revision_required: s('REVISION_REQUIRED'),
    completed: s('COMPLETED'),
    total: db.prepare(`SELECT COUNT(*) as n ${base}`).get(...p).n,
    total_revenue: db.prepare(`SELECT COALESCE(SUM(full_project_amount), 0) as n ${base}`).get(...p).n,
    total_advance: db.prepare(`SELECT COALESCE(SUM(advance_amount), 0) as n ${base}`).get(...p).n,
  });
});

// GET /api/projects/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const project = getProjectDetail(db, req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const user = req.user;
  if (user.role === 'sales' && project.salesperson_id !== user.id) return res.status(403).json({ error: 'Access denied' });
  if (user.role === 'developer' && project.developer_id !== user.id && project.status !== 'AVAILABLE_FOR_DEVELOPER') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const statusHistory = db.prepare(`
    SELECT psh.*, u.name as changed_by_name 
    FROM project_status_history psh JOIN users u ON psh.changed_by = u.id 
    WHERE psh.project_id = ? ORDER BY psh.created_at ASC
  `).all(project.id);

  const messages = db.prepare(`
    SELECT pm.*, u.name as sender_name, u.role as sender_role 
    FROM project_messages pm JOIN users u ON pm.sender_id = u.id 
    WHERE pm.project_id = ? ORDER BY pm.created_at ASC
  `).all(project.id);

  const files = db.prepare(`
    SELECT pf.*, u.name as uploaded_by_name 
    FROM project_files pf JOIN users u ON pf.uploaded_by = u.id 
    WHERE pf.project_id = ? AND pf.is_deleted = 0 ORDER BY pf.created_at DESC
  `).all(project.id);

  const revisions = db.prepare(`
    SELECT pr.*, u.name as rejected_by_name 
    FROM project_revisions pr JOIN users u ON pr.rejected_by = u.id 
    WHERE pr.project_id = ? ORDER BY pr.revision_number ASC
  `).all(project.id);

  res.json({ project, statusHistory, messages, files, revisions });
});

// POST /api/projects/:id/approve — Admin approves pending project
router.post('/:id/approve', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (project.status !== 'PENDING_ADMIN_APPROVAL') {
    return res.status(400).json({ error: 'Project is not pending admin approval' });
  }

  const { developer_payout, admin_approval_notes } = req.body;
  if (!developer_payout) return res.status(400).json({ error: 'developer_payout is required when approving' });

  db.prepare(`
    UPDATE projects SET 
      status = 'AVAILABLE_FOR_DEVELOPER',
      developer_payout = ?,
      admin_approval_notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(parseFloat(developer_payout), admin_approval_notes || null, project.id);

  recordProjectStatusChange(db, {
    projectId: project.id, oldStatus: project.status,
    newStatus: 'AVAILABLE_FOR_DEVELOPER', changedBy: req.user.id,
    notes: admin_approval_notes || 'Admin approved',
  });

  // Notify salesperson
  createNotification(db, {
    userId: project.salesperson_id, title: 'Project Approved!',
    message: `Your project ${project.project_id} (${project.client_name}) has been approved by admin.`,
    type: 'SUCCESS', entityType: 'project', entityId: project.id,
    link: `/sales/projects/${project.id}`,
  });

  // Notify all developers
  const developers = db.prepare("SELECT id FROM users WHERE role = 'developer' AND is_active = 1").all();
  for (const dev of developers) {
    createNotification(db, {
      userId: dev.id, title: 'New Project Available',
      message: `A new project (${project.project_id} - ${project.client_name}) is available for developers.`,
      type: 'ACTION_REQUIRED', entityType: 'project', entityId: project.id,
      link: '/developer/projects',
    });
  }

  createAuditLog(db, {
    userId: req.user.id, action: 'APPROVE_PROJECT', entityType: 'project', entityId: project.id,
    description: `Admin approved project ${project.project_id}. Dev payout: ₹${developer_payout}`,
  });

  res.json({ message: 'Project approved and made available for developers' });
});

// POST /api/projects/:id/reject — Admin rejects pending project
router.post('/:id/reject', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (project.status !== 'PENDING_ADMIN_APPROVAL') {
    return res.status(400).json({ error: 'Project is not pending admin approval' });
  }

  const { rejection_reason } = req.body;
  if (!rejection_reason || !rejection_reason.trim()) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  db.prepare(`UPDATE projects SET status = 'REJECTED_BY_ADMIN', rejection_reason = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(rejection_reason.trim(), project.id);

  recordProjectStatusChange(db, {
    projectId: project.id, oldStatus: project.status,
    newStatus: 'REJECTED_BY_ADMIN', changedBy: req.user.id, notes: rejection_reason,
  });

  createNotification(db, {
    userId: project.salesperson_id, title: 'Project Returned by Admin',
    message: `Project ${project.project_id} has been returned. Reason: ${rejection_reason}`,
    type: 'WARNING', entityType: 'project', entityId: project.id,
    link: `/sales/projects/${project.id}`,
  });

  res.json({ message: 'Project rejected and returned to sales' });
});

// POST /api/projects/:id/accept — Developer accepts available project
router.post('/:id/accept', authenticate, requireRole('developer'), (req, res) => {
  const db = getDb();
  
  // ATOMIC: use a transaction to enforce one-project-per-developer rule
  const acceptProject = db.transaction(() => {
    // Re-check project status inside transaction
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND is_deleted = 0').get(req.params.id);
    if (!project) throw new Error('Project not found');
    if (project.status !== 'AVAILABLE_FOR_DEVELOPER') {
      throw new Error('Project is no longer available');
    }

    // Check developer has no active project
    const active = db.prepare(`
      SELECT id FROM projects 
      WHERE developer_id = ? AND is_deleted = 0
      AND status IN ('ASSIGNED','IN_DEVELOPMENT','TESTING','SUBMITTED','PENDING_FINAL_APPROVAL','REVISION_REQUIRED')
    `).get(req.user.id);
    
    if (active) throw new Error('You already have an active project. Complete it before accepting another.');

    // Assign
    db.prepare(`
      UPDATE projects SET 
        developer_id = ?, 
        status = 'ASSIGNED',
        updated_at = datetime('now')
      WHERE id = ? AND status = 'AVAILABLE_FOR_DEVELOPER'
    `).run(req.user.id, project.id);

    // Verify update succeeded (another developer may have snatched it)
    const updated = db.prepare('SELECT status, developer_id FROM projects WHERE id = ?').get(project.id);
    if (updated.developer_id !== req.user.id || updated.status !== 'ASSIGNED') {
      throw new Error('Project was just accepted by another developer. Please try a different project.');
    }

    recordProjectStatusChange(db, {
      projectId: project.id, oldStatus: 'AVAILABLE_FOR_DEVELOPER',
      newStatus: 'ASSIGNED', changedBy: req.user.id,
      notes: `Developer ${req.user.name} accepted the project`,
    });

    // Notify admin and salesperson
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
    for (const admin of admins) {
      createNotification(db, {
        userId: admin.id, title: 'Developer Accepted Project',
        message: `${req.user.name} has accepted project ${project.project_id} (${project.client_name}).`,
        type: 'INFO', entityType: 'project', entityId: project.id,
        link: `/admin/projects/${project.id}`,
      });
    }

    createAuditLog(db, {
      userId: req.user.id, action: 'ACCEPT_PROJECT', entityType: 'project', entityId: project.id,
      description: `Developer ${req.user.name} accepted project ${project.project_id}`,
    });

    return project;
  });

  try {
    const project = acceptProject();
    res.json({ message: 'Project accepted successfully', projectId: project.project_id });
  } catch (err) {
    if (err.message.includes('not found')) return res.status(404).json({ error: err.message });
    return res.status(400).json({ error: err.message });
  }
});

// PUT /api/projects/:id/status — Developer updates development status
router.put('/:id/status', authenticate, requireRole('developer', 'admin'), (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (req.user.role === 'developer' && project.developer_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied — not your project' });
  }

  const { status, notes } = req.body;
  const devStatuses = ['IN_DEVELOPMENT', 'TESTING'];
  if (!status || !devStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${devStatuses.join(', ')}` });
  }

  db.prepare(`UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, project.id);

  recordProjectStatusChange(db, {
    projectId: project.id, oldStatus: project.status, newStatus: status,
    changedBy: req.user.id, notes: notes || null,
  });

  res.json({ message: 'Development status updated' });
});

// POST /api/projects/:id/submit — Developer submits completed website
router.post('/:id/submit', authenticate, requireRole('developer'), (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (project.developer_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const validForSubmit = ['ASSIGNED', 'IN_DEVELOPMENT', 'TESTING', 'REVISION_REQUIRED'];
  if (!validForSubmit.includes(project.status)) {
    return res.status(400).json({ error: 'Project cannot be submitted in current status' });
  }

  const { final_website_url, notes } = req.body;
  if (!final_website_url || !final_website_url.trim()) {
    return res.status(400).json({ error: 'final_website_url is required' });
  }

  db.prepare(`
    UPDATE projects SET 
      final_website_url = ?, 
      status = 'PENDING_FINAL_APPROVAL',
      updated_at = datetime('now')
    WHERE id = ?
  `).run(final_website_url.trim(), project.id);

  recordProjectStatusChange(db, {
    projectId: project.id, oldStatus: project.status,
    newStatus: 'PENDING_FINAL_APPROVAL', changedBy: req.user.id,
    notes: notes || `Developer submitted website: ${final_website_url}`,
  });

  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
  for (const admin of admins) {
    createNotification(db, {
      userId: admin.id, title: 'Website Submitted for Review',
      message: `${req.user.name} has submitted project ${project.project_id} (${project.client_name}) for final approval.`,
      type: 'ACTION_REQUIRED', entityType: 'project', entityId: project.id,
      link: `/admin/projects/${project.id}`,
    });
  }

  createAuditLog(db, {
    userId: req.user.id, action: 'SUBMIT_PROJECT', entityType: 'project', entityId: project.id,
    description: `Developer submitted project ${project.project_id}. URL: ${final_website_url}`,
  });

  res.json({ message: 'Project submitted for final admin approval' });
});

// POST /api/projects/:id/final-approve — Admin gives final approval
router.post('/:id/final-approve', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  
  const finalApprove = db.transaction(() => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND is_deleted = 0').get(req.params.id);
    if (!project) throw new Error('Project not found');
    if (project.status !== 'PENDING_FINAL_APPROVAL') throw new Error('Project is not pending final approval');
    if (!project.developer_id) throw new Error('Project has no developer assigned');

    const { admin_notes, sales_commission } = req.body;

    // Mark project completed
    db.prepare(`
      UPDATE projects SET 
        status = 'COMPLETED',
        approved_by = ?,
        approved_at = datetime('now'),
        completed_at = datetime('now'),
        admin_approval_notes = ?,
        sales_commission = COALESCE(?, sales_commission),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(req.user.id, admin_notes || null, sales_commission ? parseFloat(sales_commission) : null, project.id);

    recordProjectStatusChange(db, {
      projectId: project.id, oldStatus: 'PENDING_FINAL_APPROVAL',
      newStatus: 'COMPLETED', changedBy: req.user.id,
      notes: admin_notes || 'Admin approved final delivery',
    });

    // Credit developer wallet
    const devTxnId = creditWallet(db, {
      userId: project.developer_id,
      projectId: project.id,
      amount: project.developer_payout,
      type: 'DEVELOPER_EARNING',
      description: `Project completion payout - ${project.project_id} (${project.client_name})`,
      createdBy: req.user.id,
    });

    // Credit sales commission if set
    if (sales_commission && parseFloat(sales_commission) > 0) {
      creditWallet(db, {
        userId: project.salesperson_id,
        projectId: project.id,
        amount: parseFloat(sales_commission),
        type: 'SALES_COMMISSION',
        description: `Sales commission - ${project.project_id} (${project.client_name})`,
        createdBy: req.user.id,
      });

      createNotification(db, {
        userId: project.salesperson_id, title: 'Commission Credited!',
        message: `₹${sales_commission} commission credited to your wallet for project ${project.project_id}.`,
        type: 'SUCCESS', entityType: 'project', entityId: project.id,
        link: '/sales/wallet',
      });
    }

    // Notify developer
    createNotification(db, {
      userId: project.developer_id, title: '🎉 Project Approved & Payment Credited!',
      message: `Project ${project.project_id} approved! ₹${project.developer_payout} has been credited to your wallet.`,
      type: 'SUCCESS', entityType: 'project', entityId: project.id,
      link: '/developer/wallet',
    });

    createAuditLog(db, {
      userId: req.user.id, action: 'FINAL_APPROVE_PROJECT', entityType: 'project', entityId: project.id,
      description: `Admin final approval for ${project.project_id}. Dev paid ₹${project.developer_payout}.`,
    });

    return project;
  });

  try {
    const project = finalApprove();
    res.json({ message: `Project completed. Developer wallet credited ₹${project.developer_payout}.` });
  } catch (err) {
    if (err.message === 'Project not found') return res.status(404).json({ error: err.message });
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/projects/:id/final-reject — Admin requests revisions
router.post('/:id/final-reject', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.status !== 'PENDING_FINAL_APPROVAL') return res.status(400).json({ error: 'Project is not pending final approval' });

  const { rejection_reason } = req.body;
  if (!rejection_reason || !rejection_reason.trim()) return res.status(400).json({ error: 'Rejection reason is required' });

  const newRevisionNumber = project.revision_count + 1;

  db.prepare(`
    UPDATE projects SET 
      status = 'REVISION_REQUIRED',
      final_rejection_reason = ?,
      revision_count = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(rejection_reason.trim(), newRevisionNumber, project.id);

  db.prepare(`
    INSERT INTO project_revisions (project_id, revision_number, rejection_reason, rejected_by)
    VALUES (?, ?, ?, ?)
  `).run(project.id, newRevisionNumber, rejection_reason.trim(), req.user.id);

  recordProjectStatusChange(db, {
    projectId: project.id, oldStatus: 'PENDING_FINAL_APPROVAL',
    newStatus: 'REVISION_REQUIRED', changedBy: req.user.id, notes: rejection_reason,
  });

  createNotification(db, {
    userId: project.developer_id, title: 'Revision Requested',
    message: `Admin has requested changes on ${project.project_id}: ${rejection_reason}`,
    type: 'WARNING', entityType: 'project', entityId: project.id,
    link: '/developer/my-project',
  });

  res.json({ message: 'Revision requested. Developer notified.' });
});

// POST /api/projects/:id/message — Add a project message
router.post('/:id/message', authenticate, (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const user = req.user;
  // Only involved parties can message
  if (user.role === 'sales' && project.salesperson_id !== user.id) return res.status(403).json({ error: 'Access denied' });
  if (user.role === 'developer' && project.developer_id !== user.id) return res.status(403).json({ error: 'Access denied' });

  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message cannot be empty' });

  const result = db.prepare('INSERT INTO project_messages (project_id, sender_id, message) VALUES (?, ?, ?)')
    .run(project.id, user.id, message.trim());

  const newMsg = db.prepare(`
    SELECT pm.*, u.name as sender_name, u.role as sender_role 
    FROM project_messages pm JOIN users u ON pm.sender_id = u.id 
    WHERE pm.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ message: newMsg });
});

// PUT /api/projects/:id — Admin updates project details
router.put('/:id', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const allowed = ['client_name','org_name','phone','email','google_business_url','instagram_url',
    'requirements','specifications','website_expectations','full_project_amount','advance_amount',
    'developer_payout','sales_commission','payment_status','admin_approval_notes'];
  
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE projects SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
    .run(...Object.values(updates), project.id);

  res.json({ message: 'Project updated' });
});

module.exports = router;
