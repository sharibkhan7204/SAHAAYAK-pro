const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');
const { autoAssignBooking, calculateHaversineDistance } = require('../services/assignmentEngine');
const { createNotification } = require('../services/notificationService');
const { processPayment } = require('../services/paymentService');

router.use(authenticate);

let ioInstance = null;
function setSocketIo(io) {
  ioInstance = io;
}

/**
 * Create New Booking (Customer)
 */
router.post('/', async (req, res) => {
  try {
    const {
      serviceId, addressId, scheduledDate, scheduledTime,
      dynamicFields, customerNotes
    } = req.body;

    const customer = req.user.profile;
    if (req.user.role !== 'customer' || !customer) {
      return res.status(403).json({ error: 'Only customers can book services.' });
    }

    let targetAddressId = addressId;
    if (!targetAddressId) {
      const defAddr = await db.get('SELECT id FROM addresses WHERE customer_id = ? ORDER BY is_default DESC LIMIT 1', [customer.id]);
      if (defAddr) {
        targetAddressId = defAddr.id;
      } else {
        // Create an address record for this customer
        targetAddressId = 'addr_' + uuidv4().replace(/-/g, '').substring(0, 10);
        await db.run(
          `INSERT INTO addresses (id, customer_id, label, house_no, street, area, city, state, pincode, latitude, longitude, is_default)
           VALUES (?, ?, 'Home', 'Default Residence', 'Main Street', 'HSR Layout', 'Bengaluru', 'Karnataka', '560102', 12.9121, 77.6446, 1)`,
          [targetAddressId, customer.id]
        );
      }
    }

    if (!serviceId || !scheduledDate || !scheduledTime) {
      return res.status(400).json({ error: 'Service, scheduled date, and time slot are required.' });
    }

    // Verify service
    const service = await db.get('SELECT * FROM services WHERE (id = ? OR slug = ?) AND is_active = 1', [serviceId, serviceId]);
    if (!service) {
      return res.status(404).json({ error: 'Service not found or unavailable.' });
    }

    // Verify address
    const address = await db.get('SELECT * FROM addresses WHERE id = ? AND customer_id = ?', [targetAddressId, customer.id]);
    if (!address) {
      return res.status(404).json({ error: 'Selected address not found.' });
    }

    // Calculate initial estimated price based on service pricing model
    let baseAmount = Number(service.base_price || 0);
    const fields = dynamicFields || {};

    if (service.pricing_model === 'range') {
      baseAmount = Number(service.min_price || service.base_price);
    } else if (service.pricing_model === 'per_unit') {
      const units = Number(fields.approx_sqft || fields.units || 100);
      baseAmount = units * Number(service.per_unit_price || 12);
    } else if (service.pricing_model === 'inspection_plus_charges') {
      baseAmount = Number(service.inspection_fee || 99);
    } else if (service.pricing_model === 'base_plus_distance') {
      baseAmount = Number(service.base_price || 30) + (10 * Number(service.per_km_price || 10));
    }

    const bookingId = 'bk_' + uuidv4().replace(/-/g, '').substring(0, 10);
    const bookingNumber = 'SHK-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

    await db.transaction(async ({ run }) => {
      await run(
        `INSERT INTO bookings (
          id, booking_number, customer_id, service_id, address_id, status,
          scheduled_date, scheduled_time, dynamic_fields_json, customer_notes,
          base_service_amount, total_labour_amount, total_parts_amount,
          final_amount, payment_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'finding_worker', ?, ?, ?, ?, ?, ?, 0, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          bookingId, bookingNumber, customer.id, service.id, targetAddressId,
          scheduledDate, scheduledTime, JSON.stringify(fields), customerNotes || '',
          baseAmount, baseAmount, baseAmount
        ]
      );

      await run(
        `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by_user_id, reason)
         VALUES (?, ?, NULL, 'finding_worker', ?, 'Customer confirmed initial booking request')`,
        ['bsh_' + uuidv4().replace(/-/g, '').substring(0, 10), bookingId, req.user.id]
      );
    });

    // Launch automatic worker assignment engine
    const assignResult = await autoAssignBooking(bookingId);

    const createdBooking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);

    res.status(201).json({
      message: 'Booking created successfully.',
      booking: createdBooking,
      assignment: assignResult
    });
  } catch (err) {
    console.error('[Booking POST] Error:', err);
    res.status(500).json({ error: 'Failed to create booking.' });
  }
});

/**
 * Get Bookings List (Scoped by role: Customer sees own, Worker sees own, Admin sees all)
 */
router.get('/', async (req, res) => {
  try {
    const role = req.user.role;
    let sql = `
      SELECT b.*, s.name as service_name, s.image_url as service_image, s.pricing_model,
             c.full_name as customer_name,
             w.full_name as worker_name, w.avg_rating as worker_rating,
             a.area as cust_area, a.city as cust_city
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN customers c ON b.customer_id = c.id
      LEFT JOIN workers w ON b.worker_id = w.id
      JOIN addresses a ON b.address_id = a.id
    `;
    const params = [];

    if (role === 'customer') {
      sql += ' WHERE b.customer_id = ?';
      params.push(req.user.profile.id);
    } else if (role === 'worker') {
      sql += ' WHERE b.worker_id = ?';
      params.push(req.user.profile.id);
    }

    sql += ' ORDER BY b.created_at DESC';

    const bookings = await db.query(sql, params);
    res.json({ bookings });
  } catch (err) {
    console.error('[Bookings GET] Error:', err);
    res.status(500).json({ error: 'Failed to retrieve bookings.' });
  }
});

/**
 * Get Booking Details with Role-appropriate privacy controls
 */
router.get('/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await db.get(
      `SELECT b.*, s.name as service_name, s.description as service_description,
              s.image_url as service_image, s.requires_before_after_photos, s.pricing_model,
              c.full_name as customer_name, c.user_id as cust_user_id, cu.mobile as customer_mobile, cu.email as customer_email,
              w.full_name as worker_name, w.avg_rating as worker_rating, w.total_reviews as worker_reviews,
              w.user_id as wrk_user_id, wu.mobile as worker_mobile,
              wl.latitude as worker_lat, wl.longitude as worker_lng,
              a.house_no, a.building_name, a.street, a.area, a.city, a.state, a.pincode, a.landmark,
              a.latitude as cust_lat, a.longitude as cust_lng
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN customers c ON b.customer_id = c.id
       JOIN users cu ON c.user_id = cu.id
       LEFT JOIN workers w ON b.worker_id = w.id
       LEFT JOIN users wu ON w.user_id = wu.id
       LEFT JOIN worker_locations wl ON w.id = wl.worker_id
       JOIN addresses a ON b.address_id = a.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Role checks: Must be either the customer, the worker, or an admin
    const isCustomer = req.user.role === 'customer' && req.user.profile.id === booking.customer_id;
    const isWorker = req.user.role === 'worker' && req.user.profile.id === booking.worker_id;
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isWorker && !isAdmin) {
      return res.status(403).json({ error: 'Access denied to this booking.' });
    }

    // Calculate approximate distance
    let approximateDistanceKm = 0;
    if (booking.worker_lat && booking.cust_lat) {
      approximateDistanceKm = calculateHaversineDistance(
        booking.cust_lat, booking.cust_lng,
        booking.worker_lat, booking.worker_lng
      );
    }

    // Requirement 12: Privacy controls for Worker
    // Before worker accepts, worker sees only approximate customer area and approximate distance.
    // After acceptance, worker sees full customer address.
    const isWorkerPendingAcceptance = isWorker && booking.status === 'worker_assigned';
    const sanitizedAddress = isWorkerPendingAcceptance ? {
      area: booking.area,
      city: booking.city,
      pincode: booking.pincode,
      approximateDistanceKm
    } : {
      house_no: booking.house_no,
      building_name: booking.building_name,
      street: booking.street,
      area: booking.area,
      city: booking.city,
      state: booking.state,
      pincode: booking.pincode,
      landmark: booking.landmark,
      latitude: booking.cust_lat,
      longitude: booking.cust_lng,
      approximateDistanceKm
    };

    // Parse JSON fields
    let dynamicFields = {};
    let beforePhotos = [];
    let afterPhotos = [];
    try { dynamicFields = JSON.parse(booking.dynamic_fields_json || '{}'); } catch (e) {}
    try { beforePhotos = JSON.parse(booking.before_photos_json || '[]'); } catch (e) {}
    try { afterPhotos = JSON.parse(booking.after_photos_json || '[]'); } catch (e) {}

    // Additional charge requests
    const additionalCharges = await db.query(
      'SELECT * FROM additional_charge_requests WHERE booking_id = ? ORDER BY requested_at DESC',
      [bookingId]
    );

    // Status timeline history
    const statusHistory = await db.query(
      'SELECT * FROM booking_status_history WHERE booking_id = ? ORDER BY created_at ASC',
      [bookingId]
    );

    // Invoice details if completed
    const invoice = await db.get('SELECT * FROM invoices WHERE booking_id = ?', [bookingId]);

    // Ratings/reviews if any
    const review = await db.get('SELECT * FROM reviews WHERE booking_id = ? AND reviewer_user_id = ?', [bookingId, req.user.id]);

    res.json({
      booking: {
        ...booking,
        address: sanitizedAddress,
        dynamicFields,
        beforePhotos,
        afterPhotos,
        approximateDistanceKm
      },
      additionalCharges,
      statusHistory,
      invoice,
      hasReviewed: Boolean(review)
    });
  } catch (err) {
    console.error('[Booking GET single] Error:', err);
    res.status(500).json({ error: 'Failed to retrieve booking.' });
  }
});

/**
 * Worker Response to Job Assignment (Accept or Reject)
 */
router.post('/:id/worker-respond', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { action, reason } = req.body; // 'accept' or 'reject'
    const worker = req.user.profile;

    if (req.user.role !== 'worker' || !worker) {
      return res.status(403).json({ error: 'Only assigned workers can respond to jobs.' });
    }

    const booking = await db.get(
      `SELECT b.*, c.user_id as cust_user_id, s.name as service_name
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       JOIN services s ON b.service_id = s.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.worker_id !== worker.id) {
      return res.status(403).json({ error: 'You are not the assigned worker for this booking.' });
    }

    if (booking.status !== 'worker_assigned') {
      return res.status(400).json({ error: `Cannot respond to booking in status: ${booking.status}` });
    }

    if (action === 'accept') {
      await db.run(
        `UPDATE bookings SET status = 'worker_accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [bookingId]
      );

      await db.run(
        `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by_user_id, reason)
         VALUES (?, ?, 'worker_assigned', 'worker_accepted', ?, 'Worker accepted job request')`,
        ['bsh_' + uuidv4().replace(/-/g, '').substring(0, 10), bookingId, req.user.id]
      );

      // Notify customer
      await createNotification({
        userId: booking.cust_user_id,
        title: 'Worker Confirmed!',
        message: `${worker.full_name} accepted your ${booking.service_name} job and will visit as scheduled.`,
        type: 'success',
        category: 'booking',
        relatedBookingId: bookingId
      });

      if (ioInstance) {
        ioInstance.to(`booking_${bookingId}`).emit('booking:status_change', {
          bookingId,
          status: 'worker_accepted',
          workerName: worker.full_name
        });
      }

      return res.json({ message: 'Job accepted successfully! You can now view customer details.' });
    } else if (action === 'reject') {
      // Record decline count
      await db.run(
        `UPDATE workers SET total_declined_jobs = total_declined_jobs + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [worker.id]
      );

      await db.run(
        `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by_user_id, reason)
         VALUES (?, ?, 'worker_assigned', 'finding_worker', ?, ?)`,
        ['bsh_' + uuidv4().replace(/-/g, '').substring(0, 10), bookingId, req.user.id, reason || 'Worker declined assignment']
      );

      // Re-trigger automatic assignment excluding this worker!
      const reassignResult = await autoAssignBooking(bookingId, [worker.id]);

      return res.json({
        message: 'Job declined. Re-routing to next eligible partner.',
        reassignment: reassignResult
      });
    } else {
      return res.status(400).json({ error: 'Action must be "accept" or "reject".' });
    }
  } catch (err) {
    console.error('[Worker Respond] Error:', err);
    res.status(500).json({ error: 'Failed to record response.' });
  }
});

/**
 * Worker Status Transitions (On The Way -> Arrived -> Start -> Complete)
 */
router.post('/:id/status', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { nextStatus, reason } = req.body;
    const userRole = req.user.role;

    const booking = await db.get(
      `SELECT b.*, c.user_id as cust_user_id, w.user_id as wrk_user_id,
              s.name as service_name, s.requires_before_after_photos
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       LEFT JOIN workers w ON b.worker_id = w.id
       JOIN services s ON b.service_id = s.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    // Validate authorized transition
    const validTransitions = {
      worker_accepted: ['worker_on_the_way', 'cancelled'],
      worker_on_the_way: ['worker_arrived', 'cancelled'],
      worker_arrived: ['service_started', 'cancelled'],
      service_started: ['service_completed', 'cancelled'],
      service_completed: ['customer_confirmation', 'payment_completed'],
      customer_confirmation: ['payment_completed'],
      finding_worker: ['cancelled']
    };

    if (!validTransitions[booking.status] || !validTransitions[booking.status].includes(nextStatus)) {
      // Allow admin override anytime
      if (userRole !== 'admin') {
        return res.status(400).json({
          error: `Invalid status transition from "${booking.status}" to "${nextStatus}".`
        });
      }
    }

    await db.run(
      'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nextStatus, bookingId]
    );

    await db.run(
      `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by_user_id, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['bsh_' + uuidv4().replace(/-/g, '').substring(0, 10), bookingId, booking.status, nextStatus, req.user.id, reason || 'Status updated']
    );

    // Status notifications to Customer
    const statusMessages = {
      worker_on_the_way: { title: 'Partner is On The Way!', msg: `Your service provider is en route to your location.` },
      worker_arrived: { title: 'Partner Arrived', msg: `Your service partner has reached your address.` },
      service_started: { title: 'Service Started', msg: `Service for ${booking.service_name} is now underway.` },
      service_completed: { title: 'Service Completed!', msg: `Your partner has marked ${booking.service_name} complete. Please confirm and proceed to pay.` }
    };

    if (statusMessages[nextStatus]) {
      await createNotification({
        userId: booking.cust_user_id,
        title: statusMessages[nextStatus].title,
        message: statusMessages[nextStatus].msg,
        type: 'info',
        category: 'booking',
        relatedBookingId: bookingId
      });
    }

    if (ioInstance) {
      ioInstance.to(`booking_${bookingId}`).emit('booking:status_change', {
        bookingId,
        status: nextStatus
      });
    }

    res.json({ message: `Status updated to ${nextStatus}`, status: nextStatus });
  } catch (err) {
    console.error('[Booking Status POST] Error:', err);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

/**
 * Upload Before / After Photos
 */
router.post('/:id/photos', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { type, photoUrl } = req.body; // type: 'before' or 'after'

    if (!['before', 'after'].includes(type) || !photoUrl) {
      return res.status(400).json({ error: 'Photo type (before/after) and photoUrl are required.' });
    }

    const booking = await db.get('SELECT before_photos_json, after_photos_json FROM bookings WHERE id = ?', [bookingId]);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    if (type === 'before') {
      let photos = [];
      try { photos = JSON.parse(booking.before_photos_json || '[]'); } catch (e) {}
      photos.push(photoUrl);
      await db.run('UPDATE bookings SET before_photos_json = ? WHERE id = ?', [JSON.stringify(photos), bookingId]);
    } else {
      let photos = [];
      try { photos = JSON.parse(booking.after_photos_json || '[]'); } catch (e) {}
      photos.push(photoUrl);
      await db.run('UPDATE bookings SET after_photos_json = ? WHERE id = ?', [JSON.stringify(photos), bookingId]);
    }

    res.json({ message: `${type} photo added successfully.`, photoUrl });
  } catch (err) {
    console.error('[Booking Photos POST] Error:', err);
    res.status(500).json({ error: 'Failed to add photo.' });
  }
});

/**
 * Additional Work / Charge Request (Worker)
 * Requirement 14: A worker must not take work outside the platform.
 * Customer receives request and approves/rejects before work proceeds.
 */
router.post('/:id/additional-charge', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { description, labourAmount, partsAmount, photos } = req.body;
    const worker = req.user.profile;

    if (req.user.role !== 'worker' || !worker) {
      return res.status(403).json({ error: 'Only the assigned worker can request additional charges.' });
    }

    const booking = await db.get(
      `SELECT b.*, c.user_id as cust_user_id FROM bookings b
       JOIN customers c ON b.customer_id = c.id WHERE b.id = ?`,
      [bookingId]
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const labour = Math.max(0, Number(labourAmount) || 0);
    const parts = Math.max(0, Number(partsAmount) || 0);

    if (!description || (labour === 0 && parts === 0)) {
      return res.status(400).json({ error: 'Description and at least one non-zero charge (labour or parts) are required.' });
    }

    const chargeId = 'acr_' + uuidv4().replace(/-/g, '').substring(0, 10);

    await db.run(
      `INSERT INTO additional_charge_requests (
        id, booking_id, worker_id, description, labour_amount, parts_amount,
        photos_json, status, requested_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
      [
        chargeId, bookingId, worker.id, description, labour, parts,
        JSON.stringify(photos || [])
      ]
    );

    // Notify Customer
    await createNotification({
      userId: booking.cust_user_id,
      title: 'Additional Work Approval Requested',
      message: `${worker.full_name} requested approval for additional work: ${description} (Labour: ₹${labour}, Parts: ₹${parts}).`,
      type: 'warning',
      category: 'booking',
      relatedBookingId: bookingId
    });

    if (ioInstance) {
      ioInstance.to(`booking_${bookingId}`).emit('booking:additional_charge_requested', {
        chargeId,
        description,
        labourAmount: labour,
        partsAmount: parts
      });
    }

    res.status(201).json({
      message: 'Additional work request submitted to customer for approval.',
      chargeId
    });
  } catch (err) {
    console.error('[Additional Charge POST] Error:', err);
    res.status(500).json({ error: 'Failed to submit additional charge request.' });
  }
});

