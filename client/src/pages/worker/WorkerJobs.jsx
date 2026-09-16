import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Briefcase, ChevronRight, Clock, MapPin, CheckCircle2, Check, X } from 'lucide-react';

export default function WorkerJobs() {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);

  const loadJobs = async () => {
    try {
      const res = await api.get('/workers/jobs');
      setJobs(res.data.jobs || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleRespond = async (e, bookingId, action) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setRespondingId(bookingId);
      await api.post(`/bookings/${bookingId}/worker-respond`, {
        action,
        reason: action === 'reject' ? 'Worker declined request' : undefined
      });
      addToast(action === 'accept' ? 'Job accepted!' : 'Job declined.', 'success');
      loadJobs();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update request.', 'error');
    } finally {
      setRespondingId(null);
    }
  };

  const filtered = jobs.filter((j) => {
    if (activeTab === 'active') {
      return ['worker_accepted', 'worker_on_the_way', 'worker_arrived', 'service_started'].includes(j.status);
    }
    if (activeTab === 'requests') {
      return j.status === 'worker_assigned';
    }
    if (activeTab === 'completed') {
      return ['service_completed', 'customer_confirmation', 'payment_completed', 'booking_closed'].includes(j.status);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">My Jobs Directory</h1>
          <p className="text-xs text-slate-500">View current assignments, active jobs, and completed history</p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200">
          {['all', 'requests', 'active', 'completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg capitalize transition-all ${
                activeTab === tab ? 'bg-white text-brand-700 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-2">
          <Briefcase className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No Jobs in "{activeTab}"</h3>
          <p className="text-xs text-slate-500">Incoming requests will appear here in real-time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((j) => (
            <Link
              key={j.id}
              to={`/worker/jobs/${j.id}`}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-brand-400 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group shadow-xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base text-slate-900 group-hover:text-brand-600 transition-colors">
                    {j.service_name}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                    j.status === 'worker_assigned'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                      : j.status === 'service_completed' || j.status === 'booking_closed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-brand-50 text-brand-700 border-brand-200'
                  }`}>
                    {j.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                  <span>Customer: <strong className="text-slate-800">{j.customer_name}</strong></span>
                  <span>•</span>
                  <span>Scheduled: {j.scheduled_date} at {j.scheduled_time}</span>
                  <span>•</span>
                  <span>📍 {j.area}, {j.city}</span>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 gap-2">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Estimated Pay</span>
                  <span className="text-base font-bold text-emerald-600">₹{j.final_amount || j.base_service_amount}</span>
                </div>

                {j.status === 'worker_assigned' ? (
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={(e) => handleRespond(e, j.id, 'reject')}
                      disabled={respondingId === j.id}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200"
                    >
                      Decline
                    </button>
                    <button
                      onClick={(e) => handleRespond(e, j.id, 'accept')}
                      disabled={respondingId === j.id}
                      className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs"
                    >
                      Accept
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs font-bold text-brand-600 group-hover:translate-x-1 transition-transform sm:mt-2">
                    <span>Open Job</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
