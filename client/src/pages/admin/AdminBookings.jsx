import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Calendar, Search, ArrowRight, User, Wrench } from 'lucide-react';

export default function AdminBookings() {
  const { addToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Reassignment modal
  const [reassignTarget, setReassignTarget] = useState(null);
  const [newWorkerId, setNewWorkerId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [bRes, wRes] = await Promise.all([
        api.get(`/admin/bookings?search=${encodeURIComponent(search)}&status=${statusFilter}`),
        api.get('/admin/workers?status=approved')
      ]);
      setBookings(bRes.data.bookings || []);
      setWorkers(wRes.data.workers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const handleReassign = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post(`/admin/bookings/${reassignTarget.id}/reassign`, {
        newWorkerId,
        reason: reassignReason || 'Admin operational override'
      });
      addToast('Booking successfully reassigned!', 'success');
      setReassignTarget(null);
      setNewWorkerId('');
      setReassignReason('');
      loadData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Reassignment failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-700">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Bookings Registry</h1>
          <p className="text-slate-500">Manage all customer bookings, manual worker reassignments, and payment statuses</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search booking #, customer, or worker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 w-64 text-xs shadow-xs"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs shadow-xs"
          >
            <option value="">All Statuses</option>
            <option value="finding_worker">Finding Worker</option>
            <option value="worker_assigned">Worker Assigned</option>
            <option value="worker_accepted">Worker Accepted</option>
            <option value="service_started">Service Started</option>
            <option value="service_completed">Service Completed</option>
            <option value="payment_completed">Payment Completed</option>
            <option value="disputed">Disputed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
              <tr>
                <th className="p-4">Booking #</th>
                <th className="p-4">Service</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Assigned Partner</th>
                <th className="p-4">Schedule</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-mono font-bold text-slate-900">#{b.booking_number}</td>
                  <td className="p-4 font-semibold text-slate-800">{b.service_name}</td>
                  <td className="p-4 text-slate-600">{b.customer_name}</td>
                  <td className="p-4 text-brand-700 font-medium">{b.worker_name || 'Unassigned'}</td>
                  <td className="p-4 text-slate-500">{b.scheduled_date} ({b.scheduled_time})</td>
                  <td className="p-4 font-bold text-slate-900">₹{b.final_amount || b.base_service_amount}</td>
                  <td className="p-4">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4 flex items-center gap-2">
                    <Link
                      to={`/booking/${b.id}`}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-brand-700 font-bold"
                    >
                      View
                    </Link>
                    {!['payment_completed', 'booking_closed', 'cancelled'].includes(b.status) && (
                      <button
                        onClick={() => {
                          setReassignTarget(b);
                          setNewWorkerId(workers[0]?.id || '');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold"
                      >
                        Reassign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reassign Modal */}
      {reassignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 text-xs text-slate-800">
            <h3 className="font-bold text-base text-slate-900">Reassign Worker for #{reassignTarget.booking_number}</h3>
            <p className="text-slate-500">
              Service: <strong className="text-slate-900">{reassignTarget.service_name}</strong>
            </p>

            <form onSubmit={handleReassign} className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Select Replacement Partner</label>
                <select
                  required
                  value={newWorkerId}
                  onChange={(e) => setNewWorkerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.full_name} ({w.avg_rating}★) - {w.city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Mandatory Reassignment Reason</label>
                <input
                  type="text"
                  required
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  placeholder="E.g. Original partner delayed in transit"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignTarget(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/20"
                >
                  {saving ? 'Reassigning...' : 'Confirm Reassign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
