import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import {
  IndianRupee, Briefcase, Star, Award, MapPin, ArrowRight,
  Clock, Navigation, ShieldCheck, CheckCircle2, ChevronRight, AlertCircle,
  Bell, Check, X, Phone
} from 'lucide-react';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.get('/workers/dashboard');
      setDashboard(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRespond = async (bookingId, action) => {
    try {
      setResponding(true);
      await api.post(`/bookings/${bookingId}/worker-respond`, {
        action,
        reason: action === 'reject' ? 'Worker declined request' : undefined
      });
      if (action === 'accept') {
        addToast('Job accepted! You can now start the workflow.', 'success');
        navigate(`/worker/jobs/${bookingId}`);
      } else {
        addToast('Job declined. Reassigned to another partner.', 'info');
        loadData();
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to respond to request.', 'error');
    } finally {
      setResponding(false);
    }
  };

  if (loading || !dashboard) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { worker, activeJob, pendingRequest, todayJobs, todayEarnings, totalEarnings, totalTips } = dashboard;

  return (
    <div className="space-y-8">
      {/* INCOMING PENDING JOB REQUEST BANNER */}
      {pendingRequest && (
        <div className="bg-gradient-to-r from-brand-500 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl border-2 border-brand-400 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-sm border border-white/30">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span>⚡ New Incoming Booking Request!</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
                {pendingRequest.service_name}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-100 font-medium">
                <span>Customer: <strong className="text-white">{pendingRequest.customer_name || 'Customer'}</strong></span>
                <span>•</span>
                <span>Area: <strong className="text-white">{pendingRequest.cust_area || 'Bengaluru'}</strong></span>
                <span>•</span>
                <span>Slot: <strong className="text-white">{pendingRequest.scheduled_date} at {pendingRequest.scheduled_time}</strong></span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="bg-white/15 px-4 py-2 rounded-2xl border border-white/20 text-center sm:text-left">
                <span className="text-[10px] uppercase font-bold text-brand-100 block">Estimated Pay</span>
                <span className="text-2xl font-black text-white">₹{pendingRequest.final_amount || pendingRequest.base_service_amount}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRespond(pendingRequest.id, 'reject')}
                  disabled={responding}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Decline</span>
                </button>
                <button
                  onClick={() => handleRespond(pendingRequest.id, 'accept')}
                  disabled={responding}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-brand-800 font-extrabold text-xs shadow-lg shadow-black/10 transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02]"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Accept Job</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-50/70 via-white to-slate-50 border border-brand-100 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xs">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-bold border border-brand-200">
            <Award className="w-3.5 h-3.5 text-brand-600" /> Performance Score: {worker.performance_score || 96}%
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
            Namaste, {worker.full_name}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {worker.is_online
              ? `🟢 You are ONLINE and ready to receive bookings within ${worker.service_radius_km || 20} km.`
              : '⚪ You are OFFLINE. Toggle the button above to start receiving jobs.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/worker/jobs"
            className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition-all flex items-center gap-2"
          >
            <span>View All Jobs</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-1">
          <span className="text-slate-500 block font-medium">Today's Earnings</span>
          <div className="text-2xl font-bold font-display text-emerald-600">₹{todayEarnings}</div>
          <span className="text-[11px] text-slate-500 font-medium">{todayJobs} jobs completed today</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-1">
          <span className="text-slate-500 block font-medium">Total Lifetime Earnings</span>
          <div className="text-2xl font-bold font-display text-slate-900">₹{totalEarnings}</div>
          <span className="text-[11px] text-amber-600 font-medium">+ ₹{totalTips} tips (100% kept)</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-1">
          <span className="text-slate-500 block font-medium">Customer Rating</span>
          <div className="text-2xl font-bold font-display text-amber-500 flex items-center gap-1">
            <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
            <span>{worker.avg_rating || '5.0'}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">{worker.total_reviews || 0} customer reviews</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-1">
          <span className="text-slate-500 block font-medium">Completed Jobs</span>
          <div className="text-2xl font-bold font-display text-brand-600">{worker.total_completed_jobs || 0}</div>
          <span className="text-[11px] text-slate-500 font-medium">98.5% on-time arrival</span>
        </div>
      </div>

      {/* ACTIVE JOB RADAR CARD */}
      {activeJob ? (
        <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-bold text-slate-900">Active Job In Progress</h2>
            </div>
            <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-3 py-1 rounded-full uppercase border border-emerald-200">
              {activeJob.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
            <div className="space-y-1">
              <div className="text-base font-bold text-slate-900">{activeJob.service_name}</div>
              <div className="text-slate-600">
                Customer: <strong className="text-slate-800">{activeJob.customer_name}</strong>
              </div>
              <div className="text-slate-600 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span>{activeJob.house_no}, {activeJob.street}, {activeJob.area}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeJob.cust_lat || 12.9352},${activeJob.cust_lng || 77.6245}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold transition-colors shadow-xs"
              >
                <Navigation className="w-4 h-4 text-brand-600" />
                <span>Navigate</span>
              </a>

              <Link
                to={`/worker/jobs/${activeJob.id}`}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/20 transition-all"
              >
                Open Job Execution
              </Link>
            </div>
          </div>
        </div>
      ) : !pendingRequest && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-xs">
          <Clock className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No Active Job Right Now</h3>
          <p className="text-xs text-slate-500">
            {worker.is_online
              ? 'You are online. When a nearby customer requests your trade, an instant alert will pop up!'
              : 'Toggle Online above to begin receiving job requests.'}
          </p>
        </div>
      )}
    </div>
  );
}
