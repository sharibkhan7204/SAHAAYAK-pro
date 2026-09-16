import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { DollarSign, ShieldCheck, Percent, HelpCircle, Save, CheckCircle2, Calculator } from 'lucide-react';

export default function AdminCommissionSettings() {
  const [settings, setSettings] = useState({
    commissionFreeThreshold: 599,
    commissionPercentage: 10,
    partsCommissionPercentage: 0,
    tipsCommissionPercentage: 0,
    cashFeeCollectionThreshold: 1500,
    allowWorkerInstantPayout: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  // Interactive Live Policy Simulator
  const [testLabour, setTestLabour] = useState(750);
  const [testParts, setTestParts] = useState(300);
  const [testTip, setTestTip] = useState(50);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/settings/commission');
      if (res.data.settings && Object.keys(res.data.settings).length > 0) {
        setSettings(prev => ({ ...prev, ...res.data.settings }));
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load commission settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/admin/settings/commission', settings);
      addToast('Commission and platform fee policy updated!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to save commission settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Calculator logic
  const simLabour = Number(testLabour) || 0;
  const simParts = Number(testParts) || 0;
  const simTip = Number(testTip) || 0;
  const isFree = simLabour <= settings.commissionFreeThreshold;
  const simCommission = isFree ? 0 : Math.round((simLabour * settings.commissionPercentage) / 100);
  const simWorkerEarnings = (simLabour - simCommission) + simParts + simTip;
  const simCustomerTotal = simLabour + simParts + simTip;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Platform Fee & Commission Policy
          </h1>
          <p className="text-sm text-slate-600">
            Configure fair gig worker monetization policies, micro-job exemptions, and payout rules.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Policy Changes'}
        </button>
      </div>

      {/* Strict Fair-Play Guarantee Banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-white/10 rounded-lg backdrop-blur-sm">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Sahaayak Pro-Worker Financial Guarantee</h3>
            <p className="text-emerald-50 text-sm mt-1">
              Zero platform commission is charged on micro-tasks and affordable services (≤ ₹{settings.commissionFreeThreshold}).
              100% of customer tips and material/parts reimbursements are passed directly to gig workers with 0% platform deductions.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3">
              Commission Rates & Thresholds
            </h2>

            {/* Zero Commission Threshold */}
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">
                Zero-Commission Labour Threshold (₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold">₹</span>
                <input
                  type="number"
                  min="0"
                  max="5000"
                  step="50"
                  value={settings.commissionFreeThreshold}
                  onChange={(e) => setSettings({ ...settings, commissionFreeThreshold: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Any booking with service labour ≤ this amount is charged ₹0 platform fee.
              </p>
            </div>

            {/* Commission Rate Above Threshold */}
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">
                Commission Rate for Services &gt; ₹{settings.commissionFreeThreshold} (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="30"
                  step="0.5"
                  value={settings.commissionPercentage}
                  onChange={(e) => setSettings({ ...settings, commissionPercentage: parseFloat(e.target.value) || 0 })}
                  className="w-full pr-8 pl-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-semibold">%</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Applied strictly to the service/labour amount. Excludes parts, materials, and tips.
              </p>
            </div>

            {/* Cash Platform Fee Cap before settlement required */}
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">
                Max Outstanding Cash Dues Before Worker Suspension (₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold">₹</span>
                <input
                  type="number"
                  min="500"
                  max="10000"
                  step="100"
                  value={settings.cashFeeCollectionThreshold}
                  onChange={(e) => setSettings({ ...settings, cashFeeCollectionThreshold: parseFloat(e.target.value) || 1000 })}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                When a worker collects cash from customers, platform fee dues accumulate. If dues exceed this amount, they must settle via UPI to take new jobs.
              </p>
            </div>

            {/* Protected Deductions (Non-negotiable policies) */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Protected Gig Worker Allocations</h3>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-700">Customer Tips Pass-Through</span>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-800 rounded">
                  100% to Worker (0% Commission)
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-700">Spare Parts & Material Reimbursement</span>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-800 rounded">
                  100% to Worker (0% Commission)
                </span>
              </div>
            </div>
          </div>
        </form>

        {/* Live Simulator Workbench */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-indigo-600" />
              Policy Calculation Simulator
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Test how the current configuration impacts worker payout and platform revenue for any job scenario.
            </p>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Service Labour (₹)</label>
                <input
                  type="number"
                  value={testLabour}
                  onChange={(e) => setTestLabour(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Parts & Materials (₹)</label>
                <input
                  type="number"
                  value={testParts}
                  onChange={(e) => setTestParts(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Worker Tip (₹)</label>
                <input
                  type="number"
                  value={testTip}
                  onChange={(e) => setTestTip(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            {/* Output Breakdown */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Customer Pays Total:</span>
                <span className="font-bold text-slate-900">₹{simCustomerTotal}</span>
              </div>

              <div className="flex justify-between text-xs">
                <span>Platform Commission ({isFree ? 'Exempt' : `${settings.commissionPercentage}%`}):</span>
                <span className={`font-bold ${isFree ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {isFree ? '₹0 (Policy Exempt)' : `₹${simCommission}`}
                </span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Parts Reimbursement:</span>
                <span className="font-semibold text-slate-900">₹{simParts} (100%)</span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Worker Tip:</span>
                <span className="font-semibold text-emerald-600">₹{simTip} (100%)</span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-900">Worker Receives:</span>
                <span className="text-base font-bold text-emerald-700">₹{simWorkerEarnings}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
