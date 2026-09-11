const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { createNotification, createAuditLog, generateWithdrawalId } = require('../middleware/helpers');

const router = express.Router();

// GET /api/wallets/me — Current user's wallet
router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

  const transactions = db.prepare(`
    SELECT wt.*, p.project_id, p.client_name as project_client
    FROM wallet_transactions wt
    LEFT JOIN projects p ON wt.project_id = p.id
    WHERE wt.user_id = ?
    ORDER BY wt.created_at DESC
    LIMIT 100
  `).all(req.user.id);

  res.json({ wallet, transactions });
});

// GET /api/wallets/:userId — Admin views any user's wallet
router.get('/:userId', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const wallet = db.prepare(`
    SELECT w.*, u.name as user_name, u.email as user_email, u.role as user_role
    FROM wallets w JOIN users u ON w.user_id = u.id
    WHERE w.user_id = ?
  `).get(req.params.userId);
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

  const transactions = db.prepare(`
    SELECT wt.*, p.project_id, p.client_name as project_client
    FROM wallet_transactions wt
    LEFT JOIN projects p ON wt.project_id = p.id
    WHERE wt.user_id = ?
    ORDER BY wt.created_at DESC
    LIMIT 200
  `).all(req.params.userId);

  res.json({ wallet, transactions });
});

// GET /api/wallets — Admin sees all wallets summary
router.get('/', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const wallets = db.prepare(`
    SELECT w.*, u.name as user_name, u.email as user_email, u.role as user_role
    FROM wallets w JOIN users u ON w.user_id = u.id
    WHERE u.is_active = 1 AND u.role != 'admin'
    ORDER BY u.role, u.name
  `).all();
  res.json({ wallets });
});

// POST /api/wallets/credit — Admin manually credits a wallet
router.post('/credit', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const { user_id, amount, description, project_id, type } = req.body;
  if (!user_id || !amount || !description) {
    return res.status(400).json({ error: 'user_id, amount, and description are required' });
  }

  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(user_id);
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

  const { creditWallet } = require('../middleware/helpers');
  const txnId = creditWallet(db, {
    userId: user_id, projectId: project_id || null,
    amount: parseFloat(amount),
    type: type || 'ADJUSTMENT_CREDIT',
    description, createdBy: req.user.id,
  });

  createAuditLog(db, {
    userId: req.user.id, action: 'MANUAL_CREDIT', entityType: 'wallet', entityId: wallet.id,
    description: `Admin credited ₹${amount} to user ${user_id}: ${description}`,
  });

  createNotification(db, {
    userId: user_id, title: 'Wallet Credited',
    message: `₹${amount} has been credited to your wallet. ${description}`,
    type: 'SUCCESS', entityType: 'wallet', entityId: wallet.id,
    link: '/wallet',
  });

  res.json({ message: 'Wallet credited', transactionId: txnId });
});

// POST /api/wallets/withdraw — Employee requests withdrawal
router.post('/withdraw', authenticate, (req, res) => {
  const db = getDb();
  if (req.user.role === 'admin') return res.status(400).json({ error: 'Admin cannot request withdrawals' });

  const { amount, notes } = req.body;
  if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Valid amount required' });

  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

  const requestAmount = parseFloat(amount);
  if (requestAmount > wallet.available_balance) {
    return res.status(400).json({ error: `Insufficient balance. Available: ₹${wallet.available_balance}` });
  }

  // Check no pending withdrawal already
  const pendingWithdrawal = db.prepare("SELECT id FROM withdrawals WHERE user_id = ? AND status = 'PENDING'").get(req.user.id);
  if (pendingWithdrawal) {
    return res.status(400).json({ error: 'You already have a pending withdrawal request' });
  }

  const withdrawalId = generateWithdrawalId(db);
  const result = db.prepare(`
    INSERT INTO withdrawals (withdrawal_id, user_id, wallet_id, amount, request_notes, status)
    VALUES (?, ?, ?, ?, ?, 'PENDING')
  `).run(withdrawalId, req.user.id, wallet.id, requestAmount, notes || null);

  // Reserve the amount
  db.prepare("UPDATE wallets SET available_balance = available_balance - ?, pending_withdrawal = pending_withdrawal + ?, updated_at = datetime('now') WHERE user_id = ?")
    .run(requestAmount, requestAmount, req.user.id);

  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
  for (const admin of admins) {
    createNotification(db, {
      userId: admin.id, title: 'Withdrawal Request',
      message: `${req.user.name} has requested a withdrawal of ₹${requestAmount}.`,
      type: 'ACTION_REQUIRED', entityType: 'withdrawal', entityId: result.lastInsertRowid,
      link: `/admin/withdrawals`,
    });
  }

  res.status(201).json({ message: 'Withdrawal request submitted', withdrawalId });
});

