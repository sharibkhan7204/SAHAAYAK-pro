import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Sparkles, User, Wrench, Shield, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DemoSwitcher() {
  const { user, quickDemoLogin, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const demoProfiles = [
    {
      role: 'customer',
      title: 'Customer (Priya Sharma)',
      subtitle: 'HSR Layout, Bengaluru',
      email: 'priya.sharma@example.com',
      password: 'Customer@123',
      icon: <User className="w-4 h-4 text-teal-600" />,
      redirect: '/customer/dashboard'
    },
    {
      role: 'worker',
      title: 'Worker (Ramesh Kumar)',
      subtitle: 'Cleaning & Car Wash Pro (4.9★)',
      email: 'ramesh.cleaner@example.com',
      password: 'Worker@123',
      icon: <Wrench className="w-4 h-4 text-amber-600" />,
      redirect: '/worker/dashboard'
    },
    {
      role: 'worker',
      title: 'Worker (Suresh Gowda)',
      subtitle: 'Master Plumber & Electrician (4.8★)',
      email: 'suresh.plumber@example.com',
      password: 'Worker@123',
      icon: <Wrench className="w-4 h-4 text-emerald-600" />,
      redirect: '/worker/dashboard'
    },
    {
      role: 'admin',
      title: 'Admin (Vikram Malhotra)',
      subtitle: 'Super Admin with 2FA enabled',
      email: 'admin@sahaayak.com',
      password: 'Admin@123',
      twoFactorCode: '123456',
      icon: <Shield className="w-4 h-4 text-rose-600" />,
      redirect: '/admin/dashboard'
    }
  ];

  const handleSwitch = async (profile) => {
    try {
      setLoading(true);
      await quickDemoLogin(profile);
      addToast(`Switched account to ${profile.title}`, 'success');
      setOpen(false);
      navigate(profile.redirect);
    } catch (err) {
      addToast('Failed to switch demo profile: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-slate-200 border-b border-slate-800 text-xs py-1.5 px-4 z-40 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-brand-900/60 text-brand-300 font-semibold px-2 py-0.5 rounded-full border border-brand-700/50">
            <Sparkles className="w-3 h-3 text-saffron-400" /> Hackathon Demo Mode
          </span>
          <span className="hidden sm:inline text-slate-400">
            Current Role: <strong className="text-white capitalize">{user ? user.role : 'Guest'}</strong>
            {user && ` (${user.fullName})`}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium px-2.5 py-1 rounded-md border border-slate-700 transition-colors shadow-sm"
          >
            <span>⚡ 1-Click Role Switcher</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Select Demo Persona
                </div>
                {demoProfiles.map((p) => {
                  const isActive = user?.email === p.email;
                  return (
                    <button
                      key={p.email}
                      onClick={() => handleSwitch(p)}
                      className={`w-full text-left px-3 py-2 flex items-start gap-2.5 hover:bg-slate-50 transition-colors ${
                        isActive ? 'bg-brand-50/70' : ''
                      }`}
                    >
                      <div className="mt-0.5 p-1 rounded-md bg-slate-100 shrink-0">{p.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                          <span>{p.title}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-brand-600" />}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{p.subtitle}</div>
                      </div>
                    </button>
                  );
                })}

                {user && (
                  <div className="border-t border-slate-100 mt-1 pt-1 px-2">
                    <button
                      onClick={() => {
                        logout();
                        setOpen(false);
                        navigate('/');
                        addToast('Logged out of demo account', 'info');
                      }}
                      className="w-full text-center py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded font-medium transition-colors"
                    >
                      Log Out to Public View
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
