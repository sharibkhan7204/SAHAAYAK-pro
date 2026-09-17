import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Clock, CreditCard, ArrowRight, UserCheck, Wrench, Sparkles } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Select a Service & Customise Details',
      desc: 'Pick from 9 home services. Fill in dynamic details such as apartment BHK, sq ft, problem description, or pickup/destination points.',
      highlight: 'Dynamic pricing estimation upfront'
    },
    {
      num: '02',
      title: 'Automatic Smart Matching',
      desc: 'Our fairness engine scores nearby approved workers based on distance, skill match, workload, and performance ratings.',
      highlight: 'Zero waiting on quotes or phone bidding'
    },
    {
      num: '03',
      title: 'Live Tracking & Real-Time Chat',
      desc: 'Once the worker accepts, track their approximate distance, communicate through secure in-app chat, and receive arrival alerts.',
      highlight: 'Customer address privacy protected before acceptance'
    },
    {
      num: '04',
      title: 'Verified Doorstep Execution',
      desc: 'Worker uploads before and after photo proofs for service verification. Any extra work requires explicit customer approval.',
      highlight: 'No unauthorized charges'
    },
    {
      num: '05',
      title: 'Customer Confirmation & Pay After Service',
      desc: 'Review completed work. Choose UPI, Card, or Cash. Add an optional tip (100% to worker) and download your digital PDF invoice.',
      highlight: 'Strictly pay AFTER satisfaction'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
          How Sahaayak Works
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          A transparent, automated doorstep service experience engineered for trust, fairness, and safety.
        </p>
      </div>

      <div className="space-y-6">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6 group hover:border-brand-300 dark:hover:border-brand-500/50 transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-extrabold font-display text-xl flex items-center justify-center shrink-0 border border-brand-200 dark:border-brand-800">
              {step.num}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">{step.title}</h3>
                <span className="bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-transparent dark:border-brand-800">
                  {step.highlight}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-brand-700 to-brand-900 text-white rounded-3xl p-8 sm:p-10 text-center space-y-5 shadow-xl">
        <h2 className="text-2xl font-bold font-display">Ready for a reliable doorstep service experience?</h2>
        <p className="text-xs sm:text-sm text-brand-100 max-w-md mx-auto">
          Book within 60 seconds with verified local gig workers. Pay only after service.
        </p>
        <Link
          to="/services"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-slate-950 font-bold text-xs shadow-md transition-colors"
        >
          <span>Book a Service Now</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
