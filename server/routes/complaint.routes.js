const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

router.use(authenticate);

// File a Complaint / Dispute
router.post('/', async (req, res) => {
  try {
    const { bookingId, category, description, evidencePhotos, priority } = req.body;

    if (!bookingId || !category || !description) {
      return res.status(400).json({ error: 'Booking ID, category, and description are required.' });
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

    // Determine target user
    const againstUserId = req.user.id === booking.cust_user_id ? booking.wrk_user_id : booking.cust_user_id;

    const complaintId = 'cmp_' + uuidv4().replace(/-/g, '').substring(0, 10);
    const complaintNumber = 'CMP-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);

    await db.transaction(async ({ run }) => {
      await run(
        `INSERT INTO complaints (
          id, complaint_number, booking_id, filed_by_user_id, against_user_id,
          category, description, evidence_photos_json, status, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          complaintId, complaintNumber, bookingId, req.user.id, againstUserId,
          category, description, JSON.stringify(evidencePhotos || []), priority || 'medium'
        ]
      );

      // Create linked dispute record
      await run(
        `INSERT INTO disputes (id, complaint_id, booking_id, customer_statement, status)
         VALUES (?, ?, ?, ?, 'under_review')`,
        ['dsp_' + uuidv4().replace(/-/g, '').substring(0, 10), complaintId, bookingId, description]
      );

      // Update booking status to disputed if not completed
      await run('UPDATE bookings SET status = "disputed", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [bookingId]);
    });

    // Notify Admins
    const admins = await db.query('SELECT user_id FROM admins');
    for (const a of admins) {
      await createNotification({
        userId: a.user_id,
        title: `Dispute Filed: ${complaintNumber}`,
        message: `${category} reported on booking ${booking.booking_number}. Priority: ${priority || 'medium'}.`,
        type: 'alert',
        category: 'complaint',
        relatedBookingId: bookingId
      });
    }

    res.status(201).json({
      message: 'Complaint filed successfully. Sahaayak Trust & Safety team is investigating.',
      complaintId,
      complaintNumber
    });
  } catch (err) {
    console.error('[Complaint POST] Error:', err);
    res.status(500).json({ error: 'Failed to file complaint.' });
  }
});

// Get user's filed complaints
router.get('/my', async (req, res) => {
  try {
    const complaints = await db.query(
      `SELECT c.*, b.booking_number, s.name as service_name
       FROM complaints c
       JOIN bookings b ON c.booking_id = b.id
       JOIN services s ON b.service_id = s.id
       WHERE c.filed_by_user_id = ?
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json({ complaints });
  } catch (err) {
    console.error('[Complaints My GET] Error:', err);
    res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

module.exports = router;
