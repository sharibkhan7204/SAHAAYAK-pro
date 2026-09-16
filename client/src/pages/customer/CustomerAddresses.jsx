import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { MapPin, Plus, Trash2, Check, Home, Briefcase } from 'lucide-react';

export default function CustomerAddresses() {
  const { addToast } = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    label: 'Home',
    houseNo: '',
    buildingName: '',
    street: '',
    area: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560102',
    isDefault: false
  });

  const loadAddresses = async () => {
    try {
      const res = await api.get('/customers/addresses');
      setAddresses(res.data.addresses || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/customers/addresses', form);
      addToast('Address added successfully!', 'success');
      setShowAdd(false);
      setForm({
        label: 'Home',
        houseNo: '',
        buildingName: '',
        street: '',
        area: '',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560102',
        isDefault: false
      });
      loadAddresses();
    } catch (err) {
      addToast('Failed to save address: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/customers/addresses/${id}`);
      addToast('Address deleted.', 'info');
      loadAddresses();
    } catch (err) {
      addToast('Failed to delete address.', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Saved Addresses</h1>
          <p className="text-xs text-slate-500">Manage your doorstep service locations with automatic geocoding</p>
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{showAdd ? 'Cancel' : 'Add New Address'}</span>
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-lg space-y-4 text-xs">
          <h2 className="text-sm font-bold text-slate-900">Add Service Location</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Label</label>
              <select
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="Home">Home</option>
                <option value="Work">Work / Office</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="font-semibold text-slate-700">House / Flat / Building *</label>
              <input
                type="text"
                required
                value={form.houseNo}
                onChange={(e) => setForm({ ...form, houseNo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                placeholder="E.g. Flat 402, Oakwood Heights"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Street / Road *</label>
              <input
                type="text"
                required
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                placeholder="14th Main Road"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Area / Neighborhood *</label>
              <input
                type="text"
                required
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
                placeholder="HSR Layout, Sector 4"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">City *</label>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Pincode *</label>
              <input
                type="text"
                required
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-md"
          >
            Save Address
          </button>
        </form>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-2">
          <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No addresses saved yet</h3>
          <p className="text-xs text-slate-500">Add your home or office address for instant 1-click booking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    {a.label === 'Home' ? <Home className="w-4 h-4 text-brand-600" /> : <Briefcase className="w-4 h-4 text-saffron-600" />}
                    <span>{a.label}</span>
                  </div>
                  {Boolean(a.is_default) && (
                    <span className="bg-brand-50 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-brand-200">
                      Default
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {a.house_no}, {a.street}, {a.area}, {a.city}, {a.state} - {a.pincode}
                </p>

                <div className="text-[10px] text-slate-400 font-mono">
                  GPS: {Number(a.latitude).toFixed(4)}, {Number(a.longitude).toFixed(4)}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
