const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/overview — Admin overview analytics
router.get('/overview', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();

  const leads = {
    total: db.prepare("SELECT COUNT(*) as n FROM leads WHERE is_deleted = 0").get().n,
    new: db.prepare("SELECT COUNT(*) as n FROM leads WHERE is_deleted = 0 AND status = 'NEW'").get().n,
    follow_up: db.prepare("SELECT COUNT(*) as n FROM leads WHERE is_deleted = 0 AND status = 'FOLLOW_UP'").get().n,
    manager_review: db.prepare("SELECT COUNT(*) as n FROM leads WHERE is_deleted = 0 AND status = 'MANAGER_REVIEW'").get().n,
    converted: db.prepare("SELECT COUNT(*) as n FROM leads WHERE is_deleted = 0 AND status = 'CONVERTED'").get().n,
    lost: db.prepare("SELECT COUNT(*) as n FROM leads WHERE is_deleted = 0 AND status = 'LOST'").get().n,
    followups_due_today: db.prepare("SELECT COUNT(*) as n FROM lead_followups WHERE status = 'PENDING' AND DATE(followup_date) = DATE('now')").get().n,
    followups_overdue: db.prepare("SELECT COUNT(*) as n FROM lead_followups WHERE status = 'PENDING' AND DATE(followup_date) < DATE('now')").get().n,
  };

  const projects = {
    pending_admin_approval: db.prepare("SELECT COUNT(*) as n FROM projects WHERE is_deleted = 0 AND status = 'PENDING_ADMIN_APPROVAL'").get().n,
    available_for_developer: db.prepare("SELECT COUNT(*) as n FROM projects WHERE is_deleted = 0 AND status = 'AVAILABLE_FOR_DEVELOPER'").get().n,
    in_development: db.prepare("SELECT COUNT(*) as n FROM projects WHERE is_deleted = 0 AND status IN ('ASSIGNED','IN_DEVELOPMENT','TESTING')").get().n,
    pending_final_approval: db.prepare("SELECT COUNT(*) as n FROM projects WHERE is_deleted = 0 AND status = 'PENDING_FINAL_APPROVAL'").get().n,
    revision_required: db.prepare("SELECT COUNT(*) as n FROM projects WHERE is_deleted = 0 AND status = 'REVISION_REQUIRED'").get().n,
    completed: db.prepare("SELECT COUNT(*) as n FROM projects WHERE is_deleted = 0 AND status = 'COMPLETED'").get().n,
    total: db.prepare("SELECT COUNT(*) as n FROM projects WHERE is_deleted = 0").get().n,
  };

  const finance = {
    total_project_value: db.prepare("SELECT COALESCE(SUM(full_project_amount), 0) as n FROM projects WHERE is_deleted = 0").get().n,
    total_advance: db.prepare("SELECT COALESCE(SUM(advance_amount), 0) as n FROM projects WHERE is_deleted = 0").get().n,
    total_developer_payouts: db.prepare("SELECT COALESCE(SUM(developer_payout), 0) as n FROM projects WHERE is_deleted = 0 AND status = 'COMPLETED'").get().n,
    total_sales_commissions: db.prepare("SELECT COALESCE(SUM(sales_commission), 0) as n FROM projects WHERE is_deleted = 0 AND status = 'COMPLETED' AND sales_commission IS NOT NULL").get().n,
    total_wallets_balance: db.prepare("SELECT COALESCE(SUM(available_balance), 0) as n FROM wallets").get().n,
    pending_withdrawals: db.prepare("SELECT COUNT(*) as n FROM withdrawals WHERE status = 'PENDING'").get().n,
    pending_withdrawal_amount: db.prepare("SELECT COALESCE(SUM(amount), 0) as n FROM withdrawals WHERE status = 'PENDING'").get().n,
  };

  const salesByPerson = db.prepare(`
    SELECT u.name, u.id,
      COUNT(CASE WHEN l.status != 'LOST' THEN 1 END) as active_leads,
      COUNT(CASE WHEN l.status = 'CONVERTED' THEN 1 END) as conversions,
      COUNT(CASE WHEN l.status = 'LOST' THEN 1 END) as lost,
      COUNT(CASE WHEN l.status = 'FOLLOW_UP' THEN 1 END) as follow_ups,
      COUNT(CASE WHEN l.status = 'MANAGER_REVIEW' THEN 1 END) as escalations,
      COALESCE(SUM(CASE WHEN l.status = 'CONVERTED' THEN l.full_project_amount END), 0) as revenue_generated
    FROM users u
    LEFT JOIN leads l ON l.assigned_to = u.id AND l.is_deleted = 0
    WHERE u.role = 'sales' AND u.is_active = 1
    GROUP BY u.id
    ORDER BY conversions DESC
  `).all();

  const developerStats = db.prepare(`
    SELECT u.name, u.id,
      CASE WHEN p_active.id IS NOT NULL THEN 0 ELSE 1 END as is_available,
      p_active.project_id as active_project,
      COUNT(p_done.id) as completed_projects,
      COALESCE(SUM(p_done.developer_payout), 0) as total_earned,
      w.available_balance
    FROM users u
    LEFT JOIN projects p_active ON p_active.developer_id = u.id AND p_active.status IN ('ASSIGNED','IN_DEVELOPMENT','TESTING','SUBMITTED','PENDING_FINAL_APPROVAL','REVISION_REQUIRED') AND p_active.is_deleted = 0
    LEFT JOIN projects p_done ON p_done.developer_id = u.id AND p_done.status = 'COMPLETED' AND p_done.is_deleted = 0
    LEFT JOIN wallets w ON w.user_id = u.id
    WHERE u.role = 'developer' AND u.is_active = 1
    GROUP BY u.id
    ORDER BY completed_projects DESC
  `).all();

  res.json({ leads, projects, finance, salesByPerson, developerStats });
});

// GET /api/reports/followups — Followups report
router.get('/followups', authenticate, requireRole('admin', 'sales', 'manager'), (req, res) => {
  const db = getDb();
  const user = req.user;
  const { from_date, to_date, status } = req.query;

  let query = `
    SELECT lf.*, l.lead_id, l.client_name, l.phone, l.org_name,
      u.name as created_by_name, u.id as sales_id
    FROM lead_followups lf
    JOIN leads l ON lf.lead_id = l.id
    JOIN users u ON lf.created_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (user.role === 'sales') { query += ' AND lf.created_by = ?'; params.push(user.id); }
  if (status) { query += ' AND lf.status = ?'; params.push(status); }
  if (from_date) { query += ' AND DATE(lf.followup_date) >= ?'; params.push(from_date); }
  if (to_date) { query += ' AND DATE(lf.followup_date) <= ?'; params.push(to_date); }

  query += ' ORDER BY lf.followup_date ASC';
  const followups = db.prepare(query).all(...params);
  res.json({ followups });
});

// GET /api/reports/audit — Audit log (Admin)
router.get('/audit', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const { entity_type, entity_id, user_id, page = 1, limit = 100 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT al.*, u.name as user_name, u.role as user_role
    FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1
  `;
  const params = [];
  if (entity_type) { query += ' AND al.entity_type = ?'; params.push(entity_type); }
  if (entity_id) { query += ' AND al.entity_id = ?'; params.push(entity_id); }
  if (user_id) { query += ' AND al.user_id = ?'; params.push(user_id); }
  query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const logs = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as n FROM audit_logs').get().n;
  res.json({ logs, total });
});

module.exports = router;
