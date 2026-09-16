import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { User, ShieldCheck, MapPin, Clock, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export default function WorkerProfile() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState('aadhaar');
  const [docNumber, setDocNumber] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadProfile = async () => {
    try {
      const res = await api.get('/workers/dashboard');
      setWorker(res.data.worker);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      await api.post('/workers/documents', {
        documentType: docType,
        documentNumber: docNumber,
        fileUrl: '/uploads/demo-document.png'
      });
      addToast('Document submitted for admin verification!', 'success');
      setDocNumber('');
      loadProfile();
    } catch (err) {
      addToast('Failed to upload document: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !worker) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const kycStatusColors = {
    approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    rejected: 'bg-rose-50 text-rose-800 border-rose-200',
    changes_requested: 'bg-indigo-50 text-indigo-800 border-indigo-200'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-xs text-slate-700">
      <div>
        <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Partner Profile & KYC Verification</h1>
        <p className="text-slate-500">Manage your operating radius, working hours, and official identity documents</p>
      </div>

      {/* KYC Status Banner */}
      <div className={`p-6 rounded-3xl border flex items-center justify-between flex-wrap gap-4 shadow-xs ${kycStatusColors[worker.verification_status] || 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
          <div>
            <div className="font-bold text-sm text-slate-900 capitalize">KYC Status: {worker.verification_status.replace(/_/g, ' ')}</div>
            <p className="text-[11px] text-slate-600">
              {worker.is_approved
                ? 'Your national identity documents are fully verified. You are eligible to receive jobs.'
                : 'Your documents are currently under review by our operations verification team.'}
            </p>
          </div>
        </div>

        <span className="font-bold uppercase text-[10px] px-3 py-1 rounded-full bg-white text-slate-800 border border-slate-200 shadow-xs">
          ID: {worker.id}
        </span>
      </div>

      {/* Profile Specs */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Operational Parameters</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Service Radius</span>
            <span className="text-base font-bold text-slate-900">{worker.service_radius_km || 20} Kilometers</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Working Hours</span>
            <span className="text-base font-bold text-slate-900">{worker.expected_working_hours || '09:00 - 20:00'}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Experience</span>
            <span className="text-base font-bold text-slate-900">{worker.experience_years || 5} Years</span>
          </div>
        </div>

        <div className="space-y-1 pt-2">
          <span className="text-slate-500 block">Skills & Expertise:</span>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800">
            {worker.skills || 'Deep Cleaning, Plumbing, Electrical'}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-slate-500 block">Bio / Professional Intro:</span>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 italic">
            "{worker.bio || 'Verified professional technician on Sahaayak.'}"
          </div>
        </div>
      </div>

      {/* Document Upload Workbench */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Upload Verification Document</h2>
        <p className="text-slate-500">
          Upload your official Aadhaar, PAN, or Driving License. In demo mode, documents are automatically processed for evaluation.
        </p>

        <form onSubmit={handleUploadDoc} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
              >
                <option value="aadhaar">Aadhaar Card</option>
                <option value="pan">PAN Card</option>
                <option value="driving_license">Driving License</option>
                <option value="certificate">Trade Skill Certificate</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Document / ID Number</label>
              <input
                type="text"
                required
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                placeholder="XXXX-XXXX-1234"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/20 transition-colors"
          >
            {uploading ? 'Uploading...' : 'Submit Document for Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
