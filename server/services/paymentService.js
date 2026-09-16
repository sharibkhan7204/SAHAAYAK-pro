const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { calculateCommission } = require('./commissionService');
const { generateInvoice } = require('./invoiceService');
const { createNotification } = require('./notificationService');

let ioInstance = null;
function setSocketIo(io) {
  ioInstance = io;
}

/**
 * Process Pay After Service (UPI / Card / Cash)
 */
async function processPayment({ bookingId, customerId, workerId, paymentMethod, tipAmount = 0, transactionReference = null }) {
  const booking = await db.get(
    `SELECT b.*, s.name as service_name, c.user_id as cust_user_id, w.user_id as wrk_user_id
     FROM bookings b
     JOIN services s ON b.service_id = s.id
     JOIN customers c ON b.customer_id = c.id
     LEFT JOIN workers w ON b.worker_id = w.id
     WHERE b.id = ?`,
    [bookingId]
  );

  if (!booking) throw new Error('Booking not found');
  if (booking.payment_status === 'completed') {
    throw new Error('Payment has already been processed for this booking');
  }

  const labourAmount = Number(booking.total_labour_amount || booking.base_service_amount || 0);
  const partsAmount = Number(booking.total_parts_amount || 0);
  const tip = Math.max(0, Number(tipAmount) || 0);

  // Apply fair commission engine
  const commissionCalc = await calculateCommission(labourAmount, partsAmount, tip);
  const totalAmount = Math.round((labourAmount + partsAmount + tip) * 100) / 100;

  const paymentId = 'pay_' + uuidv4().replace(/-/g, '').substring(0, 10);
  const paymentNumber = 'PAY-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
  const txRef = transactionReference || `${paymentMethod.toUpperCase()}_TXN_${Date.now()}_DEMO`;

  // Database atomic transaction
  await db.transaction(async ({ run }) => {
    // 1. Insert Payment
    await run(
      `INSERT INTO payments (
        id, payment_number, booking_id, customer_id, worker_id,
        service_labour_amount, parts_materials_amount, tip_amount,
        platform_commission_amount, total_amount, payment_method,
        payment_status, transaction_reference, paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        paymentId, paymentNumber, bookingId, customerId, workerId,
        labourAmount, partsAmount, tip, commissionCalc.commissionAmount,
        totalAmount, paymentMethod, 'completed', txRef
      ]
    );

    // 2. Insert Transaction
    await run(
      `INSERT INTO payment_transactions (id, payment_id, transaction_type, amount, status, gateway, gateway_response_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'tx_' + uuidv4().replace(/-/g, '').substring(0, 10),
        paymentId, 'payment', totalAmount, 'success',
        paymentMethod === 'cash' ? 'cash_settlement' : 'demo_razorpay',
        JSON.stringify({ ref: txRef, verified: true, mode: paymentMethod })
      ]
    );

    // 3. Record Commission
    await run(
      `INSERT INTO commissions (
        id, booking_id, payment_id, worker_id, labour_amount,
        commission_rate, commission_amount, rule_applied
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'comm_' + uuidv4().replace(/-/g, '').substring(0, 10),
        bookingId, paymentId, workerId, labourAmount,
        commissionCalc.commissionRate, commissionCalc.commissionAmount, commissionCalc.ruleApplied
      ]
    );

    // 4. Record Tip (if any)
    if (tip > 0) {
      await run(
        `INSERT INTO tips (id, booking_id, payment_id, customer_id, worker_id, amount)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['tip_' + uuidv4().replace(/-/g, '').substring(0, 10), bookingId, paymentId, customerId, workerId, tip]
      );
    }

    // 5. Update Booking status to payment_completed and then booking_closed
    await run(
      `UPDATE bookings SET
        status = 'booking_closed',
        payment_method = ?,
        payment_status = 'completed',
        tip_amount = ?,
        commission_amount = ?,
        final_amount = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [paymentMethod, tip, commissionCalc.commissionAmount, totalAmount, bookingId]
    );

    // 6. Record Status History
    await run(
      `INSERT INTO booking_status_history (id, booking_id, from_status, to_status, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'bsh_' + uuidv4().replace(/-/g, '').substring(0, 10),
        bookingId, booking.status, 'booking_closed',
        `Payment of ₹${totalAmount} processed via ${paymentMethod.toUpperCase()}`
      ]
    );

    // 7. Increment worker completed jobs & update performance
    if (workerId) {
      await run(
        `UPDATE workers SET
          total_completed_jobs = total_completed_jobs + 1,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [workerId]
      );
    }
  });

  // 8. Generate PDF & Digital Invoice
  const invoiceResult = await generateInvoice({
    bookingId,
    paymentId,
    paymentData: {
      service_labour_amount: labourAmount,
      parts_materials_amount: partsAmount,
      tip_amount: tip,
      platform_commission_amount: commissionCalc.commissionAmount,
      total_amount: totalAmount,
      payment_method: paymentMethod
    }
  });

  // 9. Notifications
  await createNotification({
    userId: booking.cust_user_id,
    title: 'Payment Successful & Invoice Ready',
    message: `Payment of ₹${totalAmount} for ${booking.service_name} completed. You can now download your official invoice.`,
    type: 'success',
    category: 'payment',
    relatedBookingId: bookingId
  });

  if (booking.wrk_user_id) {
    const tipMsg = tip > 0 ? ` (Includes ₹${tip} tip!)` : '';
    await createNotification({
      userId: booking.wrk_user_id,
      title: 'Earnings Credited',
      message: `Received ₹${commissionCalc.workerNetEarnings.toFixed(2)} for ${booking.service_name}${tipMsg}. Platform fee: ₹${commissionCalc.commissionAmount}.`,
      type: 'success',
      category: 'payment',
      relatedBookingId: bookingId
    });
  }

  // 10. Real-time emit
  if (ioInstance) {
    ioInstance.to(`booking_${bookingId}`).emit('booking:payment_completed', {
      bookingId,
      totalAmount,
      invoiceNumber: invoiceResult.invoiceNumber,
      pdfUrl: invoiceResult.pdfUrl
    });
  }

  return {
    success: true,
    paymentId,
    paymentNumber,
    totalAmount,
    workerNetEarnings: commissionCalc.workerNetEarnings,
    commissionAmount: commissionCalc.commissionAmount,
    ruleApplied: commissionCalc.ruleApplied,
    invoice: invoiceResult
  };
}

module.exports = {
  setSocketIo,
  processPayment
};
