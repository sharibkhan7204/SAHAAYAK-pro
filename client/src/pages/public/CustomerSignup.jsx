import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  User, Mail, Lock, Phone, MapPin, ArrowRight, Eye, EyeOff,
  ShieldCheck, CheckCircle2, Sparkles, AlertCircle, Wrench
} from 'lucide-react';

export default function CustomerSignup() {
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneDigits: '', // 10 digits without +91
    password: '',
    confirmPassword: '',
    dob: '',
    gender: 'female',
    address: '',
    area: 'HSR Layout',
    customArea: '',
    city: 'Bengaluru',
    pincode: '560102'
  });

  const bengaluruAreas = [
    'HSR Layout',
    'Koramangala',
    'Indiranagar',
    'Whitefield',
    'Jayanagar',
    'Bellandur',
    'Electronic City',
    'Other'
  ];

  const handlePhoneChange = (e) => {
    // Only accept numeric input up to 10 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, phoneDigits: cleaned }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!formData.fullName.trim()) {
      addToast('Please enter your full name', 'error');
      return;
    }

    if (formData.phoneDigits.length !== 10) {
      addToast('Please enter a valid 10-digit Indian mobile number', 'error');
      return;
    }

    if (formData.password.length < 6) {
      addToast('Password must be at least 6 characters long', 'error');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      addToast('Passwords do not match. Please verify.', 'error');
      return;
    }

    if (!formData.address.trim()) {
      addToast('Please provide your street or apartment address', 'error');
      return;
    }

    const effectiveArea = formData.area === 'Other'
      ? (formData.customArea.trim() || 'Bengaluru')
      : formData.area;

    try {
      setLoading(true);
      const payload = {
        role: 'customer',
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: `+91${formData.phoneDigits}`,
        password: formData.password,
        dob: formData.dob || null,
        gender: formData.gender,
        address: formData.address.trim(),
        area: effectiveArea,
        city: formData.city.trim(),
        pincode: formData.pincode.trim()
      };

      const res = await register(payload);
      addToast(`Account created successfully! Welcome to Sahaayak, ${res.user?.fullName || formData.fullName}!`, 'success');
      navigate('/customer/dashboard');
    } catch (err) {
      console.error('Customer registration error:', err);
      addToast(err.response?.data?.error || 'Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-200 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200">
            <Sparkles className="w-3.5 h-3.5 text-saffron-500" /> Pay-After-Service Guaranteed
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
            Create Customer Account
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Sign up to book verified gig technicians, track job progress in real-time, and pay ₹0 until your service is 100% complete.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Section 1: Personal Details */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <User className="w-3.5 h-3.5 text-brand-600" /> Personal Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Full Name <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                    placeholder="E.g. Priya Sharma"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Mobile Number <span className="text-rose-500">*</span></label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-600 font-bold text-xs">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength="10"
                    value={formData.phoneDigits}
                    onChange={handlePhoneChange}
                    className="w-full px-3 py-2.5 rounded-r-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                    placeholder="9876543210"
                  />
                </div>
                <span className="text-[10px] text-slate-400">10-digit Indian mobile number</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Email Address <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                  placeholder="priya.sharma@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Password <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength="6"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                    placeholder="Min 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Confirm Password <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength="6"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`w-full pl-9 pr-9 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-xs ${
                      formData.confirmPassword && formData.password !== formData.confirmPassword
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:ring-brand-500'
                    }`}
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <span className="text-[10px] text-rose-500">Passwords do not match</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Date of Birth (Optional)</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs bg-white"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other / Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Service Delivery Address */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-600" /> Default Service Address
              </h2>
              <span className="text-[11px] text-slate-400">Used to match nearest local workers</span>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Flat / House / Street Address <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                placeholder="E.g. #402, Oakwood Heights, 14th Main Road"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Locality / Area <span className="text-rose-500">*</span></label>
                <select
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs bg-white"
                >
                  {bengaluruAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">City</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Pincode <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  maxLength="6"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                  placeholder="560102"
                />
              </div>
            </div>

            {formData.area === 'Other' && (
              <div className="space-y-1 animate-in fade-in duration-150">
                <label className="font-semibold text-slate-700 block">Enter Custom Area Name</label>
                <input
                  type="text"
                  required
                  value={formData.customArea}
                  onChange={(e) => setFormData({ ...formData, customArea: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                  placeholder="E.g. Marathahalli, BTM Layout, Malleshwaram"
                />
              </div>
            )}
          </div>

          {/* Guarantee Checklist */}
          <div className="p-3.5 bg-brand-50/60 rounded-2xl border border-brand-100 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-brand-900 block text-xs">Sahaayak Customer Protection Policy</span>
              <p className="text-[11px] text-brand-700 leading-relaxed">
                By registering, you receive automated worker dispatch, real-time tracking, ₹0 advance payment, and verified dispute resolution.
              </p>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Creating Your Account...' : 'Complete Registration & Enter Customer Hub'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Links */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Already registered?{' '}
            <Link to="/login" className="text-brand-600 font-bold hover:underline">
              Log In Here
            </Link>
          </div>

          <div>
            Want to offer services?{' '}
            <Link to="/worker-signup" className="text-slate-700 font-bold hover:underline inline-flex items-center gap-1">
              <Wrench className="w-3 h-3 text-amber-600" />
              Register as Gig Worker
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
