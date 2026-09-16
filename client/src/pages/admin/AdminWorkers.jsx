import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Wrench, Search, Star, ShieldCheck, Power, AlertTriangle } from 'lucide-react';

export default function AdminWorkers() {
  const { addToast } = useToast();
  const [workers, setWorkers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadWorkers = async () => {
    try {
      const res = await api.get(`/admin/workers?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      setWorkers(res.data.workers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, [search, statusFilter]);

  return (
    <div className="space-y-6 text-xs text-slate-700">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Gig Workers Directory</h1>
          <p className="text-slate-500">Search partners, review ratings, completed jobs, and online GPS statuses</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search by name, email, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 w-64 text-xs shadow-xs"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none text-xs shadow-xs"
          >
            <option value="">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending Review</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Workers Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
              <tr>
                <th className="p-4">Partner</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Performance</th>
                <th className="p-4">Jobs Done</th>
                <th className="p-4">Online Status</th>
                <th className="p-4">KYC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {workers.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{w.full_name}</div>
                    <div className="text-[11px] text-slate-500">{w.skills || 'General Service'}</div>
                  </td>
                  <td className="p-4 text-slate-600">
                    <div>{w.email}</div>
                    <div className="text-[11px] text-slate-400">{w.mobile}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 font-bold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{w.avg_rating || '5.0'}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({w.total_reviews})</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-brand-700">{w.performance_score || 95}%</span>
                  </td>
                  <td className="p-4 text-slate-900 font-bold">{w.total_completed_jobs || 0}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      w.is_online ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${w.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      {w.is_online ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                      w.verification_status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {w.verification_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
