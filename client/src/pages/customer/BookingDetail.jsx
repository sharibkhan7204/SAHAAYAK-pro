import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import ChatDrawer from '../../components/chat/ChatDrawer';
import confetti from 'canvas-confetti';
import {
  Clock, MapPin, CheckCircle2, AlertCircle, Phone, MessageSquare,
  ShieldCheck, IndianRupee, FileText, Download, Star, AlertTriangle, ArrowLeft, Check, X
} from 'lucide-react';

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { socket, joinBookingRoom } = useSocket();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  // Pay After Service modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi'); // upi, card, cash
  const [selectedTip, setSelectedTip] = useState(50); // 20, 50, 100, custom, 0
  const [customTip, setCustomTip] = useState('');
  const [paying, setPaying] = useState(false);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewText, setReviewText] = useState('');

  // Complaint modal state
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [complaintCategory, setComplaintCategory] = useState('Poor service');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const loadBooking = async () => {
    try {
      const res = await api.get(`/bookings/${id}`);
      setData(res.data);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to load booking details.', 'error');
      navigate('/customer/bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
    joinBookingRoom(id);

    if (socket) {
      const handleStatusChange = () => {
        loadBooking();
      };
      socket.on('booking:status_change', handleStatusChange);
      socket.on('booking:additional_charge_requested', handleStatusChange);
      socket.on('booking:payment_completed', handleStatusChange);

      return () => {
        socket.off('booking:status_change', handleStatusChange);
        socket.off('booking:additional_charge_requested', handleStatusChange);
        socket.off('booking:payment_completed', handleStatusChange);
      };
    }
  }, [id, socket]);

  // Additional charge approval / rejection
  const handleRespondAdditionalCharge = async (chargeId, response) => {
    try {
      await api.post(`/bookings/${id}/respond-additional-charge`, {
        chargeId,
        response
      });
      addToast(`Additional charge has been ${response}!`, response === 'approved' ? 'success' : 'info');
      loadBooking();
    } catch (err) {
      addToast('Failed to record response: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  // Pay after service execution
  const handleExecutePayment = async () => {
    try {
      setPaying(true);
      const tip = selectedTip === 'custom' ? Number(customTip) : Number(selectedTip);

      const res = await api.post('/payments/pay', {
        bookingId: id,
        paymentMethod,
        tipAmount: tip || 0
      });

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      addToast('Payment complete! Invoice generated.', 'success');
      setPayModalOpen(false);
      loadBooking();
    } catch (err) {
      addToast(err.response?.data?.error || 'Payment failed.', 'error');
    } finally {
      setPaying(false);
    }
  };

  // Submit review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reviews', {
        bookingId: id,
        overallRating: ratingVal,
        comment: reviewText
      });
      addToast('Thank you for rating your service partner!', 'success');
      setReviewModalOpen(false);
      loadBooking();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to submit review.', 'error');
    }
  };

  // Submit dispute complaint
  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    try {
      await api.post('/complaints', {
        bookingId: id,
        category: complaintCategory,
        description: complaintDesc,
        priority: 'high'
      });
      addToast('Dispute reported. Sahaayak Trust & Safety will investigate promptly.', 'warning');
      setComplaintModalOpen(false);
      loadBooking();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to file complaint.', 'error');
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      setDownloadingInvoice(true);
      const res = await api.get(`/payments/invoice/${booking.id}`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoice?.invoice_number || 'Sahaayak_Tax_Invoice'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('Invoice PDF downloaded successfully!', 'success');
    } catch (err) {
      console.warn('Invoice blob download failed, trying direct link...', err);
      if (invoice?.pdf_url) {
        window.open(`http://localhost:5000${invoice.pdf_url}`, '_blank');
      } else {
        addToast('Failed to download invoice. Please try again.', 'error');
      }
    } finally {
      setDownloadingInvoice(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { booking, additionalCharges, statusHistory, invoice, hasReviewed } = data;

  const timelineSteps = [
    { key: 'finding_worker', label: 'Finding Partner' },
    { key: 'worker_assigned', label: 'Partner Assigned' },
    { key: 'worker_accepted', label: 'Accepted' },
    { key: 'worker_on_the_way', label: 'On The Way' },
    { key: 'worker_arrived', label: 'Arrived' },
    { key: 'service_started', label: 'In Service' },
    { key: 'service_completed', label: 'Completed' },
    { key: 'booking_closed', label: 'Settled & Paid' }
  ];

  const currentStepIdx = timelineSteps.findIndex((s) => s.key === booking.status);
  const effectiveStepIdx = currentStepIdx === -1 ? 0 : currentStepIdx;

  const isCompletedUnpaid = ['service_completed', 'customer_confirmation'].includes(booking.status);
  const isFullySettled = ['payment_completed', 'booking_closed'].includes(booking.status);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Back button & Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/customer/bookings"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display text-slate-900 tracking-tight">
                {booking.service_name}
              </h1>
              <span className="text-xs bg-brand-100 text-brand-800 font-bold px-2.5 py-0.5 rounded-full">
                #{booking.booking_number}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Scheduled: {booking.scheduled_date} at {booking.scheduled_time}
            </p>
          </div>
        </div>

        {/* Action button header */}
        <div className="flex items-center gap-2">
          {isCompletedUnpaid && (
            <button
              onClick={() => setPayModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 hover:scale-105 transition-all animate-pulse"
            >
              Pay After Service (₹{booking.final_amount})
            </button>
          )}

          {isFullySettled && invoice && (
            <button
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-brand-600" />
              <span>{downloadingInvoice ? 'Downloading...' : 'Download Invoice (PDF)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Timeline Stepper / Booking Journey */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-600 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Booking Journey
            </h3>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
            Step {effectiveStepIdx + 1} of {timelineSteps.length}: {timelineSteps[effectiveStepIdx]?.label}
          </span>
        </div>

        <div className="min-w-[700px] px-2 pt-2 pb-6">
          <div className="flex items-center w-full">
            {timelineSteps.map((st, i) => {
              const isDone = i <= effectiveStepIdx;
              const isCurrent = i === effectiveStepIdx;
              const isLast = i === timelineSteps.length - 1;

              return (
                <React.Fragment key={st.key}>
                  {/* Step node */}
                  <div className="relative flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 z-10 ${
                        isCurrent
                          ? 'bg-brand-600 text-white ring-4 ring-brand-100 scale-110 shadow-md shadow-brand-600/20'
                          : isDone
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}
                    >
                      {isDone && !isCurrent ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>

                    <span
                      className={`absolute top-10 text-[11px] font-semibold whitespace-nowrap text-center transition-colors ${
                        isCurrent
                          ? 'text-brand-700 font-bold'
                          : isDone
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {st.label}
                    </span>
                  </div>

                  {/* Connecting Line Segment */}
                  {!isLast && (
                    <div className="flex-1 h-1 mx-1.5 rounded-full overflow-hidden bg-slate-100 relative">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          i < effectiveStepIdx
                            ? 'w-full bg-brand-600'
                            : i === effectiveStepIdx
                            ? 'w-1/2 bg-brand-500 animate-pulse'
                            : 'w-0'
                        }`}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending Additional Charge Alert Banner (Requirement 14) */}
      {additionalCharges?.some((c) => c.status === 'pending') && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Additional Work Requested by Partner</span>
          </div>

          {additionalCharges.filter((c) => c.status === 'pending').map((charge) => (
            <div key={charge.id} className="bg-white p-4 rounded-2xl border border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-slate-900 text-sm">{charge.description}</div>
                <div className="text-slate-600 flex items-center gap-3">
                  <span>Labour: <strong>₹{charge.labour_amount}</strong></span>
                  <span>•</span>
                  <span>Parts/Materials: <strong>₹{charge.parts_amount}</strong></span>
                  <span>•</span>
                  <span className="text-brand-700 font-bold">Total: ₹{charge.labour_amount + charge.parts_amount}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRespondAdditionalCharge(charge.id, 'rejected')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleRespondAdditionalCharge(charge.id, 'approved')}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm"
                >
                  Approve & Proceed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid: Partner Card + Service Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Service info & Photos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Specs Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Service Specifications
            </h2>

            <div className="grid grid-cols-2 gap-3 text-slate-700">
              {Object.entries(booking.dynamicFields || {}).map(([key, val]) => (
                <div key={key} className="bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">{key.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-slate-800">{String(val)}</span>
                </div>
              ))}
            </div>

            {booking.customer_notes && (
              <div className="pt-2 text-slate-600">
                <span className="font-bold text-slate-800 block">Technician Instructions:</span>
                <p className="italic">{booking.customer_notes}</p>
              </div>
            )}
          </div>

          {/* Photo Verification Proofs (Requirement 13 & 28) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Service Photo Proofs (Before & After)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Photos */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 block">Initial Inspection / Before:</span>
                {booking.beforePhotos?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {booking.beforePhotos.map((url, i) => (
                      <img key={i} src={url} alt="Before" className="h-28 w-full object-cover rounded-xl border" />
                    ))}
                  </div>
                ) : (
                  <div className="h-24 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-[11px]">
                    No before photos uploaded yet
                  </div>
                )}
              </div>

              {/* After Photos */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 block">Completion Proof / After:</span>
                {booking.afterPhotos?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {booking.afterPhotos.map((url, i) => (
                      <img key={i} src={url} alt="After" className="h-28 w-full object-cover rounded-xl border" />
                    ))}
                  </div>
                ) : (
                  <div className="h-24 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-[11px]">
                    Photos uploaded upon completion
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Partner Card & Pricing Breakdown */}
        <div className="space-y-6">
          {/* Partner Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Assigned Service Partner
            </h2>

            {booking.worker_name ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-base">
                    {booking.worker_name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">{booking.worker_name}</div>
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{booking.worker_rating || '5.0'}</span>
                      <span className="text-slate-400 font-normal">({booking.worker_reviews || 12} reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">Live Distance:</span>
                  <span className="font-bold text-brand-700">~{booking.approximateDistanceKm || 1.8} km away</span>
                </div>

                {/* Communication buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setChatOpen(true)}
                    className="flex-1 py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Live Chat</span>
                  </button>
                  <a
                    href={`tel:${booking.worker_mobile || '+919999999999'}`}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Proxy</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2 text-slate-400">
                <Clock className="w-8 h-8 mx-auto text-amber-500 animate-spin" />
                <p>Matching nearest qualified partner...</p>
              </div>
            )}
          </div>

          {/* Pricing Ledger */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Payment & Invoice Breakdown
            </h2>

            <div className="flex justify-between text-slate-600">
              <span>Service & Labour:</span>
              <span>₹{booking.total_labour_amount || booking.base_service_amount}</span>
            </div>

            {booking.total_parts_amount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Parts & Materials (Pass-through):</span>
                <span>₹{booking.total_parts_amount}</span>
              </div>
            )}

            {booking.tip_amount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Partner Tip (100% Direct):</span>
                <span>₹{booking.tip_amount}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-100 pt-2">
              <span>Final Amount:</span>
              <span className="text-brand-700 text-base">₹{booking.final_amount || booking.base_service_amount}</span>
            </div>

            <div className="pt-2">
              <span className={`w-full block text-center py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${
                isFullySettled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isFullySettled ? '✓ Paid & Settled' : 'Pay After Service'}
              </span>
            </div>
          </div>

          {/* Dispute & Review Buttons */}
          <div className="space-y-2 pt-2">
            {isFullySettled && !hasReviewed && (
              <button
                onClick={() => setReviewModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors shadow-sm"
              >
                ★ Rate & Review Worker
              </button>
            )}

            <button
              onClick={() => setComplaintModalOpen(true)}
              className="w-full py-2 text-center text-slate-400 hover:text-rose-600 text-xs font-semibold"
            >
              Report an Issue / Dispute
            </button>
          </div>
        </div>
      </div>

      {/* PAY AFTER SERVICE MODAL */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-xs text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Pay After Service</h3>
                <p className="text-[11px] text-slate-500">Service completed. No advance was charged.</p>
              </div>
              <button onClick={() => setPayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'upi', label: 'UPI (QR / App)' },
                  { id: 'card', label: 'Card (Demo)' },
                  { id: 'cash', label: 'Cash Collection' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-3 px-2 rounded-2xl border text-center font-bold text-xs transition-all ${
                      paymentMethod === m.id
                        ? 'border-brand-600 bg-brand-50 text-brand-800 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tip Selector (Requirement 16) */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">Add a Tip for Partner</span>
                <span className="text-[10px] text-emerald-700 font-semibold">100% goes to partner</span>
              </div>
              <div className="flex items-center gap-2">
                {[0, 20, 50, 100].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTip(t)}
                    className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      selectedTip === t
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {t === 0 ? 'No Tip' : `₹${t}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Payable Summary */}
            <div className="bg-brand-50/70 p-4 rounded-2xl border border-brand-200/80 flex justify-between items-center">
              <div>
                <span className="text-slate-600 block text-[11px]">Total Payable</span>
                <span className="text-xl font-bold text-brand-900">
                  ₹{Number(booking.final_amount) + Number(selectedTip || 0)}
                </span>
              </div>
              <span className="text-[11px] text-brand-700 font-semibold">Includes GST & digital receipt</span>
            </div>

            <button
              onClick={handleExecutePayment}
              disabled={paying}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              {paying ? 'Processing Payment...' : `Complete Payment of ₹${Number(booking.final_amount) + Number(selectedTip || 0)}`}
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Rate Your Service Partner</h3>
              <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="space-y-2 text-center py-2">
                <span className="text-slate-500 font-semibold block">Overall Rating</span>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRatingVal(s)}
                      className="p-1 text-2xl transition-transform hover:scale-125"
                    >
                      <Star className={`w-7 h-7 ${s <= ratingVal ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Written Review</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Share details of your experience..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-brand-600 text-white font-bold shadow-md hover:bg-brand-700 transition-colors"
              >
                Submit Official Review
              </button>
            </form>
          </div>
        </div>
      )}

      {/* COMPLAINT MODAL */}
      {complaintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">File a Service Dispute</h3>
              <button onClick={() => setComplaintModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Issue Category</label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="Poor service">Poor service quality</option>
                  <option value="Worker didn't arrive">Worker did not arrive</option>
                  <option value="Late arrival">Late arrival</option>
                  <option value="Incomplete work">Incomplete work</option>
                  <option value="Damaged property">Damaged property</option>
                  <option value="Overcharging">Overcharging</option>
                  <option value="Behaviour issue">Unprofessional behaviour</option>
                  <option value="Other">Other dispute</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Description & Evidence</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain the incident with specifics..."
                  value={complaintDesc}
                  onChange={(e) => setComplaintDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold shadow-md hover:bg-rose-700 transition-colors"
              >
                Submit Dispute to Admin
              </button>
            </form>
          </div>
        </div>
      )}

      {/* In-App Live Chat Drawer */}
      {chatOpen && (
        <ChatDrawer
          bookingId={id}
          workerName={booking.worker_name}
          customerName={booking.customer_name}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
