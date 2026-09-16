const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { UPLOAD_DIR } = require('../config');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Generates both digital record and downloadable PDF invoice
 */
async function generateInvoice({ bookingId, paymentId, paymentData }) {
  try {
    const booking = await db.get(
      `SELECT b.*, s.name as service_name, c.full_name as customer_name, u.email as customer_email,
              u.mobile as customer_mobile, w.full_name as worker_name, w.upi_id as worker_upi,
              a.house_no, a.street, a.area, a.city, a.pincode
       FROM bookings b
       JOIN services s ON b.service_id = s.id
       JOIN customers c ON b.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN workers w ON b.worker_id = w.id
       JOIN addresses a ON b.address_id = a.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking) throw new Error('Booking not found for invoice generation');

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const filename = `invoice_${invoiceNumber}.pdf`;
    const pdfPath = path.join(UPLOAD_DIR, filename);

    const invoiceData = {
      invoice_number: invoiceNumber,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      booking_number: booking.booking_number,
      service_name: booking.service_name,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_mobile: booking.customer_mobile,
      worker_name: booking.worker_name || 'Assigned Partner',
      address: `${booking.house_no}, ${booking.street}, ${booking.area}, ${booking.city} - ${booking.pincode}`,
      service_labour_amount: Number(paymentData.service_labour_amount || booking.total_labour_amount || 0),
      parts_amount: Number(paymentData.parts_materials_amount || booking.total_parts_amount || 0),
      tip_amount: Number(paymentData.tip_amount || booking.tip_amount || 0),
      platform_commission_amount: Number(paymentData.platform_commission_amount || booking.commission_amount || 0),
      total_amount: Number(paymentData.total_amount || booking.final_amount || 0),
      payment_method: (paymentData.payment_method || 'UPI').toUpperCase(),
      payment_status: 'PAID'
    };

    // Build PDF using PDFKit
    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Header Branding
      doc.fillColor('#0D9488').fontSize(24).font('Helvetica-Bold').text('SAHAAYAK', 50, 50);
      doc.fontSize(10).font('Helvetica').fillColor('#64748B').text('Trusted Services, Right at Your Doorstep', 50, 78);
      doc.text('support@sahaayak.in | www.sahaayak.in', 50, 92);

      doc.fillColor('#0F172A').fontSize(18).font('Helvetica-Bold').text('TAX INVOICE', 400, 50, { align: 'right' });
      doc.fontSize(10).font('Helvetica').fillColor('#475569')
        .text(`Invoice No: ${invoiceNumber}`, 300, 78, { align: 'right' })
        .text(`Date: ${invoiceData.date}`, 300, 92, { align: 'right' })
        .text(`Booking ID: ${booking.booking_number}`, 300, 106, { align: 'right' });

      doc.moveTo(50, 130).lineTo(550, 130).strokeColor('#E2E8F0').lineWidth(1.5).stroke();

      // Customer & Worker Info
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A').text('Billed To:', 50, 145);
      doc.font('Helvetica').fontSize(10).fillColor('#334155')
        .text(invoiceData.customer_name, 50, 162)
        .text(invoiceData.customer_email, 50, 176)
        .text(invoiceData.customer_mobile, 50, 190)
        .text(invoiceData.address, 50, 204, { width: 240 });

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F172A').text('Service Provider:', 330, 145);
      doc.font('Helvetica').fontSize(10).fillColor('#334155')
        .text(invoiceData.worker_name, 330, 162)
        .text(`Service: ${invoiceData.service_name}`, 330, 176)
        .text(`Scheduled: ${booking.scheduled_date} at ${booking.scheduled_time}`, 330, 190);

      // Line items table
      doc.moveTo(50, 260).lineTo(550, 260).strokeColor('#CBD5E1').stroke();
      doc.rect(50, 260, 500, 26).fill('#F8FAFC');

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F172A')
        .text('Description', 60, 268)
        .text('Type', 320, 268)
        .text('Amount (INR)', 450, 268, { align: 'right' });

      doc.moveTo(50, 286).lineTo(550, 286).strokeColor('#CBD5E1').stroke();

      let yPos = 296;
      // Item 1: Service / Labour
      doc.font('Helvetica').fillColor('#334155')
        .text(`${invoiceData.service_name} (Service & Labour)`, 60, yPos)
        .text('Service', 320, yPos)
        .text(`₹${invoiceData.service_labour_amount.toFixed(2)}`, 450, yPos, { align: 'right' });
      yPos += 22;

      // Item 2: Parts / Materials (if any)
      if (invoiceData.parts_amount > 0) {
        doc.text('Parts & Materials (Pass-through cost)', 60, yPos)
          .text('Materials', 320, yPos)
          .text(`₹${invoiceData.parts_amount.toFixed(2)}`, 450, yPos, { align: 'right' });
        yPos += 22;
      }

      // Item 3: Worker Tip (if any)
      if (invoiceData.tip_amount > 0) {
        doc.text('Worker Appreciation Tip (100% direct to partner)', 60, yPos)
          .text('Tip', 320, yPos)
          .text(`₹${invoiceData.tip_amount.toFixed(2)}`, 450, yPos, { align: 'right' });
        yPos += 22;
      }

      doc.moveTo(50, yPos + 5).lineTo(550, yPos + 5).strokeColor('#E2E8F0').stroke();
      yPos += 15;

      // Totals Box
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#0F172A')
        .text('Total Amount Paid:', 300, yPos)
        .text(`₹${invoiceData.total_amount.toFixed(2)}`, 450, yPos, { align: 'right' });

      yPos += 22;
      doc.font('Helvetica').fontSize(9).fillColor('#64748B')
        .text(`Payment Method: ${invoiceData.payment_method} | Status: CONFIRMED & SETTLED`, 300, yPos);

      // Fair policy note
      doc.rect(50, 480, 500, 50).fillAndStroke('#F0FDF4', '#86EFAC');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#166534')
        .text('Sahaayak Fair Marketplace Guarantee', 60, 490);
      doc.font('Helvetica').fontSize(8.5).fillColor('#15803D')
        .text('Zero platform commission is charged on small service charges (<= ₹599) and 100% of tips are transferred directly to your worker. Thank you for empowering local gig professionals.', 60, 504, { width: 480 });

      // Footer
      doc.fontSize(8).fillColor('#94A3B8')
        .text('This is a computer-generated invoice and requires no physical signature.', 50, 750, { align: 'center' });

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    // Record in DB
    const invoiceId = 'inv_' + uuidv4().replace(/-/g, '').substring(0, 10);
    await db.run(
      `INSERT INTO invoices (id, invoice_number, booking_id, payment_id, pdf_url, invoice_data_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [invoiceId, invoiceNumber, bookingId, paymentId, `/uploads/${filename}`, JSON.stringify(invoiceData)]
    );

    return {
      invoiceId,
      invoiceNumber,
      pdfUrl: `/uploads/${filename}`,
      invoiceData
    };
  } catch (err) {
    console.error('[InvoiceService] Error generating invoice:', err.message);
    throw err;
  }
}

module.exports = {
  generateInvoice
};
