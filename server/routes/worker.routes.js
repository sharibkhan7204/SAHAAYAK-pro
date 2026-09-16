const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

router.use(authenticate);
router.use(authorize('worker'));

// Worker Dashboard Overview
router.get('/dashboard', async (req, res) => {
  try {
    const workerId = req.user.profile.id;
    const todayStr = new Date().toISOString().split('T')[0];

    const worker = await db.get(
      `SELECT w.*, u.email, u.mobile, wl.latitude, wl.longitude, wl.last_updated_at
       FROM workers w
       JOIN users u ON w.user_id = u.id
       LEFT JOIN worker_locations wl ON w.id = wl.worker_id
       WHERE w.id = ?`,
      [workerId]
    );

    // Active Job (if currently on the way, arrived, or service started)
    const activeJob = await db.get(
      `SELECT b.*, s.name as service_name, s.image_url as service_image,
              c.full_name as customer_name, u.mobile as customer_mobile,
              a.house_no, a.street, a.area, a.city, a.latitude as cust_lat, a.longitude as cust_lng
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN customers c ON b.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       JOIN addresses a ON b.address_id = a.id
       WHERE b.worker_id = ?
         AND b.status IN ('worker_accepted', 'worker_on_the_way', 'worker_arrived', 'service_started')
       ORDER BY b.scheduled_date ASC
       LIMIT 1`,
      [workerId]
    );

    // Pending incoming job request (if assigned and waiting for worker acceptance)
    const pendingRequest = await db.get(
      `SELECT b.*, s.name as service_name, s.image_url as service_image,
              c.full_name as customer_name, u.mobile as customer_mobile,
              a.house_no, a.street, a.area as cust_area, a.city as cust_city, a.latitude as cust_lat, a.longitude as cust_lng
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN customers c ON b.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       JOIN addresses a ON b.address_id = a.id
       WHERE b.worker_id = ? AND b.status = 'worker_assigned'
       ORDER BY b.created_at DESC
       LIMIT 1`,
      [workerId]
    );

    // Today's completed jobs count and earnings
    const todayStats = await db.get(
      `SELECT count(*) as completed_count,
              COALESCE(SUM(b.total_labour_amount + b.total_parts_amount + b.tip_amount - b.commission_amount), 0) as today_earnings
       FROM bookings b
       WHERE b.worker_id = ? AND b.scheduled_date = ? AND b.payment_status = 'completed'`,
      [workerId, todayStr]
    );

    // Total lifetime earnings
    const totalStats = await db.get(
      `SELECT COALESCE(SUM(b.total_labour_amount + b.total_parts_amount + b.tip_amount - b.commission_amount), 0) as total_earnings,
              COALESCE(SUM(b.tip_amount), 0) as total_tips,
              COALESCE(SUM(b.commission_amount), 0) as total_platform_fee
       FROM bookings b
       WHERE b.worker_id = ? AND b.payment_status = 'completed'`,
      [workerId]
    );

    res.json({
      worker,
      activeJob,
      pendingRequest,
      todayJobs: todayStats ? todayStats.completed_count : 0,
      todayEarnings: todayStats ? Math.round(todayStats.today_earnings) : 0,
      totalEarnings: totalStats ? Math.round(totalStats.total_earnings) : 0,
      totalTips: totalStats ? Math.round(totalStats.total_tips) : 0,
      totalPlatformFee: totalStats ? Math.round(totalStats.total_platform_fee) : 0
    });
  } catch (err) {
    console.error('[Worker Dashboard GET] Error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

// Toggle Online/Offline status
router.post('/status', async (req, res) => {
  try {
    const { isOnline, latitude, longitude } = req.body;
    const workerId = req.user.profile.id;

    if (isOnline && (!latitude || !longitude)) {
      // If GPS is not provided, allow demo location fallback with informative response
      const fallbackLat = 12.9352;
      const fallbackLng = 77.6245;
      await db.run(
        `INSERT INTO worker_locations (id, worker_id, latitude, longitude, last_updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(worker_id) DO UPDATE SET latitude = excluded.latitude, longitude = excluded.longitude, last_updated_at = CURRENT_TIMESTAMP`,
        ['loc_' + workerId, workerId, fallbackLat, fallbackLng]
      );
    } else if (latitude && longitude) {
      await db.run(
        `INSERT INTO worker_locations (id, worker_id, latitude, longitude, last_updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(worker_id) DO UPDATE SET latitude = excluded.latitude, longitude = excluded.longitude, last_updated_at = CURRENT_TIMESTAMP`,
        ['loc_' + workerId, workerId, Number(latitude), Number(longitude)]
      );
    }

    await db.run('UPDATE workers SET is_online = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [isOnline ? 1 : 0, workerId]);

    res.json({
      message: `You are now ${isOnline ? 'ONLINE and ready to receive bookings' : 'OFFLINE'}.`,
      isOnline: Boolean(isOnline)
    });
  } catch (err) {
    console.error('[Worker Status POST] Error:', err);
    res.status(500).json({ error: 'Failed to update online status.' });
  }
});

// Update GPS location
router.post('/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const workerId = req.user.profile.id;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude required.' });
    }

    await db.run(
      `INSERT INTO worker_locations (id, worker_id, latitude, longitude, last_updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(worker_id) DO UPDATE SET latitude = excluded.latitude, longitude = excluded.longitude, last_updated_at = CURRENT_TIMESTAMP`,
      ['loc_' + workerId, workerId, Number(latitude), Number(longitude)]
    );

    res.json({ success: true, message: 'Location synchronized.' });
  } catch (err) {
    console.error('[Worker Location Update] Error:', err);
    res.status(500).json({ error: 'Failed to synchronize location.' });
  }
});

