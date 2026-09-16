const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAdminAction } = require('../services/auditService');
const { createNotification, broadcastNotification } = require('../services/notificationService');

router.use(authenticate);
router.use(authorize('admin'));

// Admin Dashboard KPIs and Charts Data
router.get('/dashboard', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // KPIs
    const [
      customersCount, workersCount, pendingWorkersCount, activeOnlineWorkersCount,
      totalBookingsCount, todayBookingsCount, activeBookingsCount, completedBookingsCount, cancelledBookingsCount,
      revenueStats, disputesStats
    ] = await Promise.all([
      db.get('SELECT count(*) as count FROM customers'),
      db.get('SELECT count(*) as count FROM workers'),
      db.get("SELECT count(*) as count FROM workers WHERE verification_status = 'pending'"),
      db.get('SELECT count(*) as count FROM workers WHERE is_online = 1 AND is_approved = 1'),
      db.get('SELECT count(*) as count FROM bookings'),
      db.get('SELECT count(*) as count FROM bookings WHERE scheduled_date = ?', [todayStr]),
      db.get("SELECT count(*) as count FROM bookings WHERE status IN ('worker_assigned', 'worker_accepted', 'worker_on_the_way', 'worker_arrived', 'service_started')"),
      db.get("SELECT count(*) as count FROM bookings WHERE status IN ('payment_completed', 'booking_closed')"),
      db.get("SELECT count(*) as count FROM bookings WHERE status = 'cancelled'"),
      db.get(`
        SELECT COALESCE(SUM(total_amount), 0) as gross_volume,
               COALESCE(SUM(platform_commission_amount), 0) as total_commission,
               COALESCE(SUM(service_labour_amount + parts_materials_amount - platform_commission_amount), 0) as worker_earnings,
               COALESCE(SUM(tip_amount), 0) as total_tips
        FROM payments WHERE payment_status = 'completed'
      `),
      db.get("SELECT count(*) as count FROM complaints WHERE status IN ('pending', 'investigating')")
    ]);

    // Top services by volume
    const topServices = await db.query(`
      SELECT s.name, count(b.id) as booking_count, COALESCE(SUM(b.final_amount), 0) as total_revenue
      FROM services s
      LEFT JOIN bookings b ON s.id = b.service_id
      GROUP BY s.id
      ORDER BY booking_count DESC
      LIMIT 6
    `);

    // Category distribution
    const categoryStats = await db.query(`
      SELECT c.name, count(b.id) as booking_count
      FROM service_categories c
      JOIN services s ON c.id = s.category_id
      LEFT JOIN bookings b ON s.id = b.service_id
      GROUP BY c.id
      ORDER BY booking_count DESC
    `);

    res.json({
      kpis: {
        totalCustomers: customersCount.count,
        totalWorkers: workersCount.count,
        pendingVerifications: pendingWorkersCount.count,
        activeOnlineWorkers: activeOnlineWorkersCount.count,
        totalBookings: totalBookingsCount.count,
        todayBookings: todayBookingsCount.count,
        activeBookings: activeBookingsCount.count,
        completedBookings: completedBookingsCount.count,
        cancelledBookings: cancelledBookingsCount.count,
        grossVolume: Math.round(revenueStats.gross_volume),
        totalCommission: Math.round(revenueStats.total_commission),
        workerEarnings: Math.round(revenueStats.worker_earnings),
        totalTips: Math.round(revenueStats.total_tips),
        pendingDisputes: disputesStats.count
      },
      charts: {
        topServices,
        categoryStats
      }
    });
  } catch (err) {
    console.error('[Admin Dashboard GET] Error:', err);
    res.status(500).json({ error: 'Failed to load dashboard metrics.' });
  }
});

// Worker Verification Queue (Requirement 10)
router.get('/workers/pending', async (req, res) => {
  try {
    const pendingWorkers = await db.query(`
      SELECT w.*, u.email, u.mobile, u.created_at as registered_at
      FROM workers w
      JOIN users u ON w.user_id = u.id
      WHERE w.verification_status IN ('pending', 'changes_requested')
      ORDER BY w.created_at ASC
    `);

    const withDocs = [];
    for (const w of pendingWorkers) {
      const docs = await db.query('SELECT * FROM worker_documents WHERE worker_id = ?', [w.id]);
      const services = await db.query(`
        SELECT s.name FROM services s
        JOIN worker_services ws ON s.id = ws.service_id
        WHERE ws.worker_id = ?
      `, [w.id]);
      withDocs.push({ ...w, documents: docs, offeredServices: services.map(s => s.name) });
    }

    res.json({ pendingWorkers: withDocs });
  } catch (err) {
    console.error('[Pending Workers GET] Error:', err);
    res.status(500).json({ error: 'Failed to fetch verification queue.' });
  }
});

