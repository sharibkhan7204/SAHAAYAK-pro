import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Calendar, ChevronRight, Clock, MapPin, Search } from 'lucide-react';

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBookings() {
      try {
        const res = await api.get('/bookings');
        setBookings(res.data.bookings || []);
      } catch (e) {
        console.error('Failed to load customer bookings:', e);
      }
      finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, [user]);

  const statusColors = {
    finding_worker: 'bg-amber-100 text-amber-800 border-amber-200',
    worker_assigned: 'bg-blue-100 text-blue-800 border-blue-200',
    worker_accepted: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    worker_on_the_way: 'bg-purple-100 text-purple-800 border-purple-200',
    worker_arrived: 'bg-teal-100 text-teal-800 border-teal-200',
    service_started: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    service_completed: 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse',
    customer_confirmation: 'bg-amber-100 text-amber-900 border-amber-300',
    payment_completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    booking_closed: 'bg-slate-100 text-slate-700 border-slate-200',
    cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
    disputed: 'bg-rose-100 text-rose-800 border-rose-200'
  };

  const filtered = bookings.filter((b) => {
    if (activeTab === 'active') {
      return !['booking_closed', 'cancelled'].includes(b.status);
    }
    if (activeTab === 'completed') {
      return ['payment_completed', 'booking_closed'].includes(b.status);
    }
    if (activeTab === 'cancelled') {
      return b.status === 'cancelled' || b.status === 'disputed';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">My Service Bookings</h1>
          <p className="text-xs text-slate-500">Track current jobs, access invoices, and view service receipts</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
          {['all', 'active', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
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
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Bookings Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not have any bookings under the "{activeTab}" filter.
          </p>
          <Link
            to="/services"
            className="inline-block px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-md"
          >
            Explore Services
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((b) => (
            <Link
              key={b.id}
              to={`/customer/bookings/${b.id}`}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base text-slate-900 group-hover:text-brand-600 transition-colors">
                    {b.service_name}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${statusColors[b.status] || 'bg-slate-100'}`}>
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                  <span>Booking ID: <strong className="text-slate-700">#{b.booking_number}</strong></span>
                  <span>•</span>
                  <span>Date: {b.scheduled_date} at {b.scheduled_time}</span>
                  {b.cust_area && <span>• 📍 {b.cust_area}</span>}
                </div>

                {b.worker_name && (
                  <div className="text-xs text-brand-700 font-semibold pt-1">
                    Partner: {b.worker_name}
                  </div>
                )}
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Amount</span>
                  <span className="text-base font-bold text-slate-900">₹{b.final_amount || b.base_service_amount}</span>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-brand-600 group-hover:translate-x-1 transition-transform sm:mt-2">
                  <span>View Details</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