/**
 * Customer Approve or Reject Additional Charge
 */
router.post('/:id/respond-additional-charge', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { chargeId, response } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(response)) {
      return res.status(400).json({ error: 'Response must be "approved" or "rejected".' });
    }

    const charge = await db.get(
      'SELECT * FROM additional_charge_requests WHERE id = ? AND booking_id = ?',
      [chargeId, bookingId]
    );
    if (!charge) return res.status(404).json({ error: 'Additional charge request not found.' });
    if (charge.status !== 'pending') {
      return res.status(400).json({ error: `Charge request already responded with: ${charge.status}` });
    }

    const booking = await db.get(
      `SELECT b.*, w.user_id as wrk_user_id FROM bookings b
       LEFT JOIN workers w ON b.worker_id = w.id WHERE b.id = ?`,
      [bookingId]
    );

    await db.transaction(async ({ run }) => {
      await run(
        `UPDATE additional_charge_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [response, chargeId]
      );

      if (response === 'approved') {
        const newLabour = Number(booking.total_labour_amount || 0) + Number(charge.labour_amount || 0);
        const newParts = Number(booking.total_parts_amount || 0) + Number(charge.parts_amount || 0);
        const newFinal = newLabour + newParts + Number(booking.tip_amount || 0);

        await run(
          `UPDATE bookings SET
            total_labour_amount = ?,
            total_parts_amount = ?,
            final_amount = ?,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [newLabour, newParts, newFinal, bookingId]
        );
      }
    });

    // Notify Worker
    if (booking.wrk_user_id) {
      await createNotification({
        userId: booking.wrk_user_id,
        title: `Additional Charge ${response.toUpperCase()}`,
        message: `Customer ${response} the request for "${charge.description}".`,
        type: response === 'approved' ? 'success' : 'alert',
        category: 'booking',
        relatedBookingId: bookingId
      });
    }

    if (ioInstance) {
      ioInstance.to(`booking_${bookingId}`).emit('booking:additional_charge_responded', {
        chargeId,
        status: response
      });
    }

    res.json({ message: `Additional charge has been ${response}.` });
  } catch (err) {
    console.error('[Respond Additional Charge] Error:', err);
    res.status(500).json({ error: 'Failed to record response.' });
  }
});

