import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import ChatDrawer from '../../components/chat/ChatDrawer';
import {
  MapPin, Phone, MessageSquare, Navigation, CheckCircle2,
  Camera, PlusCircle, IndianRupee, ArrowLeft, ShieldCheck, Check, Clock, AlertTriangle, X
} from 'lucide-react';

export default function WorkerActiveJob() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { socket, joinBookingRoom } = useSocket();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Additional charge modal
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeLabour, setChargeLabour] = useState(100);
  const [chargeParts, setChargeParts] = useState(150);

  // Cash collection confirmation modal
  const [cashModalOpen, setCashModalOpen] = useState(false);

  const loadJob = async () => {
    try {
      const res = await api.get(`/bookings/${id}`);
      setData(res.data);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to load job details.', 'error');
      navigate('/worker/jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
    joinBookingRoom(id);

    if (socket) {
      const handleUpdate = () => loadJob();
      socket.on('booking:status_change', handleUpdate);
      socket.on('booking:additional_charge_responded', handleUpdate);
      socket.on('booking:payment_completed', handleUpdate);

      return () => {
        socket.off('booking:status_change', handleUpdate);
        socket.off('booking:additional_charge_responded', handleUpdate);
        socket.off('booking:payment_completed', handleUpdate);
      };
    }
  }, [id, socket]);

  // Transition job status
  const handleTransition = async (nextStatus) => {
    try {
      setActionLoading(true);

      // If completing, simulate uploading an after photo proof
      if (nextStatus === 'service_completed') {
        await api.post(`/bookings/${id}/photos`, {
          type: 'after',
          photoUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80'
        });
      } else if (nextStatus === 'service_started') {
        await api.post(`/bookings/${id}/photos`, {
          type: 'before',
          photoUrl: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=400&q=80'
        });
      }

      await api.post(`/bookings/${id}/status`, { nextStatus });
      addToast(`Status updated to ${nextStatus.replace(/_/g, ' ')}!`, 'success');
      loadJob();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update status.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit additional charge request
  const handleRequestCharge = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.post(`/bookings/${id}/additional-charge`, {
        description: chargeDesc,
        labourAmount: Number(chargeLabour),
        partsAmount: Number(chargeParts)
      });
      addToast('Additional charges submitted for customer approval!', 'success');
      setChargeModalOpen(false);
      loadJob();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to submit additional charge.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm cash collected from customer
  const handleConfirmCash = async () => {
    try {
      setActionLoading(true);
      await api.post(`/bookings/${id}/pay-demo`, {
        method: 'cash',
        tipAmount: 0
      });
      addToast('Cash collection recorded! Invoice generated.', 'success');
      setCashModalOpen(false);
      loadJob();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to record cash payment.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { booking, additionalCharges } = data;
  const isPendingAccept = booking.status === 'worker_assigned';
  const isAccepted = booking.status === 'worker_accepted';
  const isOnTheWay = booking.status === 'worker_on_the_way';
  const isArrived = booking.status === 'worker_arrived';
  const isStarted = booking.status === 'service_started';
  const isCompleted = ['service_completed', 'customer_confirmation'].includes(booking.status);
  const isClosed = ['payment_completed', 'booking_closed'].includes(booking.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/worker/jobs"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold font-display text-slate-900">{booking.service_name}</h1>
            <p className="text-xs text-slate-500">
              Booking #{booking.booking_number} • Status: <strong className="text-brand-600 uppercase font-bold">{booking.status.replace(/_/g, ' ')}</strong>
            </p>
          </div>
        </div>

        {/* Communication toolbar */}
        {!isPendingAccept && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChatOpen(true)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-brand-600 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Customer Chat</span>
            </button>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${booking.address?.latitude || 12.9352},${booking.address?.longitude || 77.6245}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Navigation className="w-4 h-4" />
              <span>Google Maps</span>
            </a>
          </div>
        )}
      </div>

      {/* Main Workflow Action Banner */}
      <div className="bg-white border-2 border-brand-500 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-brand-600 animate-pulse" />
            <span>Next Job Execution Step</span>
          </h2>
          <span className="text-xs text-slate-700 font-bold">Estimated Pay: <strong className="text-emerald-600 text-sm">₹{booking.final_amount}</strong></span>
        </div>

        {/* Status Transition Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          {isPendingAccept && (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={async () => {
                  try {
                    setActionLoading(true);
                    await api.post(`/bookings/${id}/worker-respond`, { action: 'reject' });
                    addToast('Job declined and reassigned.', 'info');
                    navigate('/worker/jobs');
                  } catch (e) {
                    addToast('Decline failed.', 'error');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-all flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4 text-rose-500" />
                <span>Decline Request</span>
              </button>
              <button
                onClick={async () => {
                  try {
                    setActionLoading(true);
                    await api.post(`/bookings/${id}/worker-respond`, { action: 'accept' });
                    addToast('Job accepted! You can now travel to location.', 'success');
                    loadJob();
                  } catch (err) {
                    addToast(err.response?.data?.error || 'Failed to accept job.', 'error');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 text-white" />
                <span>Accept Job Request</span>
              </button>
            </div>
          )}

          {isAccepted && (
            <button
              onClick={() => handleTransition('worker_on_the_way')}
              disabled={actionLoading}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition-all"
            >
              🚀 Step 1: Mark "On The Way"
            </button>
          )}

          {isOnTheWay && (
            <button
              onClick={() => handleTransition('worker_arrived')}
              disabled={actionLoading}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all"
            >
              📍 Step 2: Mark "Arrived at Address"
            </button>
          )}

          {isArrived && (
            <button
              onClick={() => handleTransition('service_started')}
              disabled={actionLoading}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Step 3: Upload Before Photo & Start Service</span>
            </button>
          )}

          {isStarted && (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => setChargeModalOpen(true)}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-slate-300"
              >
                <PlusCircle className="w-4 h-4 text-brand-600" />
                <span>+ Request Extra Work / Charges</span>
              </button>

              <button
                onClick={() => handleTransition('service_completed')}
                disabled={actionLoading}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Step 4: Upload After Proof & Complete</span>
              </button>
            </div>
          )}

          {isCompleted && (
            <div className="w-full space-y-3">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-800 font-medium">
                Service marked complete! Waiting for customer confirmation & payment.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCashModalOpen(true)}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  💵 Customer Paid Cash (Confirm Receipt of ₹{booking.final_amount})
                </button>
              </div>
            </div>
          )}

          {isClosed && (
            <div className="w-full bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Job finished, customer confirmed, and payment settled! Check your Earnings tab.</span>
            </div>
          )}
        </div>
      </div>

      {/* Customer & Address Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Customer info card */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-3 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">Customer Details</h3>
          <div className="space-y-1.5 text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-500">Name:</span>
              <strong className="text-slate-900">{booking.customer_name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phone:</span>
              <span className="text-brand-600 font-mono font-bold">{booking.customer_mobile || '+91 98888 11111'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Destination Area:</span>
              <span>{booking.address?.area}, {booking.address?.city}</span>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-slate-500 block mb-1">Full Service Address:</span>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800">
              {isPendingAccept
                ? `Area: ${booking.address?.area}, ${booking.address?.city} (Full house details revealed upon acceptance)`
                : `${booking.address?.house_no || ''}, ${booking.address?.street || ''}, ${booking.address?.area || ''}, ${booking.address?.city || ''}`}
            </div>
          </div>
        </div>

        {/* Dynamic Service Specifications */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-3 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">Job Specifications</h3>
          <div className="space-y-2 text-slate-600">
            {Object.entries(booking.dynamicFields || {}).map(([k, v]) => (
              <div key={k} className="flex justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="capitalize text-slate-500">{k.replace(/_/g, ' ')}:</span>
                <strong className="text-slate-900">{String(v)}</strong>
              </div>
            ))}
          </div>
          {booking.customer_notes && (
            <div className="text-slate-500 italic pt-1">
              Note from customer: "{booking.customer_notes}"
            </div>
          )}
        </div>
      </div>

      {/* ADDITIONAL CHARGES MODAL */}
      {chargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 text-xs text-slate-800">
            <h3 className="font-bold text-base text-slate-900">Request Additional Work Approval</h3>
            <p className="text-slate-500">
              Platform rule: Never take cash outside the app. The customer must approve additional parts or labour in real-time.
            </p>

            <form onSubmit={handleRequestCharge} className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Description of Work / Parts</label>
                <textarea
                  required
                  rows={3}
                  value={chargeDesc}
                  onChange={(e) => setChargeDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="E.g., Replaced 1.5-inch PVC flexible drainage pipe and silicone sealant."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Extra Labour (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={chargeLabour}
                    onChange={(e) => setChargeLabour(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Parts Cost (₹) *0% fee*</label>
                  <input
                    type="number"
                    min="0"
                    value={chargeParts}
                    onChange={(e) => setChargeParts(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChargeModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md"
                >
                  Send for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CASH CONFIRMATION MODAL */}
      {cashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs text-slate-800">
            <h3 className="font-bold text-base text-slate-900">Confirm Cash Payment Collection</h3>
            <p className="text-slate-600 leading-relaxed">
              Did you receive the total amount of <strong className="text-emerald-600 font-bold">₹{booking.final_amount}</strong> directly in cash from {booking.customer_name}?
            </p>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-500">
              Platform commission (if applicable) will be recorded as outstanding balance on your account and settled against future online payouts.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCashModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCash}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
              >
                Yes, Cash Collected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Chat Drawer */}
      {chatOpen && (
        <ChatDrawer
          bookingId={id}
          workerName={user.fullName}
          customerName={booking.customer_name}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
