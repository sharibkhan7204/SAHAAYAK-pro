import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Package, Plus, Edit2, Check, X, IndianRupee } from 'lucide-react';

export default function AdminServices() {
  const { addToast } = useToast();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadServices = async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        api.get('/services'),
        api.get('/services/categories')
      ]);
      setServices(sRes.data.services || []);
      setCategories(cRes.data.categories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put(`/admin/services/${editingService.id}`, editingService);
      addToast('Service configuration updated successfully!', 'success');
      setEditingService(null);
      loadServices();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update service.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-700">
      <div>
        <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Services & Pricing Architecture</h1>
        <p className="text-slate-500">
          Configure dynamic pricing models (Fixed, Range, Unit, Inspection, Distance), before/after photo requirements, and durations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s) => (
          <div
            key={s.id}
            className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition-shadow"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img src={s.image_url} alt="" className="w-12 h-12 rounded-xl object-cover bg-slate-100" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{s.name}</h3>
                  <span className="text-[10px] text-brand-700 uppercase font-bold tracking-wider">
                    Model: {s.pricing_model.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <p className="text-slate-500 text-[11px] line-clamp-2">{s.description}</p>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Configured Rate:</span>
                  <span className="font-bold text-emerald-600">
                    {s.pricing_model === 'range' && `₹${s.min_price} – ₹${s.max_price}`}
                    {s.pricing_model === 'fixed' && `₹${s.base_price}`}
                    {s.pricing_model === 'per_unit' && `₹${s.per_unit_price} / sq ft`}
                    {s.pricing_model === 'inspection_plus_charges' && `₹${s.inspection_fee} inspection + charges`}
                    {s.pricing_model === 'base_plus_distance' && `₹${s.base_price} base + ₹${s.per_km_price}/km`}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Duration / Radius:</span>
                  <span className="text-slate-700">~{s.estimated_duration_mins}m • {s.service_radius_km}km</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Photo Proofs:</span>
                  <span className="text-slate-700">{s.requires_before_after_photos ? 'Required' : 'Optional'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setEditingService({ ...s })}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-brand-700 font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Pricing & Rules</span>
            </button>
          </div>
        ))}
      </div>

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 text-xs text-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Configure {editingService.name}</h3>
              <button onClick={() => setEditingService(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Service Name</label>
                <input
                  type="text"
                  required
                  value={editingService.name}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Pricing Model</label>
                <select
                  value={editingService.pricing_model}
                  onChange={(e) => setEditingService({ ...editingService, pricing_model: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                >
                  <option value="fixed">Fixed Price</option>
                  <option value="range">Price Range (Min - Max)</option>
                  <option value="per_unit">Per Unit (e.g. per sq ft)</option>
                  <option value="inspection_plus_charges">Inspection Fee + Additional Charges</option>
                  <option value="base_plus_distance">Base Price + Distance per Km</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Base / Min Price (₹)</label>
                  <input
                    type="number"
                    value={editingService.base_price || editingService.min_price}
                    onChange={(e) => setEditingService({ ...editingService, base_price: Number(e.target.value), min_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Max Price (₹) (if range)</label>
                  <input
                    type="number"
                    value={editingService.max_price || 0}
                    onChange={(e) => setEditingService({ ...editingService, max_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Inspection Fee (₹)</label>
                  <input
                    type="number"
                    value={editingService.inspection_fee || 0}
                    onChange={(e) => setEditingService({ ...editingService, inspection_fee: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Per Unit Price (₹)</label>
                  <input
                    type="number"
                    value={editingService.per_unit_price || 0}
                    onChange={(e) => setEditingService({ ...editingService, per_unit_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Est. Duration (Mins)</label>
                  <input
                    type="number"
                    value={editingService.estimated_duration_mins}
                    onChange={(e) => setEditingService({ ...editingService, estimated_duration_mins: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Service Radius (Km)</label>
                  <input
                    type="number"
                    value={editingService.service_radius_km}
                    onChange={(e) => setEditingService({ ...editingService, service_radius_km: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="photoCheck"
                  checked={Boolean(editingService.requires_before_after_photos)}
                  onChange={(e) => setEditingService({ ...editingService, requires_before_after_photos: e.target.checked ? 1 : 0 })}
                  className="rounded"
                />
                <label htmlFor="photoCheck" className="text-slate-700 font-medium">
                  Require verified Before & After photos from partner
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/20"
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