// Get Worker Jobs
router.get('/jobs', async (req, res) => {
  try {
    const workerId = req.user.profile.id;
    const { status } = req.query;

    let sql = `
      SELECT b.*, s.name as service_name, s.image_url as service_image,
             c.full_name as customer_name, u.mobile as customer_mobile,
             a.house_no, a.street, a.area, a.city, a.pincode, a.latitude as cust_lat, a.longitude as cust_lng
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN customers c ON b.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      JOIN addresses a ON b.address_id = a.id
      WHERE b.worker_id = ?
    `;
    const params = [workerId];

    if (status) {
      if (status === 'requests') {
        sql += ` AND b.status = 'worker_assigned'`;
      } else if (status === 'active') {
        sql += ` AND b.status IN ('worker_accepted', 'worker_on_the_way', 'worker_arrived', 'service_started')`;
      } else if (status === 'completed') {
        sql += ` AND b.status IN ('service_completed', 'customer_confirmation', 'payment_completed', 'booking_closed')`;
      } else if (status === 'cancelled') {
        sql += ` AND b.status IN ('cancelled', 'disputed')`;
      }
    }

    sql += ' ORDER BY b.created_at DESC';

    const jobs = await db.query(sql, params);
    res.json({ jobs });
  } catch (err) {
    console.error('[Worker Jobs GET] Error:', err);
    res.status(500).json({ error: 'Failed to retrieve jobs.' });
  }
});

// Worker Earnings Breakdown (Requirement 17: Cash collection & commission balance tracking)
router.get('/earnings', async (req, res) => {
  try {
    const workerId = req.user.profile.id;

    // Total online earnings paid out
    const onlineEarnings = await db.get(
      `SELECT COALESCE(SUM(b.total_labour_amount + b.total_parts_amount + b.tip_amount - b.commission_amount), 0) as amount
       FROM bookings b
       WHERE b.worker_id = ? AND b.payment_method IN ('upi', 'card') AND b.payment_status = 'completed'`,
      [workerId]
    );

    // Cash bookings: worker collected total directly in hand!
    const cashEarnings = await db.get(
      `SELECT COALESCE(SUM(b.final_amount), 0) as collected,
              COALESCE(SUM(b.commission_amount), 0) as platform_commission_owed
       FROM bookings b
       WHERE b.worker_id = ? AND b.payment_method = 'cash' AND b.payment_status = 'completed'`,
      [workerId]
    );

    // Tips received
    const tipsStats = await db.get(
      `SELECT COALESCE(SUM(amount), 0) as total_tips FROM tips WHERE worker_id = ?`,
      [workerId]
    );

    // Payout requests
    const payouts = await db.query(
      `SELECT * FROM payouts WHERE worker_id = ? ORDER BY created_at DESC`,
      [workerId]
    );

    const cashCollected = cashEarnings ? cashEarnings.collected : 0;
    const commissionOwed = cashEarnings ? cashEarnings.platform_commission_owed : 0;
    const onlineNet = onlineEarnings ? onlineEarnings.amount : 0;

    // Net available balance to withdraw = online earnings - platform commission owed on cash orders
    const netAvailable = Math.max(0, onlineNet - commissionOwed);

    res.json({
      onlineEarnings: Math.round(onlineNet),
      cashCollected: Math.round(cashCollected),
      platformCommissionOwed: Math.round(commissionOwed),
      totalTips: tipsStats ? Math.round(tipsStats.total_tips) : 0,
      netAvailableBalance: Math.round(netAvailable),
      payouts
    });
  } catch (err) {
    console.error('[Worker Earnings GET] Error:', err);
    res.status(500).json({ error: 'Failed to load earnings.' });
  }
});

// Request Payout
router.post('/payout', async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const workerId = req.user.profile.id;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid payout amount.' });
    }

    const payoutId = 'payo_' + uuidv4().replace(/-/g, '').substring(0, 10);
    const refNo = 'POT-' + Date.now();

    await db.run(
      `INSERT INTO payouts (id, worker_id, amount, status, payment_method, reference_no)
       VALUES (?, ?, ?, 'pending', ?, ?)`,
      [payoutId, workerId, Number(amount), paymentMethod || 'upi', refNo]
    );

    res.status(201).json({
      message: `Payout request of ₹${amount} initiated successfully.`,
      payoutId,
      referenceNo: refNo
    });
  } catch (err) {
    console.error('[Payout POST] Error:', err);
    res.status(500).json({ error: 'Failed to submit payout request.' });
  }
});

// Upload Worker KYC Documents
router.post('/documents', async (req, res) => {
  try {
    const { documentType, documentNumber, fileUrl } = req.body;
    const workerId = req.user.profile.id;

    if (!documentType) {
      return res.status(400).json({ error: 'Document type is required.' });
    }

    const docId = 'doc_' + uuidv4().replace(/-/g, '').substring(0, 10);
    await db.run(
      `INSERT INTO worker_documents (id, worker_id, document_type, document_number, file_url, is_verified)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [docId, workerId, documentType, documentNumber || 'DEMO-DOC-1234', fileUrl || '/uploads/demo-kyc.png']
    );

    // Set worker verification status to pending review
    await db.run('UPDATE workers SET verification_status = "pending" WHERE id = ?', [workerId]);

    res.status(201).json({ message: 'Document uploaded for verification.', documentId: docId });
  } catch (err) {
    console.error('[Document Upload] Error:', err);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
});

module.exports = router;
