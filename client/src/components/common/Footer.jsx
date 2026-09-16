import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Phone, Mail, MapPin, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Col 1: Brand */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-saffron-500 flex items-center justify-center text-white font-bold text-lg">
                S
              </div>
              <span className="text-xl font-bold font-display text-white tracking-tight">Sahaayak.</span>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              India's transparent, fair-wage gig platform connecting verified home service technicians with households.
              Zero platform commission on small jobs. 100% direct tips to service partners.
            </p>
            <div className="flex items-center gap-2 text-xs text-brand-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Aadhaar & Police Verified Professionals</span>
            </div>
          </div>

          {/* Col 2: Services */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Top Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/services" className="hover:text-white transition-colors">Home Deep Cleaning</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Plumbing & Sanitary</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Electrical Repairs</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">AC Jet Foam Wash</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Doorstep Car Washing</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Beauty & Salon at Home</Link></li>
            </ul>
          </div>

          {/* Col 3: Company */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Company & Workers</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-white transition-colors">About Sahaayak</Link></li>
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/become-worker" className="text-saffron-400 font-medium hover:underline">Become a Service Partner</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">Frequently Asked Questions</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Support & Disputes</Link></li>
            </ul>
          </div>

          {/* Col 4: Trust & Policies */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">Trust & Legal</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/cancellation-policy" className="hover:text-white transition-colors">Cancellation & Rescheduling</Link></li>
              <li><Link to="/refund-policy" className="hover:text-white transition-colors">Dispute & Refund Guarantee</Link></li>
              <li><Link to="/worker-terms" className="hover:text-white transition-colors">Fair Worker Code</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            © {new Date().getFullYear()} Sahaayak Technologies India Pvt. Ltd. All rights reserved.
          </div>
          <div className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for Indian Gig Worker Independence & Fair Wages
          </div>
        </div>
      </div>
    </footer>
  );
}
