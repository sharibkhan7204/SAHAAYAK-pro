import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { Wrench, ShieldCheck, IndianRupee, ArrowRight, Check } from 'lucide-react';

export default function WorkerSignup() {
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [servicesList, setServicesList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '+91',
    password: '',
    dob: '',
    gender: 'male',
    address: 'Bengaluru',
    city: 'Bengaluru',
    pincode: '560102',
    experienceYears: 4,
    skills: '',
    bio: '',
    serviceIds: [],
    bankAccountNo: '',
    bankIfsc: '',
    upiId: ''
  });

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await api.get('/services');
        setServicesList(res.data.services || []);
      } catch (e) {}
    }
    loadServices();
  }, []);

  const toggleService = (id) => {
    setFormData((prev) => {
      const exists = prev.serviceIds.includes(id);
      return {
        ...prev,
        serviceIds: exists ? prev.serviceIds.filter((s) => s !== id) : [...prev.serviceIds, id]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.serviceIds.length === 0) {
      return addToast('Please select at least one service trade that you offer.', 'warning');
    }

    try {
      setLoading(true);
      await register({
        role: 'worker',
        ...formData
      });
      addToast('Worker application submitted! Redirecting to Partner Portal.', 'success');
      navigate('/worker/dashboard');
    } catch (err) {
      addToast(err.response?.data?.error || 'Worker registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-1">
            <Wrench className="w-3.5 h-3.5 text-amber-700" /> ₹0 Commission on Small Jobs (Protected)
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Become a Sahaayak Service Partner</h1>
          <p className="text-xs text-slate-500">Fast digital registration with Aadhaar & UPI payment details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Section 1: Basic Info */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 text-sm">1. Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="E.g. Ramesh Kumar"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="+91 97777 11111"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="ramesh@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Password *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Pincode *</label>
                <input
                  type="text"
                  required
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Years Experience</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Services Offered */}
          <div className="space-y-2 pt-2">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 text-sm">2. Select Your Trades / Services *</h3>
            <p className="text-[11px] text-slate-500">You will be automatically considered for jobs in these selected categories:</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {servicesList.map((srv) => {
                const isSelected = formData.serviceIds.includes(srv.id);
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => toggleService(srv.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50 text-brand-900 font-bold shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span>{srv.name}</span>
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Payout Details */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 text-sm">3. Payout & Bank Account (100% Tips Guaranteed)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">UPI ID for Direct Payouts</label>
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="ramesh@okaxis"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Bank Account Number</label>
                <input
                  type="text"
                  value={formData.bankAccountNo}
                  onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="918273645012"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'Submitting Application...' : 'Register as Service Partner'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Already registered as a partner?{' '}
          <Link to="/login" className="text-brand-600 font-bold hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
