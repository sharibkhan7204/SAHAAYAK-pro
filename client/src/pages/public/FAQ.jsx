import React, { useState } from 'react';
import { ChevronRight, HelpCircle } from 'lucide-react';

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState(null);

  const categories = [
    {
      name: 'Bookings & Services',
      items: [
        {
          q: 'How do I book a service on Sahaayak?',
          a: 'Select any of our 9 specialized categories, specify your address and preferred date/time, and review the transparent price. Our assignment algorithm immediately finds and alerts the nearest approved technician.'
        },
        {
          q: 'Can I reschedule or cancel a booking?',
          a: 'Yes, you can reschedule or cancel directly from your Booking Details dashboard before the technician starts work.'
        },
        {
          q: 'Why do some services show a price range while others show fixed fees?',
          a: 'Services like Home Cleaning or Painting depend on apartment size or square footage, so an upfront range is shown. Services like AC jet servicing or vehicle washes have clear fixed packages.'
        }
      ]
    },
    {
      name: 'Payments & Invoicing',
      items: [
        {
          q: 'When do I pay for the service?',
          a: 'You pay only AFTER the technician completes the service and you confirm satisfaction. We never ask for advance deposits.'
        },
        {
          q: 'What payment methods are supported?',
          a: 'You can pay using UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, or directly via Cash to the service partner.'
        },
        {
          q: 'Do I get an official tax invoice?',
          a: 'Yes! An official Sahaayak Tax Invoice PDF with GST and service breakdown is automatically generated and available for instant download.'
        }
      ]
    },
    {
      name: 'Safety & Trust',
      items: [
        {
          q: 'How do you verify gig workers?',
          a: 'Every partner submits official government identification (Aadhaar, PAN, or Driving License), undergoes reference checks, and has their bank account validated.'
        },
        {
          q: 'What if I am unhappy with the service or something was damaged?',
          a: 'You can file a dispute directly through the booking screen with photo evidence. Our dedicated Trust & Safety administrators investigate and issue full or partial refunds where appropriate.'
        }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Find answers to common questions about booking, payments, verification, and worker protection.
        </p>
      </div>

      <div className="space-y-8">
        {categories.map((cat, ci) => (
          <div key={ci} className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{cat.name}</h2>
            <div className="space-y-2.5">
              {cat.items.map((item, ii) => {
                const key = `${ci}-${ii}`;
                const isOpen = openIdx === key;
                return (
                  <div key={key} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                    <button
                      onClick={() => setOpenIdx(isOpen ? null : key)}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between font-semibold text-sm text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      <span>{item.q}</span>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
