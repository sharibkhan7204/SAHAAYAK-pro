const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

async function logAdminAction({ adminUserId, action, entity, entityId, previousValue = null, newValue = null, reason = null, ipAddress = '127.0.0.1' }) {
  try {
    const id = 'aud_' + uuidv4().replace(/-/g, '').substring(0, 12);
    
    // Sanitize any sensitive fields if present in objects
    const cleanObject = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      const copy = { ...obj };
      delete copy.password;
      delete copy.password_hash;
      delete copy.two_factor_secret;
      delete copy.bank_account_no;
      return copy;
    };

    const prevJson = previousValue ? JSON.stringify(cleanObject(previousValue)) : null;
    const newJson = newValue ? JSON.stringify(cleanObject(newValue)) : null;

    await db.run(
      `INSERT INTO audit_logs (id, admin_user_id, action, entity, entity_id, previous_value_json, new_value_json, reason, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, adminUserId, action, entity, entityId, prevJson, newJson, reason, ipAddress]
    );

    return id;
  } catch (err) {
    console.error('[AuditService] Failed to record audit log:', err.message);
    return null;
  }
}

module.exports = {
  logAdminAction
};
