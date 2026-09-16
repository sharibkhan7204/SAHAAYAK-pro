import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Download, FileSpreadsheet, TrendingUp, Users, Calendar, CheckCircle2 } from 'lucide-react';

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'revenue' | 'workers'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    fetchReportData(activeTab);
  }, [activeTab]);

  const fetchReportData = async (tab) => {
    try {
      setLoading(true);
      const res = await api.get(`/reports/${tab}`);
      setData(res.data.report || []);
    } catch (err) {
      console.error(err);
      addToast(`Failed to load ${tab} report`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    const token = localStorage.getItem('sahaayak_token');
    // Direct browser trigger to stream download attachment
    window.open(`http://localhost:5000/api/reports/${activeTab}?format=csv&token=${token}`, '_blank');
    addToast(`Exporting ${activeTab} report as CSV...`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            Operational & Financial Reports
          </h1>
          <p className="text-sm text-slate-600">
            Export comprehensive data on bookings, gross merchandise value, commission, and worker quality.
          </p>
        </div>
        <button
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow transition"
        >
          <Download className="w-4 h-4" />
          Export to CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'bookings'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Bookings Registry ({activeTab === 'bookings' ? data.length : ''})
        </button>

        <button
          onClick={() => setActiveTab('revenue')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'revenue'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Revenue & Commissions ({activeTab === 'revenue' ? data.length : ''})
        </button>

        <button
          onClick={() => setActiveTab('workers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'workers'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Worker Performance ({activeTab === 'workers' ? data.length : ''})
        </button>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No records available</h3>
          <p className="text-sm text-slate-500 mt-1">There are no records logged for this report category yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  {activeTab === 'bookings' && (
                    <>
                      <th className="px-5 py-3.5">Booking #</th>
                      <th className="px-5 py-3.5">Service</th>
                      <th className="px-5 py-3.5">Customer & Worker</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Labour (₹)</th>
                      <th className="px-5 py-3.5">Parts (₹)</th>
                      <th className="px-5 py-3.5">Commission (₹)</th>
                      <th className="px-5 py-3.5">Total (₹)</th>
                    </>
                  )}

                  {activeTab === 'revenue' && (
                    <>
                      <th className="px-5 py-3.5">Payment ID</th>
                      <th className="px-5 py-3.5">Booking #</th>
                      <th className="px-5 py-3.5">Service</th>
                      <th className="px-5 py-3.5">Method</th>
                      <th className="px-5 py-3.5">Platform Fee (₹)</th>
                      <th className="px-5 py-3.5">Tip (₹)</th>
                      <th className="px-5 py-3.5">Total Paid (₹)</th>
                      <th className="px-5 py-3.5">Settlement Date</th>
                    </>
                  )}

                  {activeTab === 'workers' && (
                    <>
                      <th className="px-5 py-3.5">Worker Name</th>
                      <th className="px-5 py-3.5">City</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Rating (★)</th>
                      <th className="px-5 py-3.5">Completed Jobs</th>
                      <th className="px-5 py-3.5">Declined</th>
                      <th className="px-5 py-3.5">Performance Score</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/75 transition">
                    {activeTab === 'bookings' && (
                      <>
                        <td className="px-5 py-3.5 font-semibold text-slate-900">
                          #{row.booking_number}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-800">
                          {row.service}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <div className="font-medium text-slate-800">C: {row.customer}</div>
                          <div className="text-slate-500">W: {row.worker || 'Unassigned'}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 capitalize">
                            {row.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-medium">₹{row.total_labour_amount}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">₹{row.total_parts_amount}</td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-emerald-600">
                          ₹{row.commission_amount}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-bold text-slate-900">
                          ₹{row.final_amount}
                        </td>
                      </>
                    )}

                    {activeTab === 'revenue' && (
                      <>
                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-900">
                          {row.payment_number}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-emerald-600 font-medium">
                          #{row.booking_number}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-800">{row.service}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 uppercase">
                            {row.payment_method}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-bold text-emerald-600">
                          ₹{row.platform_commission_amount}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">₹{row.tip_amount}</td>
                        <td className="px-5 py-3.5 text-xs font-bold text-slate-900">₹{row.total_amount}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {row.paid_at ? new Date(row.paid_at).toLocaleDateString() : '—'}
                        </td>
                      </>
                    )}

                    {activeTab === 'workers' && (
                      <>
                        <td className="px-5 py-3.5 font-semibold text-slate-900 text-xs">
                          {row.full_name}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600">{row.city}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                            row.verification_status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {row.verification_status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-bold text-amber-600">
                          ★ {row.avg_rating} ({row.total_reviews})
                        </td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-800">
                          {row.total_completed_jobs}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-rose-600 font-medium">
                          {row.total_declined_jobs}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-bold text-indigo-600">
                          {row.performance_score}%
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
