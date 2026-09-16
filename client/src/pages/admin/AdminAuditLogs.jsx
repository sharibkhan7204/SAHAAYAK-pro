import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { ShieldCheck, Search, Filter, Clock, Eye, AlertCircle, FileText } from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/audit-logs');
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load security audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(log => {
    const matchesSearch =
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.admin_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity?.toLowerCase().includes(search.toLowerCase()) ||
      log.reason?.toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action?.includes(actionFilter);
    return matchesSearch && matchesAction;
  });

  const getActionBadgeColor = (action) => {
    if (action.includes('APPROVE') || action.includes('RESTORE')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (action.includes('REJECT') || action.includes('SUSPEND') || action.includes('SUPPRESS')) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (action.includes('UPDATE') || action.includes('SETTINGS')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (action.includes('BROADCAST')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          Security Audit Trail & Governance
        </h1>
        <p className="text-sm text-slate-600">
          Immutable chronological log of all administrator decisions, approvals, policy changes, and overrides.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search actions, admin emails, reasons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 w-full sm:w-auto"
        >
          <option value="all">All Action Types</option>
          <option value="WORKER">Worker Verifications</option>
          <option value="SERVICE">Service Catalog Edits</option>
          <option value="SETTINGS">Algorithm & Commission Policies</option>
          <option value="COMPLAINT">Dispute Resolutions</option>
          <option value="REVIEW">Review Moderations</option>
          <option value="CUSTOMER">Customer Suspensions</option>
          <option value="BROADCAST">System Broadcasts</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No audit logs found</h3>
          <p className="text-sm text-slate-500 mt-1">No admin actions match your search criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Admin User</th>
                  <th className="px-5 py-3.5">Action Executed</th>
                  <th className="px-5 py-3.5">Entity & Target ID</th>
                  <th className="px-5 py-3.5">Reason / Justification</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/75 transition">
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-900 block">
                        {log.admin_email || 'System / Auto'}
                      </span>
                      <span className="text-[11px] text-slate-400">UID: {log.admin_user_id?.substring(0, 10)}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      <span className="font-semibold text-slate-700 capitalize">{log.entity}</span>
                      <span className="text-slate-400 block font-mono text-[11px]">{log.entity_id}</span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600 max-w-xs">
                      <p className="line-clamp-2">{log.reason || '—'}</p>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        title="View Change Payload"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Audit Event #{selectedLog.id}
            </h3>
            <div className="text-xs text-slate-500 mb-4 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getActionBadgeColor(selectedLog.action)}`}>
                {selectedLog.action}
              </span>
              <span>• {new Date(selectedLog.created_at).toLocaleString()}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-1">Administrator:</span>
                <span className="text-slate-900">{selectedLog.admin_email} ({selectedLog.admin_user_id})</span>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-1">Reason:</span>
                <p className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-800">
                  {selectedLog.reason || 'No specific reason recorded.'}
                </p>
              </div>

              {selectedLog.previous_value_json && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Previous State:</span>
                  <pre className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] font-mono overflow-x-auto max-h-36 text-slate-700">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.previous_value_json), null, 2);
                      } catch {
                        return selectedLog.previous_value_json;
                      }
                    })()}
                  </pre>
                </div>
              )}

              {selectedLog.new_value_json && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">New State:</span>
                  <pre className="p-2.5 bg-emerald-50/50 rounded border border-emerald-200 text-[11px] font-mono overflow-x-auto max-h-36 text-emerald-900">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.new_value_json), null, 2);
                      } catch {
                        return selectedLog.new_value_json;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
