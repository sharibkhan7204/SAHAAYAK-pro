const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');
const { logAdminAction } = require('../services/auditService');

let ioInstance = null;
function setSocketIo(io) {
  ioInstance = io;
}

router.use(authenticate);

// Get Messages for a Booking
router.get('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await db.get(
      `SELECT b.*, c.user_id as cust_user_id, w.user_id as wrk_user_id
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       LEFT JOIN workers w ON b.worker_id = w.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const isCustomer = req.user.id === booking.cust_user_id;
    const isWorker = req.user.id === booking.wrk_user_id;
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isWorker && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to view these messages.' });
    }

    // If Admin accesses messages, log it as required by Requirement 23!
    if (isAdmin) {
      await logAdminAction({
        adminUserId: req.user.id,
        action: 'ADMIN_ACCESS_CHAT_LOGS',
        entity: 'bookings',
        entityId: bookingId,
        reason: req.query.reason || 'Dispute investigation / Quality assurance audit'
      });
    }

    const messages = await db.query(
      `SELECT m.*, u.email as sender_email, u.role as sender_role
       FROM messages m
       JOIN users u ON m.sender_user_id = u.id
       WHERE m.booking_id = ?
       ORDER BY m.created_at ASC`,
      [bookingId]
    );

    // Mark unread messages as read
    await db.run(
      `UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP
       WHERE booking_id = ? AND receiver_user_id = ? AND is_read = 0`,
      [bookingId, req.user.id]
    );

    res.json({ messages });
  } catch (err) {
    console.error('[Messages GET] Error:', err);
    res.status(500).json({ error: 'Failed to retrieve messages.' });
  }
});

// Send Message
router.post('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { messageText, attachmentUrl } = req.body;

    if (!messageText && !attachmentUrl) {
      return res.status(400).json({ error: 'Message content or attachment is required.' });
    }

    const booking = await db.get(
      `SELECT b.*, c.user_id as cust_user_id, w.user_id as wrk_user_id
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       LEFT JOIN workers w ON b.worker_id = w.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    // Chat becomes available after worker accepts booking
    const allowedStatuses = [
      'worker_accepted', 'worker_on_the_way', 'worker_arrived',
      'service_started', 'service_completed', 'customer_confirmation',
      'payment_completed', 'booking_closed', 'disputed'
    ];

    if (!allowedStatuses.includes(booking.status)) {
      return res.status(400).json({
        error: 'Chat becomes available once a worker has accepted the booking.'
      });
    }

    let receiverUserId = null;
    if (req.user.id === booking.cust_user_id) {
      receiverUserId = booking.wrk_user_id;
    } else if (req.user.id === booking.wrk_user_id) {
      receiverUserId = booking.cust_user_id;
    } else {
      return res.status(403).json({ error: 'Only participants in this booking can exchange messages.' });
    }

    if (!receiverUserId) {
      return res.status(400).json({ error: 'No active recipient available for this booking.' });
    }

    const messageId = 'msg_' + uuidv4().replace(/-/g, '').substring(0, 10);

    await db.run(
      `INSERT INTO messages (id, booking_id, sender_user_id, receiver_user_id, message_text, attachment_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [messageId, bookingId, req.user.id, receiverUserId, messageText || '', attachmentUrl || null]
    );

    const newMessage = await db.get(
      `SELECT m.*, u.email as sender_email, u.role as sender_role
       FROM messages m
       JOIN users u ON m.sender_user_id = u.id
       WHERE m.id = ?`,
      [messageId]
    );

    // Real-time broadcast
    if (ioInstance) {
      ioInstance.to(`booking_${bookingId}`).emit('chat:message', newMessage);
      ioInstance.to(`user_${receiverUserId}`).emit('chat:incoming', {
        bookingId,
        message: newMessage
      });
    }

    res.status(201).json({ message: newMessage });
  } catch (err) {
    console.error('[Message POST] Error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

module.exports = {
  router,
  setSocketIo
};
