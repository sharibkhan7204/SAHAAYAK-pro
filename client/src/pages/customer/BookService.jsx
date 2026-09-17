import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import {
  Calendar, Clock, MapPin, Check, ArrowRight, ArrowLeft,
  ShieldCheck, IndianRupee, Sparkles, AlertCircle
} from 'lucide-react';

export default function BookService() {
  const { serviceId, slug } = useParams();
  const targetParam = serviceId || slug || 'srv_home_clean';
  const { user, quickDemoLogin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [allServices, setAllServices] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoggingIn, setDemoLoggingIn] = useState(false);

  // Wizard state
  const [step, setStep] = useState(1); // 1: Dynamic Details, 2: Address & Schedule, 3: Review & Confirm
  const [dynamicFields, setDynamicFields] = useState({});
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('09:00 AM - 11:00 AM');
  const [customerNotes, setCustomerNotes] = useState('');

  // New Address inline form if needed
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({
    houseNo: '',
    street: '',
    area: '',
    city: 'Bengaluru',
    pincode: '560102'
  });

  const initServiceFields = (s) => {
    if (s && s.formSchema && s.formSchema.fields) {
      const initial = {};
      s.formSchema.fields.forEach((f) => {
        if (f.default !== undefined) initial[f.name] = f.default;
        else if (f.options && f.options.length > 0) initial[f.name] = f.options[0];
        else initial[f.name] = '';
      });
      setDynamicFields(initial);
    } else {
      setDynamicFields({});
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setLoadError(null);

        // 1. Always load all active services to ensure a fallback list exists
        let servicesList = [];
        try {
          const allRes = await api.get('/services');
          servicesList = allRes.data?.services || [];
          setAllServices(servicesList);
        } catch (e) {
          console.warn('Could not fetch services list:', e);
        }

        // 2. Resolve the target service by slug or ID
        let matchedService = null;
        const lookup = (targetParam || '').trim();

        if (lookup && lookup !== 'undefined' && lookup !== 'null') {
          // Check in the servicesList
          matchedService = servicesList.find(s => s.slug === lookup || s.id === lookup);

          // If not found in list, attempt individual GET
          if (!matchedService) {
            try {
              const servRes = await api.get(`/services/${lookup}`);
              matchedService = servRes.data?.service;
            } catch (singleErr) {
              console.warn(`Direct lookup for service "${lookup}" not found.`);
            }
          }
        }

        // 3. Graceful fallback: If no service was matched or no parameter provided, use first service
        if (!matchedService && servicesList.length > 0) {
          matchedService = servicesList[0];
        }

        if (!matchedService) {
          setLoadError('Unable to load services catalog. Please verify that the backend server is running.');
          return;
        }

        setService(matchedService);
        initServiceFields(matchedService);

        // 4. Load addresses if user is logged in as customer
        const token = localStorage.getItem('sahaayak_token');
        if (token && user?.role === 'customer') {
          try {
            const addrRes = await api.get('/customers/addresses');
            const addrs = addrRes.data.addresses || [];
            setAddresses(addrs);
            if (addrs.length > 0) {
              const defaultAddr = addrs.find((a) => a.is_default) || addrs[0];
              setSelectedAddressId(defaultAddr.id);
            } else {
              setShowNewAddress(true);
            }
          } catch (addrErr) {
            console.warn('Could not fetch customer addresses:', addrErr);
            setShowNewAddress(true);
          }
        }
      } catch (err) {
        console.error('Error loading booking data:', err);
        setLoadError('Error loading service booking details. Please refresh or try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [targetParam, user]);

  const handleSelectService = (serviceId) => {
    const found = allServices.find(s => s.id === serviceId);
    if (found) {
      setService(found);
      initServiceFields(found);
    }
  };

  const handleFieldChange = (name, val) => {
    setDynamicFields((prev) => ({ ...prev, [name]: val }));
  };

  const handleQuickDemoCustomer = async () => {
    try {
      setDemoLoggingIn(true);
      await quickDemoLogin({
        email: 'priya.sharma@example.com',
        password: 'Customer@123',
        role: 'customer'
      });
      addToast('Logged in as Demo Customer (Priya Sharma)!', 'success');
      const addrRes = await api.get('/customers/addresses');
      const addrs = addrRes.data.addresses || [];
      setAddresses(addrs);
      if (addrs.length > 0) {
        setSelectedAddressId(addrs[0].id);
        setShowNewAddress(false);
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to log in as demo customer.', 'error');
    } finally {
      setDemoLoggingIn(false);
    }
  };

  const handleSaveNewAddress = async (e) => {
    e.preventDefault();
    if (!user) {
      return addToast('Please sign in or use demo login to save an address.', 'warning');
    }
    try {
      const res = await api.post('/customers/addresses', {
        ...newAddr,
        label: 'Home',
        isDefault: true
      });
      setAddresses((prev) => [res.data.address, ...prev]);
      setSelectedAddressId(res.data.address.id);
      setShowNewAddress(false);
      addToast('Address saved!', 'success');
    } catch (err) {
      addToast('Failed to save address: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  // Price estimate calculation
  const calculateEstimatedTotal = () => {
    if (!service) return 0;
    let base = Number(service.base_price || 0);

    if (service.pricing_model === 'range') {
      base = Number(service.min_price || service.base_price);
    } else if (service.pricing_model === 'per_unit') {
      const sqft = Number(dynamicFields.approx_sqft || 800);
      base = sqft * Number(service.per_unit_price || 12);
    } else if (service.pricing_model === 'inspection_plus_charges') {
      base = Number(service.inspection_fee || 99);
    } else if (service.pricing_model === 'base_plus_distance') {
      base = Number(service.base_price || 30) + (10 * Number(service.per_km_price || 10));
    }
    return Math.round(base);
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      addToast('Please sign in or use 1-click demo login to place a booking.', 'warning');
      setStep(2);
      return;
    }

    if (user.role !== 'customer') {
      return addToast(`You are signed in as a ${user.role}. Please switch to a Customer account to book.`, 'warning');
    }

    if (!selectedAddressId) {
      return addToast('Please select or add a service address.', 'warning');
    }

    try {
      setSubmitting(true);
      const res = await api.post('/bookings', {
        serviceId: service.id,
        addressId: selectedAddressId,
        scheduledDate,
        scheduledTime,
        dynamicFields,
        customerNotes
      });

      addToast('Booking placed! Automatic worker assignment in progress...', 'success');
      navigate(`/customer/bookings/${res.data.booking.id}`);
    } catch (err) {
      addToast(err.response?.data?.error || 'Booking failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError && !service) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Service Catalog Notice</h2>
        <p className="text-xs text-slate-600 leading-relaxed">{loadError}</p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-sm"
          >
            Retry Connection
          </button>
          <button
            onClick={() => navigate('/services')}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs"
          >
            Browse Services
          </button>
        </div>
      </div>
    );
  }

  if (loading || !service) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const selectedAddrObj = addresses.find((a) => a.id === selectedAddressId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Stepper Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            Book {service.name}
          </h1>
          <p className="text-xs text-slate-500">Pay After Service • Transparent Pricing</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={`px-2.5 py-1 rounded-full ${step === 1 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            1. Details
          </span>
          <span>→</span>
          <span className={`px-2.5 py-1 rounded-full ${step === 2 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            2. Schedule
          </span>
          <span>→</span>
          <span className={`px-2.5 py-1 rounded-full ${step === 3 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            3. Confirm
          </span>
        </div>
      </div>

      {/* STEP 1: DYNAMIC SERVICE SPECIFIC DETAILS */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 flex-wrap">
            <div className="flex items-center gap-3">
              <img src={service.image_url} alt="" className="w-14 h-14 rounded-2xl object-cover bg-slate-100" />
              <div>
                <h2 className="text-base font-bold text-slate-900">{service.name} Customization</h2>
                <p className="text-xs text-slate-500">{service.description}</p>
              </div>
            </div>

            {allServices.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Select Service:</span>
                <select
                  value={service.id}
                  onChange={(e) => handleSelectService(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {allServices.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-4 text-xs">
            {service.formSchema?.fields?.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <label className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>{f.label} {f.required && <span className="text-rose-500">*</span>}</span>
                </label>

                {f.type === 'select' && (
                  <select
                    value={dynamicFields[f.name] || ''}
                    onChange={(e) => handleFieldChange(f.name, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    {f.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {f.type === 'number' && (
                  <input
                    type="number"
                    min={f.min || 1}
                    max={f.max || 99999}
                    value={dynamicFields[f.name] ?? f.default ?? ''}
                    onChange={(e) => handleFieldChange(f.name, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                )}

                {f.type === 'textarea' && (
                  <textarea
                    rows={3}
                    placeholder={f.placeholder || ''}
                    value={dynamicFields[f.name] || ''}
                    onChange={(e) => handleFieldChange(f.name, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                )}

                {['text', 'tel'].includes(f.type) && (
                  <input
                    type={f.type}
                    placeholder={f.placeholder || ''}
                    value={dynamicFields[f.name] || ''}
                    onChange={(e) => handleFieldChange(f.name, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              <span>Next: Address & Schedule</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: ADDRESS & SCHEDULE */}
      {step === 2 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 text-xs">
          {/* Customer Auth prompt banner if not logged in as customer */}
          {(!user || user.role !== 'customer') && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {!user
                      ? 'Sign in as a Customer to place this booking'
                      : `Currently signed in as ${user.role}. Bookings require a Customer account.`}
                  </span>
                </div>
                <p className="text-[11px] text-amber-700">
                  You can use our pre-seeded test customer account with 1-click or sign in with your email.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={demoLoggingIn}
                  onClick={handleQuickDemoCustomer}
                  className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-saffron-300" />
                  <span>{demoLoggingIn ? 'Logging in...' : '1-Click Demo Customer'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/login?redirect=/book/${targetParam}`)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}

          {/* Address selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-600" /> Select Service Address
              </h2>
              <button
                type="button"
                onClick={() => setShowNewAddress(!showNewAddress)}
                className="text-brand-600 hover:underline font-bold text-xs"
              >
                {showNewAddress ? 'Cancel New Address' : '+ Add New Address'}
              </button>
            </div>

            {showNewAddress && (
              <form onSubmit={handleSaveNewAddress} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Flat / House / Street</label>
                  <input
                    type="text"
                    required
                    value={newAddr.houseNo}
                    onChange={(e) => setNewAddr({ ...newAddr, houseNo: e.target.value, street: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="E.g. #204, 3rd Cross, HSR Sector 2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Area</label>
                    <input
                      type="text"
                      required
                      value={newAddr.area}
                      onChange={(e) => setNewAddr({ ...newAddr, area: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="HSR Layout"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Pincode</label>
                    <input
                      type="text"
                      required
                      value={newAddr.pincode}
                      onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-sm"
                >
                  Save Address
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {addresses.map((a) => {
                const isSelected = selectedAddressId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAddressId(a.id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/70 shadow-sm font-medium'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{a.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-brand-600" />}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-snug">
                      {a.house_no}, {a.street}, {a.area}, {a.city} - {a.pincode}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule selection */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand-600" /> Choose Date & Preferred Time Slot
            </h2>

            {/* Quick Date Chips */}
            <div className="space-y-2">
              <label className="font-semibold text-slate-700 block text-xs">Service Date</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {[
                  { label: 'Today (Express)', days: 0 },
                  { label: 'Tomorrow', days: 1 },
                  { label: 'In 2 Days', days: 2 }
                ].map(chip => {
                  const d = new Date();
                  d.setDate(d.getDate() + chip.days);
                  const val = d.toISOString().split('T')[0];
                  const isSelected = scheduledDate === val;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setScheduledDate(val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        isSelected
                          ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {chip.label} ({d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })})
                    </button>
                  );
                })}
              </div>

              <input
                type="date"
                required
                value={scheduledDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full sm:w-64 px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
              />
            </div>

            {/* Visual Time Slot Cards */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 block text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-600" /> Select Technician Arrival Window
                </label>
                <span className="text-[11px] text-brand-700 font-bold bg-brand-50 px-2 py-0.5 rounded">
                  Selected: {scheduledTime}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[
                  { time: '08:00 AM - 11:00 AM', label: 'Morning Slot', icon: '🌅', desc: 'Best for early starts' },
                  { time: '11:30 AM - 01:30 PM', label: 'Midday Slot', icon: '☀️', desc: 'Lunchtime availability' },
                  { time: '02:00 PM - 04:30 PM', label: 'Afternoon Slot', icon: '🌇', desc: 'Standard afternoon' },
                  { time: '05:00 PM - 07:30 PM', label: 'Evening Slot', icon: '🌆', desc: 'After-office hours' },
                  { time: '07:30 PM - 09:30 PM', label: 'Night Shift', icon: '🌙', desc: 'Emergency / late evening' }
                ].map(slot => {
                  const isSelected = scheduledTime === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setScheduledTime(slot.time)}
                      className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50/90 text-brand-950 font-bold ring-2 ring-brand-500/30 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-2xl">{slot.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400">{slot.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-brand-600" />}
                        </div>
                        <span className="text-xs font-bold text-slate-900 block truncate">{slot.time}</span>
                        <span className="text-[10px] text-slate-500">{slot.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="font-semibold text-slate-700">Instructions for Technician (Optional)</label>
              <input
                type="text"
                placeholder="E.g., Call before entering security gate, landmark near water tank..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-bold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              <span>Review Booking</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & CONFIRM */}
      {step === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 text-xs">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Review Booking Summary</h2>
            <p className="text-slate-500">Confirm your request. You will pay ONLY AFTER the service is finished.</p>
          </div>

          {/* Summary Box */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-slate-600 font-medium">Service:</span>
              <strong className="text-slate-900 font-bold">{service.name}</strong>
            </div>

            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-slate-600 font-medium">Schedule:</span>
              <span className="text-slate-900 font-semibold">{scheduledDate} ({scheduledTime})</span>
            </div>

            <div className="flex justify-between items-start border-b border-slate-200 pb-2">
              <span className="text-slate-600 font-medium">Service Address:</span>
              <span className="text-slate-900 font-semibold text-right max-w-xs">
                {selectedAddrObj ? `${selectedAddrObj.house_no}, ${selectedAddrObj.street}, ${selectedAddrObj.area}, ${selectedAddrObj.city}` : 'Default Address'}
              </span>
            </div>

            {/* Dynamic fields breakdown */}
            <div className="space-y-1 border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">Specifications:</span>
              {Object.entries(dynamicFields).map(([k, v]) => (
                <div key={k} className="flex justify-between text-slate-700">
                  <span className="capitalize">{k.replace(/_/g, ' ')}:</span>
                  <span className="font-semibold">{String(v)}</span>
                </div>
              ))}
            </div>

            {/* Price Row */}
            <div className="flex justify-between items-center pt-1 text-sm font-bold text-slate-900">
              <span>Estimated Payable Amount:</span>
              <span className="text-brand-700 text-lg">₹{calculateEstimatedTotal()}</span>
            </div>
            <div className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pay After Service Guarantee: No advance payment taken today.</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-bold"
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmBooking}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold text-xs shadow-lg shadow-brand-600/20 transition-all hover:scale-105"
            >
              {submitting ? 'Matching Worker...' : 'Confirm & Request Worker'}
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