// GET /api/wallets/withdrawals/my — Employee sees their withdrawals
router.get('/withdrawals/my', authenticate, (req, res) => {
  const db = getDb();
  const withdrawals = db.prepare(`
    SELECT w.*, u.name as reviewed_by_name
    FROM withdrawals w LEFT JOIN users u ON w.reviewed_by = u.id
    WHERE w.user_id = ? ORDER BY w.created_at DESC
  `).all(req.user.id);
  res.json({ withdrawals });
});

// GET /api/wallets/withdrawals/all — Admin sees all withdrawals
router.get('/withdrawals/all', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();
  const { status } = req.query;
  let query = `
    SELECT w.*, u1.name as user_name, u1.role as user_role, u2.name as reviewed_by_name
    FROM withdrawals w 
    JOIN users u1 ON w.user_id = u1.id
    LEFT JOIN users u2 ON w.reviewed_by = u2.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { query += ' AND w.status = ?'; params.push(status); }
  query += ' ORDER BY w.created_at DESC';
  const withdrawals = db.prepare(query).all(...params);
  res.json({ withdrawals });
});

// POST /api/wallets/withdrawals/:id/approve — Admin approves withdrawal
router.post('/withdrawals/:id/approve', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();

  const approveWithdrawal = db.transaction(() => {
    const withdrawal = db.prepare('SELECT * FROM withdrawals WHERE id = ? AND status = ?').get(req.params.id, 'PENDING');
    if (!withdrawal) throw new Error('Withdrawal not found or not pending');

    const { admin_notes } = req.body;
    const { generateTransactionId } = require('../middleware/helpers');

    const txnId = generateTransactionId(db);

    // Create debit transaction
    const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(withdrawal.wallet_id);
    db.prepare(`
      INSERT INTO wallet_transactions 
      (transaction_id, wallet_id, user_id, type, amount, direction, description, status, created_by)
      VALUES (?, ?, ?, 'WITHDRAWAL_DEBIT', ?, 'DEBIT', ?, 'COMPLETED', ?)
    `).run(txnId, withdrawal.wallet_id, withdrawal.user_id, withdrawal.amount,
      `Withdrawal approved - ${withdrawal.withdrawal_id}`, req.user.id);

    // Update wallet: reduce pending_withdrawal, increase total_withdrawn
    db.prepare(`
      UPDATE wallets SET 
        total_withdrawn = total_withdrawn + ?,
        pending_withdrawal = pending_withdrawal - ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(withdrawal.amount, withdrawal.amount, withdrawal.wallet_id);

    // Update withdrawal record
    db.prepare(`
      UPDATE withdrawals SET 
        status = 'APPROVED',
        admin_notes = ?,
        reviewed_by = ?,
        reviewed_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(admin_notes || null, req.user.id, withdrawal.id);

    createNotification(db, {
      userId: withdrawal.user_id, title: 'Withdrawal Approved!',
      message: `Your withdrawal of ₹${withdrawal.amount} has been approved.`,
      type: 'SUCCESS', entityType: 'withdrawal', entityId: withdrawal.id,
      link: '/wallet',
    });

    return withdrawal;
  });

  try {
    const withdrawal = approveWithdrawal();
    res.json({ message: `Withdrawal of ₹${withdrawal.amount} approved` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/wallets/withdrawals/:id/reject — Admin rejects withdrawal
router.post('/withdrawals/:id/reject', authenticate, requireRole('admin'), (req, res) => {
  const db = getDb();

  const rejectWithdrawal = db.transaction(() => {
    const withdrawal = db.prepare("SELECT * FROM withdrawals WHERE id = ? AND status = 'PENDING'").get(req.params.id);
    if (!withdrawal) throw new Error('Withdrawal not found or not pending');

    const { admin_notes } = req.body;
    if (!admin_notes) throw new Error('Admin notes/reason required for rejection');

    // Refund the reserved amount back to available balance
    db.prepare(`
      UPDATE wallets SET 
        available_balance = available_balance + ?,
        pending_withdrawal = pending_withdrawal - ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(withdrawal.amount, withdrawal.amount, withdrawal.wallet_id);

    db.prepare(`
      UPDATE withdrawals SET 
        status = 'REJECTED',
        admin_notes = ?,
        reviewed_by = ?,
        reviewed_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(admin_notes, req.user.id, withdrawal.id);

    createNotification(db, {
      userId: withdrawal.user_id, title: 'Withdrawal Rejected',
      message: `Your withdrawal of ₹${withdrawal.amount} was rejected. Reason: ${admin_notes}`,
      type: 'WARNING', entityType: 'withdrawal', entityId: withdrawal.id,
      link: '/wallet',
    });

    return withdrawal;
  });

  try {
    const withdrawal = rejectWithdrawal();
    res.json({ message: 'Withdrawal rejected, amount returned to balance' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
