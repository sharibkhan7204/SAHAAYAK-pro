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
 * Formats a number as Indian Currency string e.g. "1,999.00"
 */
function formatCurrency(num) {
  const n = Number(num) || 0;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Generates both digital record and downloadable PDF invoice
 */
async function generateInvoice({ bookingId, paymentId, paymentData }) {
  try {
    const booking = await db.get(
      `SELECT b.*, s.name as service_name, s.pricing_model,
              c.full_name as customer_name, u.email as customer_email,
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

    // If paymentData is not provided, fetch from payments table
    let pData = paymentData;
    if (!pData) {
      const p = await db.get('SELECT * FROM payments WHERE booking_id = ? ORDER BY paid_at DESC LIMIT 1', [bookingId]);
      pData = p || {};
    }

    // Check for any approved additional charges
    let additionalCharges = [];
    try {
      additionalCharges = await db.query(
        `SELECT * FROM additional_charge_requests WHERE booking_id = ? AND status = 'approved'`,
        [bookingId]
      );
    } catch (e) {
      additionalCharges = [];
    }

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const filename = `invoice_${invoiceNumber}.pdf`;
    const pdfPath = path.join(UPLOAD_DIR, filename);

    const labourAmount = Number(pData.service_labour_amount || booking.total_labour_amount || booking.base_service_amount || 0);
    const partsAmount = Number(pData.parts_materials_amount || booking.total_parts_amount || 0);
    const tipAmount = Number(pData.tip_amount || booking.tip_amount || 0);
    const commissionAmount = Number(pData.platform_commission_amount || booking.commission_amount || 0);
    const totalAmount = Number(pData.total_amount || booking.final_amount || (labourAmount + partsAmount + tipAmount));
    const paymentMethod = (pData.payment_method || booking.payment_method || 'CASH').toUpperCase();
    const txnRef = pData.transaction_reference || `${paymentMethod}_TXN_${booking.booking_number}`;

    const invoiceData = {
      invoice_number: invoiceNumber,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      booking_number: booking.booking_number,
      service_name: booking.service_name,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_mobile: booking.customer_mobile,
      worker_name: booking.worker_name || 'Verified Service Partner',
      worker_id: booking.worker_id || 'PRO-PARTNER',
      address: `${booking.house_no}, ${booking.street}, ${booking.area}, ${booking.city} - ${booking.pincode}`,
      service_labour_amount: labourAmount,
      parts_amount: partsAmount,
      tip_amount: tipAmount,
      platform_commission_amount: commissionAmount,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      transaction_reference: txnRef,
      payment_status: 'PAID & SETTLED'
    };

    // Build PDF using PDFKit
    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // --- 1. HEADER SECTION ---
      // Logo container with dark backdrop for clear contrast
      const logoPath = path.join(UPLOAD_DIR, 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.roundedRect(40, 36, 52, 52, 10).fill('#090D16');
        doc.image(logoPath, 44, 40, { width: 44, height: 44 });
      }

      // Company Info
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#0F172A').text('SAHAAYAK SERVICES', 102, 38);
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569')
        .text('Doorstep Services Private Limited • India', 102, 56)
        .text('HSR Layout, Sector 2, Bengaluru, Karnataka - 560102', 102, 68)
        .text('GSTIN: 29AAACS2026L1Z4 | CIN: U74999KA2026PTC184920', 102, 80);

      // Invoice Title & Meta Badge (Right-aligned)
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#0D9488').text('TAX INVOICE', 370, 38, { align: 'right' });
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A')
        .text(`Invoice No: `, 360, 56, { align: 'right' })
        .text(`Date: `, 360, 68, { align: 'right' })
        .text(`Booking Ref: `, 360, 80, { align: 'right' });

      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text(`${invoiceNumber}`, 470, 56, { align: 'right' })
        .text(`${invoiceData.date}`, 470, 68, { align: 'right' })
        .text(`${booking.booking_number}`, 470, 80, { align: 'right' });

      // Divider Line
      doc.moveTo(40, 98).lineTo(555, 98).strokeColor('#CBD5E1').lineWidth(1).stroke();

      // --- 2. BILLED TO & SERVICE PARTNER DETAILS ---
      const infoBoxTop = 108;
      const infoBoxHeight = 85;

      // Customer Box (Left)
      doc.roundedRect(40, infoBoxTop, 250, infoBoxHeight, 8).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0D9488').text('BILLED TO (CUSTOMER)', 50, infoBoxTop + 8);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A').text(invoiceData.customer_name, 50, infoBoxTop + 22);
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569')
        .text(`Phone: ${invoiceData.customer_mobile}`, 50, infoBoxTop + 36)
        .text(`Email: ${invoiceData.customer_email}`, 50, infoBoxTop + 48)
        .text(`Address: ${invoiceData.address}`, 50, infoBoxTop + 60, { width: 230, height: 26, ellipsis: true });

      // Service Provider Box (Right)
      doc.roundedRect(305, infoBoxTop, 250, infoBoxHeight, 8).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0D9488').text('SERVICE FULFILLMENT DETAILS', 315, infoBoxTop + 8);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A').text(invoiceData.worker_name, 315, infoBoxTop + 22);
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569')
        .text(`Service: ${invoiceData.service_name}`, 315, infoBoxTop + 36)
        .text(`Partner ID: ${invoiceData.worker_id} (Aadhaar & Police Verified)`, 315, infoBoxTop + 48)
        .text(`Schedule: ${booking.scheduled_date} (${booking.scheduled_time})`, 315, infoBoxTop + 60);

      // --- 3. CHARGES & ITEMIZED LABOUR COST TABLE ---
      const tableTop = 205;
      doc.roundedRect(40, tableTop, 515, 24, 6).fill('#0F172A');

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF')
        .text('#', 48, tableTop + 7)
        .text('Item / Service Description', 68, tableTop + 7)
        .text('Category', 310, tableTop + 7)
        .text('Rate', 410, tableTop + 7, { align: 'right' })
        .text('Amount (INR)', 470, tableTop + 7, { align: 'right' });

      let currentY = tableTop + 30;
      let itemIndex = 1;

      // Line 1: Primary Service Labour
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B')
        .text(`${itemIndex}.`, 48, currentY)
        .text(`${invoiceData.service_name}`, 68, currentY);
      doc.font('Helvetica').fontSize(8).fillColor('#64748B')
        .text('Standard Doorstep Service & Labour Charge', 68, currentY + 11);
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155')
        .text('Service Labour', 310, currentY + 4)
        .text(`Rs. ${formatCurrency(labourAmount)}`, 410, currentY + 4, { align: 'right' })
        .text(`Rs. ${formatCurrency(labourAmount)}`, 470, currentY + 4, { align: 'right' });

      currentY += 28;
      doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#F1F5F9').lineWidth(1).stroke();
      currentY += 6;

      // Line 2: Extra Approved Labour / Additional charges (if any)
      if (additionalCharges && additionalCharges.length > 0) {
        additionalCharges.forEach(ch => {
          if (ch.labour_amount > 0) {
            itemIndex++;
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B')
              .text(`${itemIndex}.`, 48, currentY)
              .text(`Additional Approved Work: ${ch.description}`, 68, currentY, { width: 230 });
            doc.font('Helvetica').fontSize(8.5).fillColor('#334155')
              .text('Extra Labour', 310, currentY)
              .text(`Rs. ${formatCurrency(ch.labour_amount)}`, 410, currentY, { align: 'right' })
              .text(`Rs. ${formatCurrency(ch.labour_amount)}`, 470, currentY, { align: 'right' });

            currentY += 22;
            doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#F1F5F9').lineWidth(1).stroke();
            currentY += 6;
          }
        });
      }

      // Line 3: Parts & Materials (if any)
      if (partsAmount > 0) {
        itemIndex++;
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B')
          .text(`${itemIndex}.`, 48, currentY)
          .text('Replacement Parts & Consumables', 68, currentY);
        doc.font('Helvetica').fontSize(8).fillColor('#64748B')
          .text('Pass-through cost for hardware/materials (0% platform fee)', 68, currentY + 11);
        doc.font('Helvetica').fontSize(8.5).fillColor('#334155')
          .text('Materials', 310, currentY + 4)
          .text(`Rs. ${formatCurrency(partsAmount)}`, 410, currentY + 4, { align: 'right' })
          .text(`Rs. ${formatCurrency(partsAmount)}`, 470, currentY + 4, { align: 'right' });

        currentY += 28;
        doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#F1F5F9').lineWidth(1).stroke();
        currentY += 6;
      }

      // Line 4: Safety & Sanitization Kit
      itemIndex++;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B')
        .text(`${itemIndex}.`, 48, currentY)
        .text('Safety, Hygiene & Tool Coverage', 68, currentY);
      doc.font('Helvetica').fontSize(8).fillColor('#64748B')
        .text('Standard safety protocol, sanitization & specialized tools', 68, currentY + 11);
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155')
        .text('Included', 310, currentY + 4)
        .text('FREE', 410, currentY + 4, { align: 'right' })
        .text('Rs. 0.00', 470, currentY + 4, { align: 'right' });

      currentY += 28;
      doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#F1F5F9').lineWidth(1).stroke();
      currentY += 6;

      // Line 5: Worker Tip (if any)
      if (tipAmount > 0) {
        itemIndex++;
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B')
          .text(`${itemIndex}.`, 48, currentY)
          .text('Service Partner Gratuity / Tip', 68, currentY);
        doc.font('Helvetica').fontSize(8).fillColor('#64748B')
          .text('100% transferred directly to your service partner', 68, currentY + 11);
        doc.font('Helvetica').fontSize(8.5).fillColor('#334155')
          .text('Direct Tip', 310, currentY + 4)
          .text(`Rs. ${formatCurrency(tipAmount)}`, 410, currentY + 4, { align: 'right' })
          .text(`Rs. ${formatCurrency(tipAmount)}`, 470, currentY + 4, { align: 'right' });

        currentY += 28;
        doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#F1F5F9').lineWidth(1).stroke();
        currentY += 6;
      }

      // --- 4. SUMMARY & TOTALS SECTION ---
      const summaryBoxTop = Math.max(currentY + 10, 420);
      
      // Left side: Payment Info Box
      doc.roundedRect(40, summaryBoxTop, 250, 95, 8).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0D9488').text('PAYMENT DETAILS', 50, summaryBoxTop + 8);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A')
        .text('Payment Status: ', 50, summaryBoxTop + 24)
        .text('Payment Method: ', 50, summaryBoxTop + 38)
        .text('Transaction Ref: ', 50, summaryBoxTop + 52)
        .text('Paid At: ', 50, summaryBoxTop + 66);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#16A34A')
        .text('PAID & CONFIRMED', 135, summaryBoxTop + 24);
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155')
        .text(invoiceData.payment_method, 135, summaryBoxTop + 38)
        .text(invoiceData.transaction_reference, 135, summaryBoxTop + 52, { width: 145, ellipsis: true })
        .text(`${invoiceData.date} ${invoiceData.time}`, 135, summaryBoxTop + 66);

      // Right side: Totals Calculation Box
      doc.roundedRect(305, summaryBoxTop, 250, 95, 8).fillAndStroke('#F8FAFC', '#E2E8F0');
      
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569')
        .text('Total Labour Charges:', 315, summaryBoxTop + 10)
        .text(`Rs. ${formatCurrency(labourAmount)}`, 470, summaryBoxTop + 10, { align: 'right' })
        
        .text('Parts & Materials:', 315, summaryBoxTop + 24)
        .text(`Rs. ${formatCurrency(partsAmount)}`, 470, summaryBoxTop + 24, { align: 'right' })
        
        .text('Partner Appreciation Tip:', 315, summaryBoxTop + 38)
        .text(`Rs. ${formatCurrency(tipAmount)}`, 470, summaryBoxTop + 38, { align: 'right' })
        
        .text('Taxes & GST (Included):', 315, summaryBoxTop + 52)
        .text('Rs. 0.00', 470, summaryBoxTop + 52, { align: 'right' });

      // Total Paid Highlight Bar
      doc.roundedRect(305, summaryBoxTop + 68, 250, 27, 6).fill('#0F172A');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF')
        .text('TOTAL AMOUNT PAID:', 315, summaryBoxTop + 76)
        .text(`Rs. ${formatCurrency(totalAmount)}`, 470, summaryBoxTop + 76, { align: 'right' });

      // --- 5. FAIR GIG MARKETPLACE POLICY GUARANTEE ---
      const policyTop = summaryBoxTop + 110;
      doc.roundedRect(40, policyTop, 515, 48, 8).fillAndStroke('#F0FDF4', '#86EFAC');
      
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#166534')
        .text('Sahaayak Fair Marketplace & Pay-After-Service Guarantee', 52, policyTop + 8);
      
      const commText = commissionAmount === 0
        ? `Zero Platform Commission (Rs. 0.00 fee) was deducted for this booking under our Small Jobs Protection policy (<= Rs. 599). 100% of labour, materials, and tips were disbursed directly to ${invoiceData.worker_name}.`
        : `Transparent commission of Rs. ${formatCurrency(commissionAmount)} applied on labour only. 100% of material costs and tips were disbursed directly to ${invoiceData.worker_name}.`;

      doc.font('Helvetica').fontSize(8).fillColor('#15803D')
        .text(commText, 52, policyTop + 22, { width: 495, lineGap: 2 });

      // --- 6. FOOTER ---
      doc.moveTo(40, 720).lineTo(555, 720).strokeColor('#E2E8F0').lineWidth(1).stroke();
      
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748B')
        .text('Sahaayak Doorstep Services Private Limited', 40, 728)
        .font('Helvetica').fontSize(7.5).fillColor('#94A3B8')
        .text('Helpline: 1800-202-6089 | Support: support@sahaayak.in | Bengaluru, Karnataka', 40, 740);

      doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8')
        .text('Computer-generated electronic tax invoice. No signature required.', 300, 735, { align: 'right' });

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    // Record or update in DB
    const existing = await db.get('SELECT id FROM invoices WHERE booking_id = ?', [bookingId]);
    if (existing) {
      await db.run(
        `UPDATE invoices SET
          invoice_number = ?,
          pdf_url = ?,
          invoice_data_json = ?
         WHERE id = ?`,
        [invoiceNumber, `/uploads/${filename}`, JSON.stringify(invoiceData), existing.id]
      );
    } else {
      const invoiceId = 'inv_' + uuidv4().replace(/-/g, '').substring(0, 10);
      await db.run(
        `INSERT INTO invoices (id, invoice_number, booking_id, payment_id, pdf_url, invoice_data_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [invoiceId, invoiceNumber, bookingId, paymentId || null, `/uploads/${filename}`, JSON.stringify(invoiceData)]
      );
    }

    return {
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