// Approve, Reject, or Request Changes for a Worker
router.post('/workers/:id/verify', async (req, res) => {
  try {
    const workerId = req.params.id;
    const { action, reason } = req.body; // 'approve', 'reject', 'request_changes'

    if (!['approve', 'reject', 'request_changes'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve", "reject", or "request_changes".' });
    }

    if ((action === 'reject' || action === 'request_changes') && !reason) {
      return res.status(400).json({ error: 'A clear reason is required for rejection or requesting changes.' });
    }

    const worker = await db.get('SELECT * FROM workers WHERE id = ?', [workerId]);
    if (!worker) return res.status(404).json({ error: 'Worker not found.' });

    let newStatus = 'pending';
    let isApproved = 0;

    if (action === 'approve') {
      newStatus = 'approved';
      isApproved = 1;
    } else if (action === 'reject') {
      newStatus = 'rejected';
      isApproved = 0;
    } else if (action === 'request_changes') {
      newStatus = 'changes_requested';
      isApproved = 0;
    }

    await db.run(
      `UPDATE workers SET
        verification_status = ?,
        is_approved = ?,
        rejection_reason = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newStatus, isApproved, reason || null, workerId]
    );

    // Audit log
    await logAdminAction({
      adminUserId: req.user.id,
      action: `WORKER_${action.toUpperCase()}`,
      entity: 'workers',
      entityId: workerId,
      previousValue: { verification_status: worker.verification_status, is_approved: worker.is_approved },
      newValue: { verification_status: newStatus, is_approved: isApproved },
      reason: reason || `Worker verification marked as ${newStatus}`
    });

    // Notify worker
    await createNotification({
      userId: worker.user_id,
      title: action === 'approve' ? 'Congratulations! Account Verified' : `KYC Verification: ${action.replace('_', ' ').toUpperCase()}`,
      message: action === 'approve'
        ? 'Your professional profile and KYC have been verified. You can now go online to receive job requests!'
        : `Verification update: ${reason}`,
      type: action === 'approve' ? 'success' : 'alert',
      category: 'system'
    });

    res.json({ message: `Worker successfully marked as ${newStatus}.` });
  } catch (err) {
    console.error('[Worker Verify POST] Error:', err);
    res.status(500).json({ error: 'Failed to process worker verification.' });
  }
});

// All Workers List with filtering
router.get('/workers', async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `
      SELECT w.*, u.email, u.mobile, u.is_active as user_active
      FROM workers w
      JOIN users u ON w.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND w.verification_status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (LOWER(w.full_name) LIKE ? OR LOWER(u.email) LIKE ? OR w.mobile LIKE ?)';
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`, `%${search}%`);
    }

    sql += ' ORDER BY w.created_at DESC';
    const workers = await db.query(sql, params);
    res.json({ workers });
  } catch (err) {
    console.error('[Admin Workers GET] Error:', err);
    res.status(500).json({ error: 'Failed to fetch workers.' });
  }
});

// All Customers List
router.get('/customers', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT c.*, u.email, u.mobile, u.is_active as user_active,
             (SELECT count(*) FROM bookings WHERE customer_id = c.id) as bookings_count,
             (SELECT count(*) FROM complaints WHERE filed_by_user_id = u.id) as complaints_count
      FROM customers c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND (LOWER(c.full_name) LIKE ? OR LOWER(u.email) LIKE ? OR u.mobile LIKE ?)';
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`, `%${search}%`);
    }

    sql += ' ORDER BY c.created_at DESC';
    const customers = await db.query(sql, params);
    res.json({ customers });
  } catch (err) {
    console.error('[Admin Customers GET] Error:', err);
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});

// Suspend / Activate Customer (Requirement 5)
router.post('/customers/:id/suspend', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { isSuspended, reason } = req.body;

    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    await db.run(
      'UPDATE customers SET is_suspended = ?, suspension_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [isSuspended ? 1 : 0, isSuspended ? (reason || 'Policy violation') : null, customerId]
    );

    await logAdminAction({
      adminUserId: req.user.id,
      action: isSuspended ? 'CUSTOMER_SUSPENDED' : 'CUSTOMER_ACTIVATED',
      entity: 'customers',
      entityId: customerId,
      previousValue: { is_suspended: customer.is_suspended },
      newValue: { is_suspended: isSuspended ? 1 : 0 },
      reason: reason || 'Administrative action'
    });

    res.json({ message: `Customer account ${isSuspended ? 'suspended' : 'reactivated'} successfully.` });
  } catch (err) {
    console.error('[Customer Suspend POST] Error:', err);
    res.status(500).json({ error: 'Failed to modify customer status.' });
  }
});

