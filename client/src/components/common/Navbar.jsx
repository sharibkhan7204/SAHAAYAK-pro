import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import NotificationDropdown from './NotificationDropdown';
import {
  Menu, X, ArrowRight, User, LogOut, LayoutDashboard,
  Shield, Sun, Moon, Sparkles, Loader2
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, quickDemoLogin } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'worker') return '/worker/dashboard';
    if (user.role === 'admin') return '/admin/dashboard';
    return '/customer/dashboard';
  };

  const handleAdminLogin = async () => {
    try {
      setAdminLoading(true);
      await quickDemoLogin({
        role: 'admin',
        title: 'Admin (Vikram Malhotra)',
        email: 'admin@sahaayak.com',
        password: 'Admin@123',
        twoFactorCode: '123456'
      });
      addToast('Logged in as Administrator (Vikram Malhotra)', 'success');
      navigate('/admin/dashboard');
    } catch (err) {
      addToast(err.response?.data?.error || 'Admin login failed', 'error');
    } finally {
      setAdminLoading(false);
    }
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Services', path: '/services' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'Become a Worker', path: '/become-worker' },
    { label: 'About', path: '/about' },
    { label: 'FAQ', path: '/faq' }
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1.5 shadow-md shadow-slate-950/20 group-hover:scale-105 transition-transform">
            <img src="/logo.png" alt="Sahaayak Logo" className="w-full h-full object-contain filter drop-shadow" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold font-display tracking-tight text-slate-900 dark:text-white leading-none">
              Sahaayak<span className="text-brand-600 dark:text-brand-400">.</span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase font-semibold">Doorstep Services</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-brand-600 dark:hover:text-brand-400 ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth / Action Buttons */}
        <div className="hidden lg:flex items-center gap-2.5">
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-amber-300 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600 transition-transform hover:-rotate-12" />
            )}
          </button>

          {/* Conditional Admin Login Button (Visible ONLY when no user is signed in) */}
          {!user && (
            <button
              onClick={handleAdminLogin}
              disabled={adminLoading}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="Direct Access to Admin Command Center"
            >
              {adminLoading ? (
                <Loader2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-spin" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              )}
              <span>{adminLoading ? 'Logging in...' : 'Admin Login'}</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2.5">
              <NotificationDropdown />
              
              <Link
                to={getDashboardPath()}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 border border-brand-200 dark:border-brand-800 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>

              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                title="Log out"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 px-3 py-2 rounded-lg transition-colors"
              >
                Log In
              </Link>

              <Link
                to="/customer-signup"
                className="text-sm font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/50 border border-brand-200 dark:border-brand-800 px-3.5 py-2 rounded-xl transition-colors"
              >
                Sign Up
              </Link>

              <Link
                to="/services"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 rounded-xl shadow-md shadow-brand-600/20 transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <span>Book a Service</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu and controls */}
        <div className="flex items-center gap-2 lg:hidden">
          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>

          {user && <NotificationDropdown />}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 pt-3 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-brand-600 dark:hover:text-brand-400"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            {/* Conditional Admin Login Button on Mobile Drawer */}
            {!user && (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  handleAdminLogin();
                }}
                disabled={adminLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold text-xs shadow-xs"
              >
                <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>{adminLoading ? 'Logging in...' : 'Admin Login (Command Center)'}</span>
              </button>
            )}

            {user ? (
              <>
                <Link
                  to={getDashboardPath()}
                  onClick={() => setMobileOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm shadow-md"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to {user.role.toUpperCase()} Dashboard</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                    navigate('/');
                  }}
                  className="w-full py-2 text-center text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                >
                  Log Out ({user.fullName})
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/services"
                  onClick={() => setMobileOpen(false)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm shadow-md"
                >
                  <span>Book a Service</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/customer-signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center py-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    Sign Up
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
