import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { User, Mail, Phone, Calendar, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function CustomerProfile() {
  const { user, refreshUser, logout } = useAuth();
  const { addToast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [dob, setDob] = useState(user?.profile?.dob || '');
  const [gender, setGender] = useState(user?.profile?.gender || 'female');
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/customers/profile', {
        fullName,
        mobile,
        dob,
        gender
      });
      addToast('Profile details updated successfully!', 'success');
      await refreshUser();
    } catch (err) {
      addToast('Update failed: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (window.confirm('Are you sure you want to deactivate your account? Your past transaction invoices will remain archived.')) {
      try {
        await api.post('/customers/deactivate');
        addToast('Account deactivated.', 'info');
        logout();
      } catch (e) {
        addToast('Deactivation failed.', 'error');
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Customer Profile</h1>
        <p className="text-xs text-slate-500">Manage your contact information, security, and notification settings</p>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleUpdate} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5 text-xs">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Personal Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Email Address (Read Only)</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Mobile Number</label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-colors"
        >
          {saving ? 'Saving...' : 'Save Profile Changes'}
        </button>
      </form>

      {/* Danger Zone: Account Deactivation */}
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 space-y-3 text-xs">
        <div className="flex items-center gap-2 text-rose-900 font-bold">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Account Deactivation</span>
        </div>
        <p className="text-rose-700 leading-relaxed">
          Deactivating your customer account disables new booking creation while securely preserving existing invoice
          records for audit compliance.
        </p>
        <button
          onClick={handleDeactivate}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors"
        >
          Deactivate My Account
        </button>
      </div>
    </div>
  );
}
