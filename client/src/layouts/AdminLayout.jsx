import React, { useState } from 'react';
import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DemoSwitcher from '../components/common/DemoSwitcher';
import {
  LayoutDashboard, UserCheck, Users, Wrench, Package, Calendar,
  Sliders, Percent, AlertOctagon, Star, FileText, Download, Menu, X, Shield, LogOut
} from 'lucide-react';

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const navGroups = [
    {
      title: 'OPERATIONS',
      items: [
        { label: 'Dashboard KPIs', path: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Worker KYC Queue', path: '/admin/verification', icon: UserCheck, badge: 'Pending' },
        { label: 'Bookings Registry', path: '/admin/bookings', icon: Calendar },
        { label: 'Complaints & Disputes', path: '/admin/complaints', icon: AlertOctagon }
      ]
    },
    {
      title: 'PEOPLE & CATALOG',
      items: [
        { label: 'Gig Workers', path: '/admin/workers', icon: Wrench },
        { label: 'Customers', path: '/admin/customers', icon: Users },
        { label: 'Services & Pricing', path: '/admin/services', icon: Package },
        { label: 'Review Moderation', path: '/admin/reviews', icon: Star }
      ]
    },
    {
      title: 'ENGINE & SETTINGS',
      items: [
        { label: 'Assignment Weights', path: '/admin/assignment', icon: Sliders },
        { label: 'Commission Rules', path: '/admin/commission', icon: Percent },
        { label: 'Security Audit Logs', path: '/admin/audit-logs', icon: FileText },
        { label: 'Data Reports (CSV)', path: '/admin/reports', icon: Download }
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <DemoSwitcher />

      <div className="flex-1 flex">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 shadow-xs ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Admin Header */}
          <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
            <Link to="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-bold font-display text-slate-900 tracking-tight">Sahaayak Admin</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-500 hover:text-slate-900 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {navGroups.map((group) => (
              <div key={group.title}>
                <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {group.title}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Admin Profile Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs border border-brand-200">
                A
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate">{user.fullName}</div>
                <div className="text-[10px] text-slate-500">Super Admin (2FA)</div>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              title="Log out"
              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Top Navbar with hamburger */}
          <header className="lg:hidden h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-600 hover:text-slate-900 p-1"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-sm font-bold text-slate-900">Sahaayak Administration</span>
            <div className="w-6" />
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
