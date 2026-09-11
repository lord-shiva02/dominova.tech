const { getDb } = require('../db/database');

function createNotification(db, { userId, title, message, type = 'INFO', entityType = null, entityId = null, link = null }) {
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id, link)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, title, message, type, entityType, entityId, link);
}

function createAuditLog(db, { userId, action, entityType, entityId, description, oldValue = null, newValue = null }) {
  db.prepare(`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, old_value, new_value)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId, action, entityType, entityId, description,
    oldValue ? JSON.stringify(oldValue) : null,
    newValue ? JSON.stringify(newValue) : null
  );
}

function createLeadActivity(db, { leadId, userId, activityType, description, metadata = null }) {
  db.prepare(`
    INSERT INTO lead_activities (lead_id, user_id, activity_type, description, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).run(leadId, userId, activityType, description, metadata ? JSON.stringify(metadata) : null);
}

function recordProjectStatusChange(db, { projectId, oldStatus, newStatus, changedBy, notes = null }) {
  db.prepare(`
    INSERT INTO project_status_history (project_id, old_status, new_status, changed_by, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(projectId, oldStatus, newStatus, changedBy, notes);
}

function generateTransactionId(db) {
  const row = db.prepare('SELECT COUNT(*) as n FROM wallet_transactions').get();
  return `TXN-${String((row.n || 0) + 1).padStart(6, '0')}`;
}

function generateWithdrawalId(db) {
  const row = db.prepare('SELECT COUNT(*) as n FROM withdrawals').get();
  return `WD-${String((row.n || 0) + 1).padStart(4, '0')}`;
}

function creditWallet(db, { userId, projectId, amount, type, description, createdBy }) {
  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
  if (!wallet) throw new Error('Wallet not found');
  
  const txnId = generateTransactionId(db);
  db.prepare(`
    INSERT INTO wallet_transactions 
    (transaction_id, wallet_id, user_id, project_id, type, amount, direction, description, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 'CREDIT', ?, 'COMPLETED', ?)
  `).run(txnId, wallet.id, userId, projectId, type, amount, description, createdBy);

  db.prepare(`
    UPDATE wallets SET 
      total_earned = total_earned + ?,
      available_balance = available_balance + ?,
      updated_at = datetime('now')
    WHERE user_id = ?
  `).run(amount, amount, userId);

  return txnId;
}

module.exports = {
  createNotification,
  createAuditLog,
  createLeadActivity,
  recordProjectStatusChange,
  generateTransactionId,
  generateWithdrawalId,
  creditWallet,
};
