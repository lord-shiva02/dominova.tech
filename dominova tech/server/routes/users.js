const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { createAuditLog, createNotification } = require('../middleware/helpers');

const router = express.Router();

// GET /api/users — Admin only, list all users
router.get('/', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const { role, is_active, search } = req.query;
  let query = `SELECT id, name, email, role, phone, is_active, created_at FROM users WHERE 1=1`;
  const params = [];
  if (role) { query += ' AND role = ?'; params.push(role); }
  if (is_active !== undefined) { query += ' AND is_active = ?'; params.push(is_active === 'true' ? 1 : 0); }
  if (search) { query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  query += ' ORDER BY role, name';
  const users = db.prepare(query).all(...params);
  res.json({ users });
});

// POST /api/users — Admin creates new user
router.post('/', authenticate, requireRole('admin'), (req, res) => {
  const { name, email, password, role, phone } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }
  const validRoles = ['admin', 'sales', 'manager', 'developer'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, email.toLowerCase().trim(), hash, role, phone || null);

  // Create wallet
  db.prepare('INSERT INTO wallets (user_id) VALUES (?)').run(result.lastInsertRowid);

  createAuditLog(db, {
    userId: req.user.id,
    action: 'CREATE_USER',
    entityType: 'user',
    entityId: result.lastInsertRowid,
    description: `Admin created user ${name} with role ${role}`,
  });

  const newUser = db.prepare('SELECT id, name, email, role, phone, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ user: newUser, message: 'User created successfully' });
});

// GET /api/users/:id — Get user details
router.get('/:id', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, phone, is_active, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// PUT /api/users/:id — Update user
router.put('/:id', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, email, role, phone, is_active, password } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (email) updates.email = email.toLowerCase().trim();
  if (role) updates.role = role;
  if (phone !== undefined) updates.phone = phone;
  if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;
  if (password) updates.password_hash = bcrypt.hashSync(password, 10);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), req.params.id];
  db.prepare(`UPDATE users SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(...values);

  createAuditLog(db, {
    userId: req.user.id,
    action: 'UPDATE_USER',
    entityType: 'user',
    entityId: req.params.id,
    description: `Admin updated user ${user.name}: ${JSON.stringify(Object.keys(updates))}`,
  });

  const updated = db.prepare('SELECT id, name, email, role, phone, is_active, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json({ user: updated, message: 'User updated' });
});

// GET /api/users/role/sales — Get all salespeople
router.get('/by-role/sales', authenticate, requireRole('admin', 'manager'), (req, res) => {
  const db = getDb();
  const users = db.prepare("SELECT id, name, email, phone FROM users WHERE role = 'sales' AND is_active = 1 ORDER BY name").all();
  res.json({ users });
});

// GET /api/users/role/developers — Get all developers with availability
router.get('/by-role/developers', authenticate, (req, res) => {
  const db = getDb();
  const developers = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.is_active,
      CASE WHEN p.id IS NOT NULL THEN 0 ELSE 1 END as is_available,
      p.project_id as active_project_id,
      p.client_name as active_project_client,
      p.status as active_project_status
    FROM users u
    LEFT JOIN projects p ON p.developer_id = u.id 
      AND p.status IN ('ASSIGNED','IN_DEVELOPMENT','TESTING','SUBMITTED','PENDING_FINAL_APPROVAL','REVISION_REQUIRED')
      AND p.is_deleted = 0
    WHERE u.role = 'developer' AND u.is_active = 1
    ORDER BY u.name
  `).all();
  res.json({ developers });
});

module.exports = router;
