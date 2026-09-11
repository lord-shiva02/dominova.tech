const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications — Current user's notifications
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { unread_only, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = 'SELECT * FROM notifications WHERE user_id = ?';
  const params = [req.user.id];
  if (unread_only === 'true') { query += ' AND is_read = 0'; }
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const notifications = db.prepare(query).all(...params);
  const unreadCount = db.prepare('SELECT COUNT(*) as n FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id).n;

  res.json({ notifications, unreadCount });
});

// PUT /api/notifications/:id/read — Mark notification as read
router.put('/:id/read', authenticate, (req, res) => {
  const db = getDb();
  const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Notification marked as read' });
});

// PUT /api/notifications/mark-all-read — Mark all as read
router.put('/mark-all-read', authenticate, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'All notifications marked as read' });
});

// GET /api/notifications/count — Unread count
router.get('/count', authenticate, (req, res) => {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as n FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id).n;
  res.json({ unreadCount: count });
});

module.exports = router;
