const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

router.use(authenticate);

// Submit Review (Customer to Worker, or Worker to Customer)
router.post('/', async (req, res) => {
  try {
    const {
      bookingId, overallRating, qualityRating, punctualityRating,
      behaviourRating, comment
    } = req.body;

    if (!bookingId || !overallRating) {
      return res.status(400).json({ error: 'Booking ID and overall rating (1-5) are required.' });
    }

    const ratingVal = Math.min(5, Math.max(1, Math.round(Number(overallRating))));

    const booking = await db.get(
      `SELECT b.*, c.user_id as cust_user_id, w.user_id as wrk_user_id, w.id as worker_id
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       LEFT JOIN workers w ON b.worker_id = w.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    // Determine review type and target
    let reviewType = '';
    let targetUserId = '';
    if (req.user.id === booking.cust_user_id) {
      reviewType = 'customer_to_worker';
      targetUserId = booking.wrk_user_id;
    } else if (req.user.id === booking.wrk_user_id) {
      reviewType = 'worker_to_customer';
      targetUserId = booking.cust_user_id;
    } else {
      return res.status(403).json({ error: 'Only participants in this booking can submit a review.' });
    }

    // Check if already reviewed
    const existing = await db.get(
      'SELECT id FROM reviews WHERE booking_id = ? AND reviewer_user_id = ?',
      [bookingId, req.user.id]
    );
    if (existing) {
      return res.status(400).json({ error: 'You have already submitted a review for this booking. Reviews cannot be edited.' });
    }

    const reviewId = 'rev_' + uuidv4().replace(/-/g, '').substring(0, 10);
    const ratingId = 'rat_' + uuidv4().replace(/-/g, '').substring(0, 10);

    await db.transaction(async ({ run }) => {
      // 1. Insert into reviews
      await run(
        `INSERT INTO reviews (id, booking_id, reviewer_user_id, reviewee_user_id, review_type, rating, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [reviewId, bookingId, req.user.id, targetUserId, reviewType, ratingVal, comment || '']
      );

      // 2. Insert into ratings breakdown
      await run(
        `INSERT INTO ratings (
          id, booking_id, rated_by_user_id, target_user_id, rating_type,
          overall_rating, quality_rating, punctuality_rating, behaviour_rating
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ratingId, bookingId, req.user.id, targetUserId, reviewType,
          ratingVal, qualityRating || ratingVal, punctualityRating || ratingVal, behaviourRating || ratingVal
        ]
      );

      // 3. If customer rated worker, update worker's public average rating & review count
      if (reviewType === 'customer_to_worker' && booking.worker_id) {
        const stats = await db.get(
          `SELECT count(*) as total, AVG(rating) as avg_score
           FROM reviews WHERE reviewee_user_id = ? AND review_type = 'customer_to_worker' AND is_moderated = 0`,
          [targetUserId]
        );
        const newAvg = stats ? Math.round(stats.avg_score * 10) / 10 : ratingVal;
        const newCount = stats ? stats.total : 1;

        await run(
          `UPDATE workers SET avg_rating = ?, total_reviews = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [newAvg, newCount, booking.worker_id]
        );
      }
    });

    // Notify recipient
    await createNotification({
      userId: targetUserId,
      title: 'New Rating & Review Received',
      message: `You received a ${ratingVal}★ rating for booking ${booking.booking_number}.`,
      type: 'info',
      category: 'booking',
      relatedBookingId: bookingId
    });

    res.status(201).json({ message: 'Thank you! Your review has been recorded.', reviewId });
  } catch (err) {
    console.error('[Review POST] Error:', err);
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

// Get Reviews for a specific worker
router.get('/worker/:workerId', async (req, res) => {
  try {
    const reviews = await db.query(
      `SELECT r.*, u.avatar_url, c.full_name as reviewer_name
       FROM reviews r
       JOIN users u ON r.reviewer_user_id = u.id
       LEFT JOIN customers c ON c.user_id = u.id
       JOIN workers w ON r.reviewee_user_id = w.user_id
       WHERE w.id = ? AND r.is_moderated = 0
       ORDER BY r.created_at DESC`,
      [req.params.workerId]
    );

    res.json({ reviews });
  } catch (err) {
    console.error('[Worker Reviews GET] Error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

module.exports = router;
