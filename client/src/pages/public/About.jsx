import React from 'react';
import { ShieldCheck, Heart, Users, Sparkles, Award } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
          About Sahaayak
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Empowering Indian local gig workers while delivering trustworthy, pay-after-service home solutions.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
        <h2 className="text-xl font-bold text-slate-900">Our Mission</h2>
        <p>
          In India's rapidly growing on-demand economy, skilled gig workers often bear the brunt of heavy commissions (25% to 35%),
          arbitrary customer cancellations, and delayed payouts. At the same time, customers struggle with unreliable arrival times,
          hidden surge fees, and advance payment risks.
        </p>
        <p>
          <strong>Sahaayak</strong> was conceived to rebuild this trust from the ground up:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Zero Commission on Small Jobs:</strong> Jobs up to ₹599 incur ₹0 platform fee. Service providers retain 100% of their hard work.</li>
          <li><strong>100% Tip Retention:</strong> Every single rupee of customer tips goes directly into the worker's pocket.</li>
          <li><strong>Pay After Service:</strong> Customers never deposit upfront money for services that haven't been rendered or inspected.</li>
          <li><strong>Fair Multi-Factor Assignment:</strong> Job distribution is calibrated through an unbiased scoring algorithm that prevents monopoly by any single provider.</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-2">
          <div className="text-2xl font-bold text-brand-600 font-display">₹0 Fee</div>
          <div className="text-xs text-slate-600 font-medium">On Jobs up to ₹599</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-2">
          <div className="text-2xl font-bold text-emerald-600 font-display">100%</div>
          <div className="text-xs text-slate-600 font-medium">Verified Identity Documents</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-2">
          <div className="text-2xl font-bold text-amber-600 font-display">Pay After</div>
          <div className="text-xs text-slate-600 font-medium">Full Service Completion</div>
        </div>
      </div>
    </div>
  );
}
