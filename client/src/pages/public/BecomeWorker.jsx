import React from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench, CheckCircle2, IndianRupee, ShieldCheck, Clock, MapPin, Sparkles, ArrowRight
} from 'lucide-react';

export default function BecomeWorker() {
  const benefits = [
    {
      title: '₹0 Commission on Small Jobs',
      desc: 'On all jobs up to ₹599, keep 100% of your labour earnings. No platform cut.',
      icon: <IndianRupee className="w-6 h-6 text-brand-600" />
    },
    {
      title: '100% Direct Customer Tips',
      desc: 'All tips given by satisfied customers are credited directly to you with zero deductions.',
      icon: <Sparkles className="w-6 h-6 text-saffron-500" />
    },
    {
      title: 'Set Your Own Radius & Hours',
      desc: 'Operate within your preferred neighborhood (5 km to 30 km) and toggle online whenever available.',
      icon: <MapPin className="w-6 h-6 text-emerald-600" />
    },
    {
      title: 'Fair Assignment Algorithm',
      desc: 'Our scoring engine rotates jobs fairly among all verified workers. No favoritism.',
      icon: <CheckCircle2 className="w-6 h-6 text-indigo-600" />
    },
    {
      title: 'Cash & Online Transparency',
      desc: 'Clear ledger showing cash collected, platform dues, and instant UPI payout requests.',
      icon: <ShieldCheck className="w-6 h-6 text-teal-600" />
    },
    {
      title: 'Dignity & Verified Identity',
      desc: 'Official digital ID verification card, customer ratings, and professional profile recognition.',
      icon: <Wrench className="w-6 h-6 text-amber-600" />
    }
  ];

  return (
    <div className="space-y-16 py-12">
      {/* Hero Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-saffron-100 dark:bg-amber-950/80 text-saffron-800 dark:text-amber-300 text-xs font-semibold border border-transparent dark:border-amber-800">
          <Sparkles className="w-3.5 h-3.5 text-saffron-600 dark:text-saffron-400" />
          <span>Join 500+ Verified Service Partners across Bengaluru</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight max-w-3xl mx-auto leading-tight">
          Earn More, Work Locally, and Keep What You Deserve.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Sahaayak is built for worker independence. Zero commission on small jobs, transparent earnings tracking,
          and automatic doorstep job assignments.
        </p>

        <div className="flex justify-center pt-2">
          <Link
            to="/worker-signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
          >
            <span>Register as a Service Partner</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                {b.icon}
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">{b.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Verification Steps */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display">How to Get Verified in 4 Simple Steps</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">Fast, digital onboarding designed for gig workers</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-left">
            {[
              { s: '1', title: 'Sign Up', desc: 'Enter basic details, mobile number, and your trade skills.' },
              { s: '2', title: 'Upload ID', desc: 'Submit one government ID (Aadhaar, PAN, or Driving License).' },
              { s: '3', title: 'Bank / UPI', desc: 'Add your UPI ID or bank account for instant payouts.' },
              { s: '4', title: 'Go Online', desc: 'Toggle status to Online and start accepting nearby jobs!' }
            ].map((st) => (
              <div key={st.s} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm">
                  {st.s}
                </div>
                <h4 className="font-bold text-sm text-white">{st.title}</h4>
                <p className="text-xs text-slate-400">{st.desc}</p>
              </div>
            ))}
          </div>

          <Link
            to="/worker-signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
          >
            <span>Start Partner Registration</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
