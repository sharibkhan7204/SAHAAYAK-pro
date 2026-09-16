const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

let ioInstance = null;

function setSocketIo(io) {
  ioInstance = io;
}

async function createNotification({ userId, title, message, type = 'info', category = 'system', relatedBookingId = null }) {
  try {
    const id = 'ntf_' + uuidv4().replace(/-/g, '').substring(0, 12);
    await db.run(
      `INSERT INTO notifications (id, user_id, title, message, type, category, related_booking_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, title, message, type, category, relatedBookingId]
    );

    const notification = await db.get('SELECT * FROM notifications WHERE id = ?', [id]);

    if (ioInstance) {
      ioInstance.to(`user_${userId}`).emit('notification:new', notification);
    }

    return notification;
  } catch (err) {
    console.error('[NotificationService] Error creating notification:', err.message);
    return null;
  }
}

async function broadcastNotification({ role = null, title, message, type = 'info', category = 'announcement' }) {
  try {
    let sql = 'SELECT id FROM users WHERE is_active = 1';
    let params = [];
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    const users = await db.query(sql, params);
    for (const u of users) {
      await createNotification({
        userId: u.id,
        title,
        message,
        type,
        category
      });
    }
  } catch (err) {
    console.error('[NotificationService] Error in broadcastNotification:', err.message);
  }
}

module.exports = {
  setSocketIo,
  createNotification,
  broadcastNotification
};