/**
 * Cancel Booking
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { reason } = req.body;

    const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    if (['payment_completed', 'booking_closed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot cancel booking in status ${booking.status}` });
    }

    await db.run(
      `UPDATE bookings SET
        status = 'cancelled',
        cancellation_reason = ?,
        cancelled_by = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [reason || 'Cancelled by user', req.user.role, bookingId]
    );

    await db.run(
      `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, changed_by_user_id, reason)
       VALUES (?, ?, ?, 'cancelled', ?, ?)`,
      ['bsh_' + uuidv4().replace(/-/g, '').substring(0, 10), bookingId, booking.status, req.user.id, reason || 'Booking cancelled']
    );

    res.json({ message: 'Booking cancelled successfully.' });
  } catch (err) {
    console.error('[Cancel Booking] Error:', err);
    res.status(500).json({ error: 'Failed to cancel booking.' });
  }
});

/**
 * Record Cash / Demo Payment (Worker or Customer)
 * Fixes: "when worker click the cash is collected, endpoint has something issue"
 */
async function handlePayDemo(req, res) {
  try {
    const bookingId = req.params.id;
    const { method = 'cash', tipAmount = 0 } = req.body;

    const booking = await db.get(
      `SELECT b.*, c.user_id as cust_user_id, w.user_id as wrk_user_id
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       LEFT JOIN workers w ON b.worker_id = w.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    // Validate authorization
    if (req.user.role === 'customer' && req.user.id !== booking.cust_user_id) {
      return res.status(403).json({ error: 'Unauthorized to pay for this booking.' });
    }
    if (req.user.role === 'worker' && req.user.id !== booking.wrk_user_id) {
      return res.status(403).json({ error: 'Unauthorized: you are not the assigned worker for this booking.' });
    }

    const result = await processPayment({
      bookingId,
      customerId: booking.customer_id,
      workerId: booking.worker_id,
      paymentMethod: method,
      tipAmount: Number(tipAmount) || 0,
      transactionReference: `${method.toUpperCase()}_COLLECTED_${Date.now()}`
    });

    res.json({
      message: 'Payment recorded and invoice generated successfully.',
      ...result
    });
  } catch (err) {
    console.error('[Pay Demo / Cash Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to record payment.' });
  }
}

router.post('/:id/pay-demo', handlePayDemo);
router.post('/:id/cash-collected', handlePayDemo);

module.exports = {
  router,
  setSocketIo
};

