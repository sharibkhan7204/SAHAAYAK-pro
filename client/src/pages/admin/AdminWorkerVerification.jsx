import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { UserCheck, Shield, FileText, Check, X, AlertTriangle, ExternalLink } from 'lucide-react';

export default function AdminWorkerVerification() {
  const { addToast } = useToast();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rejection / change modal
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [actionType, setActionType] = useState('approve'); // 'approve', 'reject', 'request_changes'
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadQueue = async () => {
    try {
      const res = await api.get('/admin/workers/pending');
      setWorkers(res.data.pendingWorkers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleExecuteAction = async (e) => {
    e.preventDefault();
    if (!selectedWorker) return;

    try {
      setSubmitting(true);
      await api.post(`/admin/workers/${selectedWorker.id}/verify`, {
        action: actionType,
        reason: actionReason
      });

      addToast(`Worker verification marked as ${actionType}!`, 'success');
      setSelectedWorker(null);
      setActionReason('');
      loadQueue();
    } catch (err) {
      addToast(err.response?.data?.error || 'Action failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-700">
      <div>
        <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Worker KYC Verification Queue</h1>
        <p className="text-slate-500">Review pending partner applications, inspect government IDs, and approve or reject with audit trail</p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
        </div>
      ) : workers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2 shadow-xs">
          <UserCheck className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="font-bold text-slate-900 text-sm">KYC Queue is Clear!</h3>
          <p className="text-slate-500">All registered service partners have been verified.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {workers.map((w) => (
            <div
              key={w.id}
              className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xs"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-sm border border-brand-200">
                    {w.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900">{w.full_name}</span>
                      <span className="bg-amber-50 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-amber-200 uppercase">
                        {w.verification_status}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {w.email} • {w.mobile} • {w.city} ({w.pincode})
                    </div>
                  </div>
                </div>

                <div className="text-slate-600 text-xs pt-1 space-y-1">
                  <div>Trades / Skills: <strong className="text-brand-700">{w.offeredServices?.join(', ') || w.skills}</strong></div>
                  <div>Experience: {w.experience_years} years • UPI: <span className="font-mono text-slate-500">{w.upi_id || 'Not specified'}</span></div>
                  <div>Bank Account: <span className="font-mono text-slate-500">{w.bank_account_no ? `•••• •••• ${w.bank_account_no.slice(-4)}` : 'Pending'}</span></div>
                </div>

                {/* Documents List */}
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500 font-bold text-[11px]">Submitted Documents:</span>
                  {w.documents?.map((doc) => (
                    <span
                      key={doc.id}
                      className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[11px]"
                    >
                      <FileText className="w-3 h-3 text-brand-600" />
                      <span className="capitalize">{doc.document_type}</span> ({doc.document_number || 'DOC-VERIFIED'})
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                <button
                  onClick={() => {
                    setSelectedWorker(w);
                    setActionType('reject');
                  }}
                  className="flex-1 lg:flex-initial px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-rose-700 border border-slate-200 font-bold text-xs transition-colors"
                >
                  Reject
                </button>

                <button
                  onClick={() => {
                    setSelectedWorker(w);
                    setActionType('request_changes');
                  }}
                  className="flex-1 lg:flex-initial px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-amber-800 border border-slate-200 font-bold text-xs transition-colors"
                >
                  Request Changes
                </button>

                <button
                  onClick={() => {
                    setSelectedWorker(w);
                    setActionType('approve');
                  }}
                  className="flex-1 lg:flex-initial px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  Approve Partner
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 text-xs text-slate-800">
            <h3 className="font-bold text-base text-slate-900 capitalize">
              Confirm Action: {actionType.replace('_', ' ')}
            </h3>
            <p className="text-slate-600">
              Worker: <strong className="text-slate-900">{selectedWorker.full_name}</strong> ({selectedWorker.email})
            </p>

            <form onSubmit={handleExecuteAction} className="space-y-4">
              {actionType !== 'approve' ? (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Mandatory Reason for {actionType === 'reject' ? 'Rejection' : 'Requested Changes'} *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Provide specific details for the partner..."
                  />
                </div>
              ) : (
                <p className="text-slate-600">
                  Approving this partner marks their KYC verified, enables their trade services, and authorizes them to toggle Online to receive booking requests.
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedWorker(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 py-2.5 rounded-xl font-bold shadow-md text-white ${
                    actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? 'Processing...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
