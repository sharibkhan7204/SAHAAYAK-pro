import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import { Menu, X, ArrowRight, User, LogOut, LayoutDashboard, Wrench, Shield, Briefcase } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'worker') return '/worker/dashboard';
    if (user.role === 'admin') return '/admin/dashboard';
    return '/customer/dashboard';
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
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 100 100" className="w-6 h-6 fill-none">
              <path d="M25 65C35 45 45 35 50 35C55 35 65 45 75 65" stroke="#F59E0B" strokeWidth="10" strokeLinecap="round"/>
              <circle cx="50" cy="24" r="11" fill="#FFFFFF"/>
              <path d="M35 50C42 42 46 38 50 38C54 38 58 42 65 50" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold font-display tracking-tight text-slate-900 leading-none">
              Sahaayak<span className="text-brand-600">.</span>
            </span>
            <span className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">Doorstep Services</span>
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
                className={`text-sm font-medium transition-colors hover:text-brand-600 ${
                  isActive ? 'text-brand-600 font-semibold' : 'text-slate-600'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth / Action Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <NotificationDropdown />
              
              <Link
                to={getDashboardPath()}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 transition-colors"
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
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="text-sm font-semibold text-slate-700 hover:text-brand-600 px-3 py-2 rounded-lg transition-colors"
              >
                Log In
              </Link>

              <Link
                to="/customer-signup"
                className="text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3.5 py-2 rounded-xl transition-colors"
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

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 lg:hidden">
          {user && <NotificationDropdown />}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
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
                  className="w-full py-2 text-center text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg"
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
                    className="flex-1 text-center py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/customer-signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center py-2 rounded-lg bg-slate-100 text-sm font-medium text-slate-800"
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
