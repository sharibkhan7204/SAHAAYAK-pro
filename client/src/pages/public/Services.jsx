import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Sparkles, ArrowRight, CheckCircle2, Filter } from 'lucide-react';

export default function Services() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [servRes, catRes] = await Promise.all([
          api.get('/services'),
          api.get('/services/categories')
        ]);
        setServices(servRes.data.services || []);
        setCategories(catRes.data.categories || []);
      } catch (e) {
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredServices = selectedCategory === 'all'
    ? services
    : services.filter(s => s.category_slug === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
          Explore All Doorstep Services
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Book verified local experts across home cleaning, repairs, electrical, painting, auto care, beauty, and relocation.
          All services backed by our <span className="font-semibold text-brand-700 dark:text-brand-400">Pay After Service</span> guarantee.
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap pb-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          All Categories ({services.length})
        </button>

        {categories.map((c) => (
          <button
            key={c.slug}
            onClick={() => setSelectedCategory(c.slug)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === c.slug
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="h-48 overflow-hidden relative bg-slate-100 dark:bg-slate-800">
                  <img
                    src={s.image_url}
                    alt={s.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm border border-transparent dark:border-slate-700">
                    {s.category_name}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {s.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {s.description}
                  </p>

                  <div className="space-y-1 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                      <span>Est. Duration: ~{s.estimated_duration_mins} mins</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                      <span>{s.requires_before_after_photos ? 'Before & after photo proof required' : 'Standard hygiene verification'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Pricing Model</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {s.pricing_model === 'range' && `₹${s.min_price} – ₹${s.max_price}`}
                      {s.pricing_model === 'fixed' && `₹${s.base_price}`}
                      {s.pricing_model === 'per_unit' && `₹${s.per_unit_price} / sq ft`}
                      {s.pricing_model === 'inspection_plus_charges' && `₹${s.inspection_fee} inspection + parts`}
                      {s.pricing_model === 'base_plus_distance' && `₹${s.base_price} base + ₹${s.per_km_price}/km`}
                    </span>
                  </div>

                  <Link
                    to={`/book/${s.slug}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition-colors"
                  >
                    <span>Book Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