// All Bookings Management
router.get('/bookings', async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `
      SELECT b.*, s.name as service_name, c.full_name as customer_name,
             w.full_name as worker_name, a.area as cust_area
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN customers c ON b.customer_id = c.id
      LEFT JOIN workers w ON b.worker_id = w.id
      JOIN addresses a ON b.address_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (b.booking_number LIKE ? OR LOWER(c.full_name) LIKE ? OR LOWER(w.full_name) LIKE ?)';
      params.push(`%${search}%`, `%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    sql += ' ORDER BY b.created_at DESC';
    const bookings = await db.query(sql, params);
    res.json({ bookings });
  } catch (err) {
    console.error('[Admin Bookings GET] Error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

// Admin Manual Reassign Worker or Status Override
router.post('/bookings/:id/reassign', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { newWorkerId, reason } = req.body;

    if (!newWorkerId) return res.status(400).json({ error: 'New worker ID required.' });

    const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    const worker = await db.get('SELECT * FROM workers WHERE id = ?', [newWorkerId]);

    if (!booking || !worker) return res.status(404).json({ error: 'Booking or Worker not found.' });

    await db.run(
      `UPDATE bookings SET worker_id = ?, status = 'worker_assigned', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newWorkerId, bookingId]
    );

    await logAdminAction({
      adminUserId: req.user.id,
      action: 'BOOKING_REASSIGNED',
      entity: 'bookings',
      entityId: bookingId,
      previousValue: { worker_id: booking.worker_id },
      newValue: { worker_id: newWorkerId },
      reason: reason || 'Manual Admin reassignment'
    });

    res.json({ message: `Booking successfully reassigned to ${worker.full_name}.` });
  } catch (err) {
    console.error('[Admin Reassign] Error:', err);
    res.status(500).json({ error: 'Failed to reassign booking.' });
  }
});

// Services CRUD
router.post('/services', async (req, res) => {
  try {
    const {
      categoryId, name, slug, description, imageUrl, pricingModel,
      basePrice, minPrice, maxPrice, perUnitPrice, inspectionFee, perKmPrice,
      estimatedDurationMins, serviceRadiusKm, requiresBeforeAfterPhotos, formSchema
    } = req.body;

    if (!categoryId || !name || !pricingModel) {
      return res.status(400).json({ error: 'Category, name, and pricing model are required.' });
    }

    const serviceId = 'srv_' + uuidv4().replace(/-/g, '').substring(0, 10);
    const serviceSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    await db.run(
      `INSERT INTO services (
        id, category_id, name, slug, description, image_url, pricing_model,
        base_price, min_price, max_price, per_unit_price, inspection_fee, per_km_price,
        estimated_duration_mins, service_radius_km, requires_before_after_photos,
        is_active, form_schema_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        serviceId, categoryId, name, serviceSlug, description || '', imageUrl || '', pricingModel,
        Number(basePrice) || 0, Number(minPrice) || 0, Number(maxPrice) || 0,
        Number(perUnitPrice) || 0, Number(inspectionFee) || 0, Number(perKmPrice) || 0,
        Number(estimatedDurationMins) || 60, Number(serviceRadiusKm) || 20,
        requiresBeforeAfterPhotos ? 1 : 0, JSON.stringify(formSchema || { fields: [] })
      ]
    );

    await logAdminAction({
      adminUserId: req.user.id,
      action: 'SERVICE_CREATED',
      entity: 'services',
      entityId: serviceId,
      newValue: { name, pricingModel, basePrice }
    });

    res.status(201).json({ message: 'Service created successfully.', serviceId });
  } catch (err) {
    console.error('[Service Create POST] Error:', err);
    res.status(500).json({ error: 'Failed to create service.' });
  }
});

