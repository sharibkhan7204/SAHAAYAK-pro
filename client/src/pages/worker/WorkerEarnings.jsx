import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { IndianRupee, ArrowDownToLine, CheckCircle2, Clock, AlertCircle, Sparkles } from 'lucide-react';

export default function WorkerEarnings() {
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadEarnings = async () => {
    try {
      const res = await api.get('/workers/earnings');
      setData(res.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    if (!payoutAmount || Number(payoutAmount) <= 0) {
      return addToast('Please enter a valid payout amount.', 'warning');
    }
    if (Number(payoutAmount) > data.netAvailableBalance) {
      return addToast('Amount exceeds your net available balance.', 'error');
    }

    try {
      setSubmitting(true);
      await api.post('/workers/payout', { amount: Number(payoutAmount), paymentMethod: 'upi' });
      addToast(`Payout request of ₹${payoutAmount} submitted successfully!`, 'success');
      setPayoutModal(false);
      setPayoutAmount('');
      loadEarnings();
    } catch (err) {
      addToast(err.response?.data?.error || 'Payout request failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Earnings & Cash Ledger</h1>
          <p className="text-xs text-slate-500">Transparent breakdown of online payments, direct cash collections, and tips</p>
        </div>

        <button
          onClick={() => setPayoutModal(true)}
          disabled={data.netAvailableBalance <= 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold text-xs shadow-md shadow-brand-600/20 disabled:opacity-50 transition-all"
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>Request UPI Payout</span>
        </button>
      </div>

      {/* Primary Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
          <span className="text-slate-500 font-medium block">Available to Withdraw</span>
          <div className="text-2xl font-bold font-display text-emerald-600">₹{data.netAvailableBalance}</div>
          <span className="text-[11px] text-slate-400">Net online balance after dues</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
          <span className="text-slate-500 font-medium block">Cash Collected in Hand</span>
          <div className="text-2xl font-bold font-display text-slate-900">₹{data.cashCollected}</div>
          <span className="text-[11px] text-slate-400">Collected directly from customer</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
          <span className="text-slate-500 font-medium block">Platform Commission Dues</span>
          <div className="text-2xl font-bold font-display text-amber-600">₹{data.platformCommissionOwed}</div>
          <span className="text-[11px] text-slate-400">Owed on cash jobs (&gt; ₹599)</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
          <span className="text-slate-500 font-medium block">100% Tips Received</span>
          <div className="text-2xl font-bold font-display text-brand-600">₹{data.totalTips}</div>
          <span className="text-[11px] text-emerald-600 font-semibold">Zero platform deduction</span>
        </div>
      </div>

      {/* Cash & Commission Settlement Rules Notice */}
      <div className="bg-brand-50/60 border border-brand-200 p-6 rounded-3xl space-y-3 text-xs text-brand-900">
        <h2 className="text-sm font-bold text-brand-950 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <span>Sahaayak Fair Marketplace Settlement Rules</span>
        </h2>
        <p className="leading-relaxed text-brand-800">
          • All services under ₹599 incur <strong>₹0 platform fee</strong>. You keep 100% of labour earnings.<br />
          • When customers pay in cash, you receive the full sum in hand. Any platform commission owed on large jobs is deducted automatically from your online payouts ledger.<br />
          • Customer tips are 100% yours and never counted towards commission.
        </p>
      </div>

      {/* Payout History Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 text-xs shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">Payout History</h2>

        {data.payouts?.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No payout requests initiated yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.payouts.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">₹{p.amount} ({p.payment_method.toUpperCase()})</div>
                  <div className="text-[10px] text-slate-400">Ref: {p.reference_no} • {p.created_at}</div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                  p.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout Request Modal */}
      {payoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-4 text-xs text-slate-800">
            <h3 className="font-bold text-base text-slate-900">Request Direct UPI Payout</h3>
            <p className="text-slate-500">
              Maximum available for instant withdrawal: <strong className="text-emerald-600 font-bold">₹{data.netAvailableBalance}</strong>
            </p>

            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="100"
                  max={data.netAvailableBalance}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Enter amount"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayoutModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/20"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
