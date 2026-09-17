const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');
const { processPayment } = require('../services/paymentService');

// Process Pay After Service
router.post('/pay', authenticate, async (req, res) => {
  try {
    const { bookingId, paymentMethod, tipAmount, transactionReference } = req.body;

    if (!bookingId || !paymentMethod) {
      return res.status(400).json({ error: 'Booking ID and payment method (upi/card/cash) are required.' });
    }

    const booking = await db.get(
      `SELECT b.*, c.user_id as cust_user_id FROM bookings b
       JOIN customers c ON b.customer_id = c.id WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    // Ensure only the customer or admin can initiate payment
    if (req.user.role === 'customer' && req.user.id !== booking.cust_user_id) {
      return res.status(403).json({ error: 'Unauthorized to pay for this booking.' });
    }

    const result = await processPayment({
      bookingId,
      customerId: booking.customer_id,
      workerId: booking.worker_id,
      paymentMethod,
      tipAmount: Number(tipAmount) || 0,
      transactionReference
    });

    res.json({
      message: 'Payment processed successfully.',
      ...result
    });
  } catch (err) {
    console.error('[Payment Process] Error:', err);
    res.status(500).json({ error: err.message || 'Payment processing failed.' });
  }
});

const { generateInvoice } = require('../services/invoiceService');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

// Download PDF Invoice
router.get('/invoice/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Optional auth: check header or query param
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : req.query.token;
    if (token) {
      try {
        jwt.verify(token, JWT_SECRET);
      } catch (e) {
        // Invalid token
      }
    }

    let invoice = await db.get('SELECT * FROM invoices WHERE booking_id = ?', [bookingId]);

    // If invoice not yet generated or missing, generate it now
    if (!invoice) {
      try {
        const genResult = await generateInvoice({ bookingId });
        invoice = await db.get('SELECT * FROM invoices WHERE booking_id = ?', [bookingId]);
      } catch (genErr) {
        return res.status(404).json({ error: 'Invoice could not be generated for this booking.' });
      }
    }

    let invoiceData = {};
    try { invoiceData = JSON.parse(invoice.invoice_data_json); } catch (e) {}

    // Check if client wants raw JSON or file download
    if (req.query.format === 'json') {
      return res.json({ invoice, invoiceData });
    }

    let filePath = path.join(__dirname, '..', invoice.pdf_url);
    if (!fs.existsSync(filePath)) {
      // Re-generate if PDF file missing on disk
      await generateInvoice({ bookingId });
      invoice = await db.get('SELECT * FROM invoices WHERE booking_id = ?', [bookingId]);
      filePath = path.join(__dirname, '..', invoice.pdf_url);
    }

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
      return res.sendFile(filePath);
    } else {
      return res.json({ invoice, invoiceData });
    }
  } catch (err) {
    console.error('[Invoice GET] Error:', err);
    res.status(500).json({ error: 'Failed to retrieve invoice.' });
  }
});

module.exports = router;