router.put('/services/:id', async (req, res) => {
  try {
    const serviceId = req.params.id;
    const {
      name, description, imageUrl, pricingModel,
      basePrice, minPrice, maxPrice, perUnitPrice, inspectionFee, perKmPrice,
      estimatedDurationMins, serviceRadiusKm, requiresBeforeAfterPhotos, isActive, formSchema
    } = req.body;

    const existing = await db.get('SELECT * FROM services WHERE id = ?', [serviceId]);
    if (!existing) return res.status(404).json({ error: 'Service not found.' });

    await db.run(
      `UPDATE services SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        image_url = COALESCE(?, image_url),
        pricing_model = COALESCE(?, pricing_model),
        base_price = COALESCE(?, base_price),
        min_price = COALESCE(?, min_price),
        max_price = COALESCE(?, max_price),
        per_unit_price = COALESCE(?, per_unit_price),
        inspection_fee = COALESCE(?, inspection_fee),
        per_km_price = COALESCE(?, per_km_price),
        estimated_duration_mins = COALESCE(?, estimated_duration_mins),
        service_radius_km = COALESCE(?, service_radius_km),
        requires_before_after_photos = COALESCE(?, requires_before_after_photos),
        is_active = COALESCE(?, is_active),
        form_schema_json = COALESCE(?, form_schema_json),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name, description, imageUrl, pricingModel,
        basePrice, minPrice, maxPrice, perUnitPrice, inspectionFee, perKmPrice,
        estimatedDurationMins, serviceRadiusKm, requiresBeforeAfterPhotos,
        isActive, formSchema ? JSON.stringify(formSchema) : null, serviceId
      ]
    );

    await logAdminAction({
      adminUserId: req.user.id,
      action: 'SERVICE_UPDATED',
      entity: 'services',
      entityId: serviceId,
      previousValue: existing,
      newValue: req.body
    });

    res.json({ message: 'Service updated successfully.' });
  } catch (err) {
    console.error('[Service Update PUT] Error:', err);
    res.status(500).json({ error: 'Failed to update service.' });
  }
});

// Assignment Settings (Requirement 30)
router.get('/settings/assignment', async (req, res) => {
  try {
    const row = await db.get('SELECT value_json FROM system_settings WHERE key = "assignment_settings"');
    res.json({ settings: row ? JSON.parse(row.value_json) : {} });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assignment settings.' });
  }
});

router.put('/settings/assignment', async (req, res) => {
  try {
    const current = await db.get('SELECT value_json FROM system_settings WHERE key = "assignment_settings"');
    const prevVal = current ? JSON.parse(current.value_json) : {};

    await db.run(
      'UPDATE system_settings SET value_json = ?, updated_by_admin_id = ?, updated_at = CURRENT_TIMESTAMP WHERE key = "assignment_settings"',
      [JSON.stringify(req.body), req.user.id]
    );

    await logAdminAction({
      adminUserId: req.user.id,
      action: 'ASSIGNMENT_SETTINGS_UPDATE',
      entity: 'system_settings',
      entityId: 'assignment_settings',
      previousValue: prevVal,
      newValue: req.body,
      reason: 'Assignment weights calibration'
    });

    res.json({ message: 'Assignment settings updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update assignment settings.' });
  }
});

// Commission Settings (Requirement 15 & 31)
router.get('/settings/commission', async (req, res) => {
  try {
    const row = await db.get('SELECT value_json FROM system_settings WHERE key = "commission_settings"');
    res.json({ settings: row ? JSON.parse(row.value_json) : {} });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch commission settings.' });
  }
});

router.put('/settings/commission', async (req, res) => {
  try {
    const current = await db.get('SELECT value_json FROM system_settings WHERE key = "commission_settings"');
    const prevVal = current ? JSON.parse(current.value_json) : {};

    await db.run(
      'UPDATE system_settings SET value_json = ?, updated_by_admin_id = ?, updated_at = CURRENT_TIMESTAMP WHERE key = "commission_settings"',
      [JSON.stringify(req.body), req.user.id]
    );

    await logAdminAction({
      adminUserId: req.user.id,
      action: 'COMMISSION_SETTINGS_UPDATE',
      entity: 'system_settings',
      entityId: 'commission_settings',
      previousValue: prevVal,
      newValue: req.body,
      reason: 'Platform fee policy updated'
    });

    res.json({ message: 'Commission settings updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update commission settings.' });
  }
});

// Complaint Resolution & Disputes (Requirement 19 & 33)
router.get('/complaints', async (req, res) => {
  try {
    const complaints = await db.query(`
      SELECT c.*, b.booking_number, s.name as service_name,
             fu.email as filed_by_email, au.email as against_email
      FROM complaints c
      JOIN bookings b ON c.booking_id = b.id
      JOIN services s ON b.service_id = s.id
      JOIN users fu ON c.filed_by_user_id = fu.id
      LEFT JOIN users au ON c.against_user_id = au.id
      ORDER BY c.created_at DESC
    `);
    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

router.post('/complaints/:id/resolve', async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { resolutionNotes, refundAmount, status } = req.body; // status: 'resolved', 'rejected', 'escalated'

    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    await db.run(
      `UPDATE complaints SET
        status = ?,
        resolution_notes = ?,
        resolved_by_admin_id = ?,
        resolved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status || 'resolved', resolutionNotes || 'Investigated and settled by Trust & Safety', req.user.id, complaintId]
    );

    // If refund is issued
    if (Number(refundAmount) > 0) {
      const payment = await db.get('SELECT * FROM payments WHERE booking_id = ?', [complaint.booking_id]);
      if (payment) {
        await db.run(
          `INSERT INTO refunds (id, booking_id, payment_id, amount, refund_type, reason, status, approved_by_admin_id)
           VALUES (?, ?, ?, ?, 'partial', ?, 'processed', ?)`,
          [
            'ref_' + uuidv4().replace(/-/g, '').substring(0, 10),
            complaint.booking_id, payment.id, Number(refundAmount),
            resolutionNotes || 'Dispute settlement', req.user.id
          ]
        );
      }
    }

    await logAdminAction({
      adminUserId: req.user.id,
      action: 'COMPLAINT_RESOLVED',
      entity: 'complaints',
      entityId: complaintId,
      reason: resolutionNotes
    });

    res.json({ message: 'Complaint resolved and saved.' });
  } catch (err) {
    console.error('[Complaint Resolve] Error:', err);
    res.status(500).json({ error: 'Failed to resolve complaint.' });
  }
});

