import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../contexts/ToastContext';
// Remove DemoSwitcher import
import Navbar from '../components/common/Navbar';
import api from '../services/api';
import { LayoutDashboard, Briefcase, IndianRupee, UserCheck, Power, Navigation, Bell, LogOut } from 'lucide-react';

export default function WorkerLayout() {
  const { user, loading, logout } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(false);
  const [incomingJob, setIncomingJob] = useState(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await api.get('/workers/dashboard');
        setIsOnline(Boolean(res.data.worker?.is_online));
      } catch (e) {}
    }
    if (user?.role === 'worker') {
      loadStatus();
    }
  }, [user]);

  // Socket listener for real-time incoming job dispatch
  useEffect(() => {
    if (socket) {
      const handleJobRequest = (jobData) => {
        setIncomingJob(jobData);
        // Play notification sound / alert
        addToast(`🚨 New Job Request: ${jobData.serviceName} (~${jobData.distanceKm} km away)`, 'warning', 8000);
      };

      socket.on('booking:job_request', handleJobRequest);
      return () => {
        socket.off('booking:job_request', handleJobRequest);
      };
    }
  }, [socket, addToast]);

  const handleToggleOnline = async () => {
    try {
      setToggleLoading(true);
      const nextState = !isOnline;

      let lat = 12.9150;
      let lng = 77.6400;

      // Try browser geolocation if available
      if (navigator.geolocation && nextState) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch (e) {
          // Geolocation unavailable or permission denied: fallback to city GPS coordinates
        }
      }

      const res = await api.post('/workers/status', {
        isOnline: nextState,
        latitude: lat,
        longitude: lng
      });

      setIsOnline(nextState);
      addToast(res.data.message, nextState ? 'success' : 'info');
    } catch (err) {
      addToast('Failed to toggle status: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setToggleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== 'worker') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const navItems = [
    { label: 'Dashboard', path: '/worker/dashboard', icon: LayoutDashboard },
    { label: 'My Jobs', path: '/worker/jobs', icon: Briefcase },
    { label: 'Earnings', path: '/worker/earnings', icon: IndianRupee },
    { label: 'Profile & KYC', path: '/worker/profile', icon: UserCheck }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 md:pb-0 transition-colors">
      
      {/* Worker Portal Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/worker/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center p-1 shadow-sm">
              <img src="/logo.png" alt="Sahaayak Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold font-display text-slate-900 tracking-tight">Sahaayak Partner</span>
              <div className="text-[11px] text-slate-500 leading-none">{user.fullName}</div>
            </div>
          </Link>

          {/* Online / Offline Toggle & Logout Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleToggleOnline}
              disabled={toggleLoading}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 radar-live'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${isOnline ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span>{isOnline ? 'ONLINE & READY' : 'OFFLINE'}</span>
            </button>

            <button
              onClick={() => {
                logout();
                addToast('Logged out of Partner Portal', 'info');
                navigate('/login');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-all cursor-pointer shadow-xs"
              title="Logout from Partner Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Worker Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        {/* Desktop Navigation Tabs */}
        <div className="hidden md:flex items-center gap-2 border-b border-slate-200 pb-3 mb-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white font-bold shadow-sm shadow-brand-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <Outlet />
      </div>

      {/* Incoming Job Modal / Alert */}
      {incomingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border-2 border-brand-500 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-brand-500 animate-ping" />
                <h3 className="font-bold text-lg text-slate-900">Incoming Job Request</h3>
              </div>
              <span className="bg-brand-50 text-brand-700 border border-brand-200 font-bold text-xs px-2.5 py-1 rounded-full">
                ~{incomingJob.distanceKm} km
              </span>
            </div>

            <div className="space-y-2 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Service:</span>
                <span className="font-semibold text-slate-900">{incomingJob.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Approx Area:</span>
                <span className="font-semibold text-slate-900">{incomingJob.approxArea || 'Nearby'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled:</span>
                <span className="font-semibold text-slate-900">{incomingJob.scheduledDate} ({incomingJob.scheduledTime})</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Estimated Pay:</span>
                <span className="font-bold text-emerald-600 text-base">₹{incomingJob.amount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={async () => {
                  try {
                    await api.post(`/bookings/${incomingJob.bookingId}/worker-respond`, { action: 'reject' });
                    setIncomingJob(null);
                    addToast('Job declined and re-routed to another partner.', 'info');
                  } catch (e) {
                    setIncomingJob(null);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-sm text-slate-700 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={async () => {
                  try {
                    await api.post(`/bookings/${incomingJob.bookingId}/worker-respond`, { action: 'accept' });
                    setIncomingJob(null);
                    addToast('Job accepted! Opening booking workflow...', 'success');
                    navigate(`/worker/jobs`);
                  } catch (e) {
                    addToast('Accept failed: ' + (e.response?.data?.error || e.message), 'error');
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 font-bold text-sm text-white shadow-lg shadow-brand-600/20 transition-all"
              >
                Accept Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-1 px-3 text-[10px] font-medium transition-colors ${
                isActive ? 'text-brand-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => {
            logout();
            addToast('Logged out of Partner Portal', 'info');
            navigate('/login');
          }}
          className="flex flex-col items-center py-1 px-3 text-[10px] font-medium text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5 mb-0.5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
