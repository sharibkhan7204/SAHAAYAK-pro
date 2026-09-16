import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Users, Wrench, Calendar, IndianRupee, AlertOctagon,
  ShieldCheck, TrendingUp, Sparkles, ArrowUpRight, BarChart2, Package
} from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await api.get('/admin/dashboard');
        setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  if (loading || !data) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { kpis, charts } = data;

  return (
    <div className="space-y-8 text-xs text-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-slate-500">Live operational oversight, financial volume, and partner capacity</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/verification"
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>KYC Queue ({kpis.pendingVerifications})</span>
          </Link>
          <Link
            to="/admin/reports"
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold transition-colors shadow-xs"
          >
            Export Reports (CSV)
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs">
          <span className="text-slate-500 text-[11px] block font-medium">Gross Volume</span>
          <div className="text-xl font-bold font-display text-emerald-600">₹{kpis.grossVolume}</div>
          <span className="text-[10px] text-slate-400">Transacted via platform</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs">
          <span className="text-slate-500 text-[11px] block font-medium">Commission Revenue</span>
          <div className="text-xl font-bold font-display text-slate-900">₹{kpis.totalCommission}</div>
          <span className="text-[10px] text-amber-600 font-semibold">Fair fee (&gt;₹599 only)</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs">
          <span className="text-slate-500 text-[11px] block font-medium">Total Bookings</span>
          <div className="text-xl font-bold font-display text-brand-600">{kpis.totalBookings}</div>
          <span className="text-[10px] text-slate-400">{kpis.todayBookings} scheduled today</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs">
          <span className="text-slate-500 text-[11px] block font-medium">Active Online Workers</span>
          <div className="text-xl font-bold font-display text-teal-600">{kpis.activeOnlineWorkers}</div>
          <span className="text-[10px] text-slate-400">Of {kpis.totalWorkers} total partners</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs">
          <span className="text-slate-500 text-[11px] block font-medium">Registered Customers</span>
          <div className="text-xl font-bold font-display text-indigo-600">{kpis.totalCustomers}</div>
          <span className="text-[10px] text-slate-400">Verified accounts</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs">
          <span className="text-slate-500 text-[11px] block font-medium">Pending Disputes</span>
          <div className="text-xl font-bold font-display text-rose-600">{kpis.pendingDisputes}</div>
          <span className="text-[10px] text-rose-500 font-semibold">Requires investigation</span>
        </div>
      </div>

      {/* Analytics Charts & Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Services */}
        <div className="lg:col-span-7 bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-brand-600" />
              <span>Service Demand Breakdown</span>
            </h2>
            <Link to="/admin/services" className="text-brand-600 hover:underline text-[11px] font-semibold">
              Manage Catalog
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {charts.topServices?.map((s) => (
              <div key={s.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800">{s.name}</span>
                  <span className="text-slate-500">{s.booking_count} bookings • ₹{Math.round(s.total_revenue)}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-600 h-full rounded-full"
                    style={{ width: `${Math.min(100, (s.booking_count / (kpis.totalBookings || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Stats */}
        <div className="lg:col-span-5 bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              <span>Category Distribution</span>
            </h2>
          </div>

          <div className="space-y-3 pt-1">
            {charts.categoryStats?.map((c) => (
              <div key={c.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-800">{c.name}</span>
                <span className="bg-brand-50 text-brand-700 border border-brand-200 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                  {c.booking_count} jobs
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