// Review Moderation (Requirement 34)
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await db.query(`
      SELECT r.*, b.booking_number,
             ru.email as reviewer_email, re.email as reviewee_email
      FROM reviews r
      JOIN bookings b ON r.booking_id = b.id
      JOIN users ru ON r.reviewer_user_id = ru.id
      JOIN users re ON r.reviewee_user_id = re.id
      ORDER BY r.created_at DESC
    `);
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

router.post('/reviews/:id/moderate', async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { reason, isModerated } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'A moderation reason is mandatory for auditing.' });
    }

    await db.run(
      `UPDATE reviews SET
        is_moderated = ?,
        moderation_reason = ?,
        moderated_by_admin_id = ?
       WHERE id = ?`,
      [isModerated ? 1 : 0, reason, req.user.id, reviewId]
    );

    await logAdminAction({
      adminUserId: req.user.id,
      action: isModerated ? 'REVIEW_SUPPRESSED' : 'REVIEW_RESTORED',
      entity: 'reviews',
      entityId: reviewId,
      reason
    });

    res.json({ message: 'Review moderation updated.' });
  } catch (err) {
    console.error('[Review Moderation] Error:', err);
    res.status(500).json({ error: 'Failed to moderate review.' });
  }
});

// Audit Logs (Requirement 37)
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await db.query(`
      SELECT a.*, u.email as admin_email
      FROM audit_logs a
      LEFT JOIN users u ON a.admin_user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// Broadcast Announcement (Requirement 35)
router.post('/broadcast', async (req, res) => {
  try {
    const { role, title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    await broadcastNotification({
      role: role || null, // null = all users
      title,
      message,
      category: 'announcement'
    });

    await logAdminAction({
      adminUserId: req.user.id,
      action: 'BROADCAST_SENT',
      entity: 'notifications',
      entityId: 'global',
      reason: `Broadcast "${title}" sent to ${role || 'all users'}`
    });

    res.json({ message: 'Broadcast notification dispatched successfully.' });
  } catch (err) {
    console.error('[Admin Broadcast] Error:', err);
    res.status(500).json({ error: 'Failed to dispatch broadcast.' });
  }
});

module.exports = router;
