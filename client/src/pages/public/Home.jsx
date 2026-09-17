import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, ShieldCheck, Clock, IndianRupee, HeartHandshake, CheckCircle2,
  ArrowRight, Star, ChevronRight, HelpCircle, Wrench, Truck, Paintbrush, Car, Heart
} from 'lucide-react';
import api from '../../services/api';

export default function Home() {
  const [services, setServices] = useState([]);
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await api.get('/services');
        setServices(res.data.services || []);
      } catch (e) {}
    }
    loadServices();
  }, []);

  const faqs = [
    {
      q: 'Do I have to pay before the service is completed?',
      a: 'Never! Sahaayak strictly operates on a "Pay After Service" guarantee. You only pay after our verified professional visits your address, completes the job, and you confirm full satisfaction.'
    },
    {
      q: 'How does the ₹0 platform commission benefit workers and customers?',
      a: 'Unlike traditional apps that deduct 25-35% from every booking, Sahaayak charges ₹0 platform fee on all standard jobs up to ₹599. On larger jobs above ₹599, only a modest 10% fee is applied to labour, while 100% of parts/materials and tips go directly to the worker. This ensures fair pricing for customers and transparent, dignified earnings for workers.'
    },
    {
      q: 'How are gig workers verified on Sahaayak?',
      a: 'Every worker undergoes a 4-step national verification protocol: Government ID (Aadhaar/PAN/Driving License) inspection, skill evaluation, background reference checks, and verified UPI/bank credentials.'
    },
    {
      q: 'How does automatic worker assignment work?',
      a: 'Our smart algorithm evaluates worker proximity, skill match, real-time availability, performance rating, and fairness rotation to immediately assign the nearest eligible partner within seconds.'
    }
  ];

  return (
    <div className="space-y-20 pb-20 transition-colors duration-200">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-brand-50/70 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900/90 dark:to-slate-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100/80 dark:bg-brand-950/80 border border-brand-200 dark:border-brand-800 text-brand-800 dark:text-brand-300 text-xs font-semibold shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-saffron-600 dark:text-saffron-400" />
                <span>India's Fair Gig Marketplace • Zero Commission below ₹599</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                Sahaayak — <br />
                <span className="text-gradient">Trusted Services,</span> <br />
                Right at Your Doorstep.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Connect with verified local electricians, plumbers, housekeepers, and technicians.
                Enjoy transparent upfront pricing, automated instant partner matching, and pay only after service completion.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  to="/services"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold text-sm shadow-lg shadow-brand-600/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
                >
                  <span>Book a Service</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/become-worker"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold text-sm border border-slate-300 dark:border-slate-700 shadow-sm transition-all"
                >
                  <Wrench className="w-4 h-4 text-saffron-600 dark:text-saffron-400" />
                  <span>Become a Service Partner</span>
                </Link>
              </div>

              {/* Value Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <span>Pay After Service</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <span>Verified Workers</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <span>Transparent Rates</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <span>Instant Assignment</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Visual Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5 transition-colors">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-950 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold">
                      RK
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">Ramesh Kumar</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Deep Cleaning Specialist • 4.9★</div>
                    </div>
                  </div>
                  <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 border border-transparent dark:border-emerald-800/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Verified
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/70 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs transition-colors">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Service:</span>
                    <strong className="text-slate-900 dark:text-slate-100">3 BHK Deep Cleaning</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Assigned Via:</span>
                    <span className="text-brand-700 dark:text-brand-400 font-semibold">Automatic Fairness Engine</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Platform Commission:</span>
                    <strong className="text-emerald-700 dark:text-emerald-400">₹0 on Small Jobs (Protected)</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                    <span>Payable After Work:</span>
                    <span className="text-brand-600 dark:text-brand-400">₹1,999</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>📍 HSR Layout, Bengaluru (1.2 km away)</span>
                  <span className="font-semibold text-brand-600 dark:text-brand-400">ETA: 15 Mins</span>
                </div>

                <Link
                  to="/services"
                  className="w-full block text-center py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs transition-colors shadow-md"
                >
                  Explore All 9 Categories
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Services Catalog */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <h2 className="text-3xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
            Popular Doorstep Services
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Transparent pricing models. No hidden surge charges or arbitrary commission markups.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.slice(0, 6).map((service) => (
            <div
              key={service.id}
              className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-500/50 hover:shadow-xl transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 shadow-sm border border-transparent dark:border-slate-700">
                    {service.category_name}
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Pricing</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {service.pricing_model === 'range' && `₹${service.min_price} – ₹${service.max_price}`}
                      {service.pricing_model === 'fixed' && `₹${service.base_price}`}
                      {service.pricing_model === 'per_unit' && `₹${service.per_unit_price} / sq ft`}
                      {service.pricing_model === 'inspection_plus_charges' && `₹${service.inspection_fee} inspection + parts`}
                      {service.pricing_model === 'base_plus_distance' && `₹${service.base_price} base + ₹${service.per_km_price}/km`}
                    </span>
                  </div>

                  <Link
                    to={`/book/${service.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                  >
                    <span>Book</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 bg-brand-50 dark:bg-slate-900 hover:bg-brand-100 dark:hover:bg-slate-800 border border-brand-200 dark:border-slate-700 px-6 py-3 rounded-xl transition-colors"
          >
            <span>View All 9 Services & Pricing Details</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* How It Works (Step by step workflow) */}
      <section className="bg-slate-900 dark:bg-slate-950 text-white py-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs uppercase font-bold tracking-wider text-saffron-400">Streamlined Process</span>
            <h2 className="text-3xl font-extrabold font-display tracking-tight">How Sahaayak Works</h2>
            <p className="text-sm text-slate-400">
              Transparent, automated, and fair at every milestone from request to invoice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Choose Service', desc: 'Select from 9 specialized categories and customize your service requirements dynamically.' },
              { step: '02', title: 'Auto Partner Matching', desc: 'Our scoring engine selects the nearest, highest-rated provider without manual delays.' },
              { step: '03', title: 'Doorstep Service', desc: 'Worker arrives with digital verification, uploads before/after proofs, and executes the job.' },
              { step: '04', title: 'Confirm & Pay', desc: 'Inspect work, confirm satisfaction, and pay via UPI/Card or Cash with an instant digital PDF invoice.' }
            ].map((s) => (
              <div key={s.step} className="bg-slate-800/80 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-700 dark:border-slate-800 relative group hover:border-brand-500 transition-colors">
                <div className="text-3xl font-extrabold font-display text-brand-400/80 mb-3">{s.step}</div>
                <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Worker & Customer Benefits Comparison */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Worker Benefits */}
          <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-3xl p-8 space-y-6 transition-colors">
            <div className="inline-flex items-center gap-2 bg-amber-200/60 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 font-bold px-3 py-1 rounded-full text-xs">
              <Wrench className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> For Service Providers
            </div>
            <h3 className="text-2xl font-bold font-display text-slate-900 dark:text-white">Why Workers Choose Sahaayak</h3>
            <ul className="space-y-3.5 text-sm text-slate-700 dark:text-slate-300">
              {[
                'Zero Commission on small jobs up to ₹599 (Keep 100% of labour earnings!)',
                '100% of customer tips transferred directly with zero platform deductions',
                'Flexible schedules: Toggle Online/Offline anytime and define custom service radiuses',
                'Transparent payout ledger: Real-time tracking of gross earnings, cash collections, and dues',
                'Fair job rotation engine: No monopoly; every verified partner receives equal opportunities',
                'Protection against unfair customer cancellations and disputes'
              ].map((b, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/become-worker"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <span>Join as a Sahaayak Partner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Customer Benefits */}
          <div className="bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/40 rounded-3xl p-8 space-y-6 transition-colors">
            <div className="inline-flex items-center gap-2 bg-teal-200/60 dark:bg-teal-900/50 text-teal-900 dark:text-teal-200 font-bold px-3 py-1 rounded-full text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" /> For Customers
            </div>
            <h3 className="text-2xl font-bold font-display text-slate-900 dark:text-white">Why Customers Trust Sahaayak</h3>
            <ul className="space-y-3.5 text-sm text-slate-700 dark:text-slate-300">
              {[
                'Strict Pay-After-Service policy: Zero advance deposit required',
                'Aadhaar-verified & police background-checked technicians',
                'Transparent pricing with photo evidence required for additional charges',
                'Live status updates with approximate distance tracking and direct chat',
                'Official GST & digital PDF tax invoice generated instantly upon payment',
                'Responsive dispute resolution with prompt admin investigation and refunds'
              ].map((b, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <span>Explore Services</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-3xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">Frequently Asked Questions</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Everything you need to know about our service standards and guarantees.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div key={index} className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-colors">
                <button
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between font-semibold text-sm text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                {isOpen && (
                  <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
