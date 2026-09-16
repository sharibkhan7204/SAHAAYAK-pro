import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles, User, Wrench, Shield, Check } from 'lucide-react';

export default function Login() {
  const { login, verify2FA, quickDemoLogin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA Challenge state
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('123456');

  const redirectByRole = (role) => {
    if (role === 'worker') return '/worker/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    return '/customer/dashboard';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await login(email, password);

      if (res.requires2FA) {
        setTwoFactorChallenge(res);
        addToast(res.message, 'info');
        return;
      }

      addToast(`Welcome back, ${res.user.fullName}!`, 'success');
      navigate(redirectByRole(res.user.role));
    } catch (err) {
      addToast(err.response?.data?.error || 'Login failed. Please check your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await verify2FA(twoFactorChallenge.tempUserId, twoFactorCode);
      addToast('2FA Verified! Welcome to Admin Command Center.', 'success');
      navigate('/admin/dashboard');
    } catch (err) {
      addToast(err.response?.data?.error || 'Invalid 2FA code.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    {
      title: 'Customer',
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      password: 'Customer@123',
      role: 'customer',
      icon: <User className="w-4 h-4 text-teal-600" />
    },
    {
      title: 'Worker',
      name: 'Ramesh (Cleaner)',
      email: 'ramesh.cleaner@example.com',
      password: 'Worker@123',
      role: 'worker',
      icon: <Wrench className="w-4 h-4 text-amber-600" />
    },
    {
      title: 'Admin',
      name: 'Vikram (Super Admin)',
      email: 'admin@sahaayak.com',
      password: 'Admin@123',
      twoFactorCode: '123456',
      role: 'admin',
      icon: <Shield className="w-4 h-4 text-rose-600" />
    }
  ];

  const handleDemoFill = async (acc) => {
    try {
      setLoading(true);
      await quickDemoLogin(acc);
      addToast(`Logged in as demo ${acc.title}!`, 'success');
      navigate(redirectByRole(acc.role));
    } catch (err) {
      addToast(err.response?.data?.error || 'Demo login failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Quick Demo Logins Banner */}
        <div className="bg-white rounded-2xl p-4 border border-brand-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1 font-bold text-brand-700">
              <Sparkles className="w-3.5 h-3.5 text-saffron-500" /> Quick Demo 1-Click Login:
            </span>
            <span>Pre-seeded Data</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleDemoFill(acc)}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-all text-center group"
              >
                <div className="mb-1">{acc.icon}</div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-brand-700">{acc.title}</span>
                <span className="text-[10px] text-slate-400 truncate w-full">{acc.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Login Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
              {twoFactorChallenge ? 'Two-Factor Authentication' : 'Welcome to Sahaayak'}
            </h2>
            <p className="text-xs text-slate-500">
              {twoFactorChallenge
                ? 'Enter the 6-digit security code. (Demo code: 123456)'
                : 'Sign in to access your bookings, jobs, or admin portal'}
            </p>
          </div>

          {twoFactorChallenge ? (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">2FA Security Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  className="w-full text-center tracking-widest text-lg font-bold px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="123456"
                />
                <div className="text-[11px] text-slate-400 text-center pt-1">Demo code: <code className="text-brand-600 font-bold">123456</code></div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="text-center pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-500">
            <div>
              Don't have an account?{' '}
              <Link to="/customer-signup" className="text-brand-600 font-bold hover:underline">
                Sign up as Customer
              </Link>
            </div>
            <div>
              Want to earn?{' '}
              <Link to="/worker-signup" className="text-saffron-600 font-bold hover:underline">
                Register as a Gig Partner
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
