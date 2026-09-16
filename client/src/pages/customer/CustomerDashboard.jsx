import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import {
  Calendar, Clock, MapPin, ArrowRight, CheckCircle2, AlertCircle,
  Sparkles, Wrench, ChevronRight, User, ShieldCheck, Check,
  Zap, Star, Plus, RefreshCw, Layers
} from 'lucide-react';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeBooking, setActiveBooking] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Book state
  const [selectedService, setSelectedService] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('08:00 AM - 11:00 AM');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all' | 'active' | 'completed'

  const timeSlots = [
    { time: '08:00 AM - 11:00 AM', label: 'Morning Slot', icon: '🌅', desc: '8:00 AM to 11:00 AM' },
    { time: '11:30 AM - 01:30 PM', label: 'Midday Slot', icon: '☀️', desc: '11:30 AM to 1:30 PM' },
    { time: '02:00 PM - 04:30 PM', label: 'Afternoon Slot', icon: '🌇', desc: '2:00 PM to 4:30 PM' },
    { time: '05:00 PM - 07:30 PM', label: 'Evening Slot', icon: '🌆', desc: '5:00 PM to 7:30 PM' },
    { time: '07:30 PM - 09:30 PM', label: 'Night Shift', icon: '🌙', desc: '7:30 PM to 9:30 PM' }
  ];

  const statusColors = {
    finding_worker: 'bg-amber-100 text-amber-800 border-amber-200',
    worker_assigned: 'bg-blue-100 text-blue-800 border-blue-200',
    worker_accepted: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    worker_on_the_way: 'bg-purple-100 text-purple-800 border-purple-200',
    worker_arrived: 'bg-teal-100 text-teal-800 border-teal-200',
    service_started: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    service_completed: 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse',
    customer_confirmation: 'bg-amber-100 text-amber-900 border-amber-300',
    payment_completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    booking_closed: 'bg-slate-100 text-slate-700 border-slate-200',
    cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
    disputed: 'bg-rose-100 text-rose-800 border-rose-200'
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, servicesRes, profileRes] = await Promise.all([
        api.get('/bookings'),
        api.get('/services'),
        api.get('/customers/profile')
      ]);

      const myBookings = bookingsRes.data.bookings || [];
      setAllBookings(myBookings);

      // Find highest priority active booking
      const active = myBookings.find(b =>
        !['booking_closed', 'cancelled', 'payment_completed'].includes(b.status)
      );
      setActiveBooking(active || null);

      const servs = servicesRes.data.services || [];
      setServices(servs);
      if (servs.length > 0 && !selectedService) {
        setSelectedService(servs[0]);
      }

      const addrs = profileRes.data.addresses || [];
      setAddresses(addrs);
      if (addrs.length > 0) {
        const defaultAddr = addrs.find(a => a.is_default) || addrs[0];
        setSelectedAddressId(defaultAddr.id);
      }
    } catch (err) {
      console.error('Error loading customer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickBook = async (e) => {
    e.preventDefault();
    if (!selectedService) {
      addToast('Please select a service first', 'error');
      return;
    }
    if (!selectedAddressId) {
      addToast('Please select or add a service address', 'error');
      return;
    }

    try {
      setBookingInProgress(true);
      const res = await api.post('/bookings', {
        serviceId: selectedService.id,
        addressId: selectedAddressId,
        scheduledDate: selectedDate,
        scheduledTime: selectedTimeSlot,
        dynamicFields: {},
        customerNotes: 'Booked via Customer Hub Dashboard'
      });

      addToast(`Booking #${res.data.booking?.booking_number} confirmed! Auto-assigning nearest verified partner...`, 'success');
      // Refresh bookings
      await loadDashboardData();
      if (res.data.booking?.id) {
        navigate(`/customer/bookings/${res.data.booking.id}`);
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to create booking', 'error');
    } finally {
      setBookingInProgress(false);
    }
  };

  const filteredBookings = allBookings.filter(b => {
    if (bookingFilter === 'active') {
      return !['booking_closed', 'cancelled', 'payment_completed'].includes(b.status);
    }
    if (bookingFilter === 'completed') {
      return ['payment_completed', 'booking_closed'].includes(b.status);
    }
    return true;
  });

  const filteredServices = selectedCategory === 'all'
    ? services
    : services.filter(s => s.category_slug?.includes(selectedCategory) || s.category_name?.toLowerCase().includes(selectedCategory));

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <div className="animate-spin w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. Header Banner & Trust Guarantee */}
      <div className="bg-gradient-to-r from-brand-800 via-brand-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-xs border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-saffron-400" /> Sahaayak Verified Customer Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight">
            Namaste, {user?.fullName || 'Valued Customer'}!
          </h1>
          <p className="text-xs sm:text-sm text-brand-100 leading-relaxed">
            Welcome to your service dashboard. View active bookings, select time slots, and dispatch verified gig workers right to your doorstep with our strict <strong>Pay-After-Service Guarantee</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center min-w-[110px]">
            <span className="text-[10px] uppercase font-bold text-brand-200 block">My Bookings</span>
            <span className="text-2xl font-black text-white">{allBookings.length}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center min-w-[110px]">
            <span className="text-[10px] uppercase font-bold text-brand-200 block">Pay After Job</span>
            <span className="text-2xl font-black text-emerald-300">₹0 Adv</span>
          </div>
        </div>
      </div>

      {/* 2. ACTIVE BOOKING LIVE RADAR (If customer has an ongoing job) */}
      {activeBooking ? (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-brand-500 shadow-xl space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-brand-600"></span>
              </span>
              <h2 className="text-lg font-bold text-slate-900">Active Service in Progress</h2>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${statusColors[activeBooking.status] || 'bg-slate-100'}`}>
              {activeBooking.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Service Details</span>
              <h3 className="text-base font-bold text-slate-900">{activeBooking.service_name}</h3>
              <p className="text-xs text-slate-500">Booking #{activeBooking.booking_number}</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
                <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span>{activeBooking.cust_area || 'Your Address'}, {activeBooking.cust_city || 'Bengaluru'}</span>
              </div>
            </div>

            <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400">Arrival Window</span>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Calendar className="w-4 h-4 text-brand-600" />
                <span>{activeBooking.scheduled_date}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>{activeBooking.scheduled_time}</span>
              </div>
              {activeBooking.worker_name && (
                <div className="text-xs text-slate-700 pt-1 font-medium">
                  Partner: <strong className="text-brand-700">{activeBooking.worker_name}</strong>
                  {activeBooking.worker_rating && ` (★ ${activeBooking.worker_rating})`}
                </div>
              )}
            </div>

            <div className="space-y-3 text-right md:text-right flex flex-col justify-between h-full">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Payable After Service</span>
                <span className="text-2xl font-black text-brand-700">₹{activeBooking.final_amount || activeBooking.base_service_amount}</span>
                <span className="text-[11px] text-emerald-600 font-semibold block">0% Advance • Pay upon satisfaction</span>
              </div>

              <Link
                to={`/customer/bookings/${activeBooking.id}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition"
              >
                <span>Live Tracking & Details</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-emerald-950">No Ongoing Active Bookings</h3>
              <p className="text-[11px] text-emerald-800">You are all caught up! Book a certified technician below in 60 seconds.</p>
            </div>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('book-service-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            Book New Service
          </button>
        </div>
      )}

      {/* 3. BOOK SERVICE & TIME SLOT SELECTION WORKBENCH */}
      <div id="book-service-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 uppercase tracking-wider">
              <Zap className="w-4 h-4" /> Instant Booking Workbench
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              1. Choose Service &amp; 2. Select Time Slot
            </h2>
            <p className="text-xs text-slate-500">Pick your preferred service, arrival date, and convenient time window.</p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Services' },
              { id: 'cleaning', label: 'Cleaning' },
              { id: 'repairs', label: 'Repairs' },
              { id: 'improvement', label: 'Painting' },
              { id: 'auto', label: 'Auto' },
              { id: 'logistics', label: 'Moving' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Services Grid Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 block">Step 1: Select Service ({filteredServices.length} available)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredServices.map(s => {
              const isSelected = selectedService?.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedService(s)}
                  className={`p-3.5 rounded-2xl border text-left transition relative flex flex-col justify-between group ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/70 ring-2 ring-brand-500/30 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      <img src={s.image_url} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{s.name}</h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{s.category_name}</p>
                      <div className="text-xs font-extrabold text-brand-700 mt-1">
                        {s.pricing_model === 'range' ? `From ₹${s.min_price}` : `₹${s.base_price}`}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center absolute top-2 right-2 shadow">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* TIME SLOT SELECTION & ADDRESS SECTION */}
        {selectedService && (
          <div className="bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                Step 2: Time Slot &amp; Scheduling for {selectedService.name}
              </h3>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Guaranteed Pay-After-Service
              </span>
            </div>

            {/* Date Quick Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Choose Date</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Today (Express)', days: 0 },
                  { label: 'Tomorrow', days: 1 },
                  { label: 'Day After Tomorrow', days: 2 }
                ].map(chip => {
                  const d = new Date();
                  d.setDate(d.getDate() + chip.days);
                  const val = d.toISOString().split('T')[0];
                  const isSelected = selectedDate === val;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setSelectedDate(val)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                        isSelected
                          ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {chip.label} ({d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })})
                    </button>
                  );
                })}

                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Visual Time Slot Selection Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">Select Preferred Arrival Window</label>
                <span className="text-[11px] text-brand-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                  Selected Time Slot: {selectedTimeSlot}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {timeSlots.map(slot => {
                  const isSelected = selectedTimeSlot === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setSelectedTimeSlot(slot.time)}
                      className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-brand-600 bg-white ring-2 ring-brand-500/30 text-slate-900 shadow-sm font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-2xl">{slot.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400">{slot.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-brand-600" />}
                        </div>
                        <span className="text-xs font-bold text-slate-900 block truncate">{slot.time}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Address Selection & Confirm Actions */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 w-full sm:w-auto">
                <label className="text-xs font-bold text-slate-700 block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" /> Confirm Delivery Address
                </label>
                {addresses.length > 0 ? (
                  <select
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-72 focus:ring-2 focus:ring-brand-500 font-medium"
                  >
                    {addresses.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.label}: {a.house_no}, {a.area}, {a.city}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Link to="/customer/addresses" className="text-xs text-brand-600 font-bold hover:underline">
                    + Add a service address first
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Link
                  to={`/customer/book/${selectedService.id}`}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
                >
                  Custom Details &amp; Notes
                </Link>

                <button
                  type="button"
                  disabled={bookingInProgress || !selectedAddressId}
                  onClick={handleQuickBook}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {bookingInProgress ? 'Dispatching Partner...' : 'Book Time Slot Now (Pay Later)'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. MY BOOKINGS REGISTRY & HISTORY */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">My Bookings &amp; Service History</h2>
            <p className="text-xs text-slate-500">Track current jobs, view timeline, and access receipts.</p>
          </div>

          <div className="flex gap-2">
            {[
              { id: 'all', label: `All (${allBookings.length})` },
              { id: 'active', label: 'In Progress' },
              { id: 'completed', label: 'Completed' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setBookingFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  bookingFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Calendar className="w-12 h-12 mx-auto text-slate-300" />
            <h4 className="text-sm font-bold text-slate-700">No bookings under this filter</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Select a service above and choose your time slot to book your first verified gig worker!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBookings.map(b => (
              <Link
                key={b.id}
                to={`/customer/bookings/${b.id}`}
                className="bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200 p-5 rounded-2xl transition-all group flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">#{b.booking_number}</span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                      {b.service_name}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${statusColors[b.status] || 'bg-slate-100'}`}>
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.scheduled_date}</span>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-800">{b.scheduled_time}</span>
                  </div>
                  {b.cust_area && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{b.cust_area}, {b.cust_city}</span>
                    </div>
                  )}
                  {b.worker_name && (
                    <div className="text-xs text-brand-700 font-semibold pt-1">
                      Assigned Technician: {b.worker_name}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">TOTAL AMOUNT</span>
                    <span className="text-sm font-black text-slate-900">₹{b.final_amount || b.base_service_amount}</span>
                  </div>
                  <span className="text-xs font-bold text-brand-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>Manage &amp; Track</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
