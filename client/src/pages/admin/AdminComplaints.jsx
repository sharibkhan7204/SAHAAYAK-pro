import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { AlertCircle, CheckCircle2, Clock, XCircle, Search, ShieldAlert, DollarSign, MessageSquare } from 'lucide-react';

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [resolveForm, setResolveForm] = useState({
    status: 'resolved',
    resolutionNotes: '',
    refundAmount: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/complaints');
      setComplaints(res.data.complaints || []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load complaints registry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResolve = (comp) => {
    setSelectedComplaint(comp);
    setResolveForm({
      status: 'resolved',
      resolutionNotes: comp.resolution_notes || '',
      refundAmount: 0
    });
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolveForm.resolutionNotes.trim()) {
      addToast('Resolution notes explaining the outcome are mandatory', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/admin/complaints/${selectedComplaint.id}/resolve`, resolveForm);
      addToast(`Dispute ticket ${selectedComplaint.id} has been marked as ${resolveForm.status}`, 'success');
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (err) {
      console.error(err);
      addToast('Failed to resolve complaint', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = complaints.filter(c => {
    const matchesFilter = filter === 'all' || c.status === filter;
    const matchesSearch =
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.booking_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase()) ||
      c.filed_by_email?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Clock className="w-3 h-3" /> Under Review</span>;
      case 'investigating':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"><AlertCircle className="w-3 h-3" /> Investigating</span>;
      case 'resolved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3" /> Resolved</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            Trust & Dispute Management
          </h1>
          <p className="text-sm text-slate-600">
            Investigate customer grievances, mediate disputes, and issue settlements or refunds.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets, bookings, users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['all', 'pending', 'investigating', 'resolved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize whitespace-nowrap transition ${
                filter === status
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No disputes found</h3>
          <p className="text-sm text-slate-500 mt-1">There are no complaints matching your current filter criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Ticket & Booking</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Filed By / Against</th>
                  <th className="px-5 py-3.5">Complaint Summary</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(comp => (
                  <tr key={comp.id} className="hover:bg-slate-50/75 transition">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{comp.id}</div>
                      <div className="text-xs text-emerald-600 font-medium mt-0.5">
                        Booking: #{comp.booking_number}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(comp.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                        {comp.category?.replace(/_/g, ' ')}
                      </span>
                      <div className="text-xs text-slate-500 mt-0.5">{comp.service_name}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs font-medium text-slate-800">By: {comp.filed_by_email}</div>
                      {comp.against_email && (
                        <div className="text-xs text-slate-500 mt-0.5">Against: {comp.against_email}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-xs text-slate-700 line-clamp-2">{comp.description}</p>
                      {comp.resolution_notes && (
                        <p className="text-[11px] text-emerald-700 font-medium mt-1">
                          Resolution: {comp.resolution_notes}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(comp.status)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleOpenResolve(comp)}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                      >
                        {comp.status === 'resolved' ? 'View / Edit' : 'Resolve Dispute'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Dispute Resolution: #{selectedComplaint.id}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Booking: #{selectedComplaint.booking_number} • Category: {selectedComplaint.category?.replace(/_/g, ' ')}
            </p>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 mb-4 text-xs text-slate-700">
              <span className="font-semibold text-slate-900 block mb-1">Customer Grievance:</span>
              {selectedComplaint.description}
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Outcome Status</label>
                <select
                  value={resolveForm.status}
                  onChange={(e) => setResolveForm({ ...resolveForm, status: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="resolved">Resolved (In favor of resolution)</option>
                  <option value="rejected">Rejected (No fault found / policy compliant)</option>
                  <option value="investigating">Keep Investigating (Need more details)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Issue Customer Refund (₹, Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={resolveForm.refundAmount}
                    onChange={(e) => setResolveForm({ ...resolveForm, refundAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full text-sm pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">If approved, creates a refund settlement record.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Resolution Findings & Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Explain findings, customer compensation, or worker warning..."
                  value={resolveForm.resolutionNotes}
                  onChange={(e) => setResolveForm({ ...resolveForm, resolutionNotes: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Submit Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
