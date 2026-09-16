const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('admin'));

// Helper to convert objects array to CSV string
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(obj =>
    headers.map(header => {
      const val = obj[header] === null || obj[header] === undefined ? '' : String(obj[header]);
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// Export Bookings Report
router.get('/bookings', async (req, res) => {
  try {
    const data = await db.query(`
      SELECT b.booking_number, b.status, b.scheduled_date, b.scheduled_time,
             s.name as service, c.full_name as customer, w.full_name as worker,
             b.base_service_amount, b.total_labour_amount, b.total_parts_amount,
             b.tip_amount, b.commission_amount, b.final_amount, b.payment_method,
             b.payment_status, b.created_at
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN customers c ON b.customer_id = c.id
      LEFT JOIN workers w ON b.worker_id = w.id
      ORDER BY b.created_at DESC
    `);

    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sahaayak_bookings_report.csv"');
      return res.send(convertToCSV(data));
    }
    res.json({ report: data });
  } catch (err) {
    console.error('[Bookings Report] Error:', err);
    res.status(500).json({ error: 'Failed to generate bookings report.' });
  }
});

// Export Financial Revenue & Commission Report
router.get('/revenue', async (req, res) => {
  try {
    const data = await db.query(`
      SELECT p.payment_number, b.booking_number, s.name as service,
             p.service_labour_amount, p.parts_materials_amount, p.tip_amount,
             p.platform_commission_amount, p.total_amount, p.payment_method,
             p.payment_status, p.paid_at
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN services s ON b.service_id = s.id
      ORDER BY p.paid_at DESC
    `);

    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sahaayak_financial_report.csv"');
      return res.send(convertToCSV(data));
    }
    res.json({ report: data });
  } catch (err) {
    console.error('[Revenue Report] Error:', err);
    res.status(500).json({ error: 'Failed to generate revenue report.' });
  }
});

// Export Worker Performance Report
router.get('/workers', async (req, res) => {
  try {
    const data = await db.query(`
      SELECT w.full_name, w.city, w.verification_status, w.is_online,
             w.experience_years, w.avg_rating, w.total_reviews,
             w.total_completed_jobs, w.total_declined_jobs, w.total_cancelled_jobs,
             w.performance_score
      FROM workers w
      ORDER BY w.total_completed_jobs DESC
    `);

    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sahaayak_workers_performance.csv"');
      return res.send(convertToCSV(data));
    }
    res.json({ report: data });
  } catch (err) {
    console.error('[Workers Report] Error:', err);
    res.status(500).json({ error: 'Failed to generate worker report.' });
  }
});

module.exports = router;
