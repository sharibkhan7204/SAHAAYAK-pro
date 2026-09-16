import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Users, Search, AlertTriangle, ShieldCheck, Check, X } from 'lucide-react';

export default function AdminCustomers() {
  const { addToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Suspend modal
  const [targetCust, setTargetCust] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadCustomers = async () => {
    try {
      const res = await api.get(`/admin/customers?search=${encodeURIComponent(search)}`);
      setCustomers(res.data.customers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleToggleSuspend = async (cust, nextSuspend) => {
    try {
      setProcessing(true);
      await api.post(`/admin/customers/${cust.id}/suspend`, {
        isSuspended: nextSuspend,
        reason: suspendReason || 'Violation of platform safety terms'
      });
      addToast(`Customer account ${nextSuspend ? 'suspended' : 'reactivated'}!`, 'success');
      setTargetCust(null);
      setSuspendReason('');
      loadCustomers();
    } catch (err) {
      addToast(err.response?.data?.error || 'Action failed.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-700">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Customer Management</h1>
          <p className="text-slate-500">Manage registered customers, inspect bookings frequency, and handle account suspensions</p>
        </div>

        <input
          type="text"
          placeholder="Search by name, email, or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 w-64 text-xs shadow-xs"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
              <tr>
                <th className="p-4">Customer</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Bookings</th>
                <th className="p-4">Complaints Filed</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{c.full_name}</td>
                  <td className="p-4 text-slate-600">
                    <div>{c.email}</div>
                    <div className="text-[11px] text-slate-400">{c.mobile}</div>
                  </td>
                  <td className="p-4 font-bold text-slate-900">{c.bookings_count || 0}</td>
                  <td className="p-4">
                    <span className={c.complaints_count > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                      {c.complaints_count || 0}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      c.is_suspended ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {c.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="p-4">
                    {c.is_suspended ? (
                      <button
                        onClick={() => handleToggleSuspend(c, false)}
                        className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => setTargetCust(c)}
                        className="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs border border-rose-200"
                      >
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspend Modal */}
      {targetCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 text-xs text-slate-800">
            <h3 className="font-bold text-base text-slate-900">Suspend Customer Account</h3>
            <p className="text-slate-500">
              Customer: <strong className="text-slate-900">{targetCust.full_name}</strong> ({targetCust.email})
            </p>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Mandatory Reason for Suspension *</label>
              <textarea
                rows={3}
                required
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Explain the safety violation or fraud attempt..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setTargetCust(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleSuspend(targetCust, true)}
                disabled={processing || !suspendReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50 shadow-md"
              >
                {processing ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
