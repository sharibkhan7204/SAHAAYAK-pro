import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export default function Contact() {
  const { addToast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    addToast('Thank you! Your message has been received by our support team.', 'success');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
          Customer & Partner Support
        </h1>
        <p className="text-sm text-slate-600">
          Have an inquiry, feedback, or need help with an active booking? We are here 7 days a week.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Info Column */}
        <div className="md:col-span-5 bg-gradient-to-br from-brand-700 to-brand-900 text-white rounded-3xl p-8 space-y-6 shadow-lg">
          <div>
            <h3 className="text-xl font-bold font-display">Get in Touch</h3>
            <p className="text-xs text-brand-100 mt-1">Our dedicated team responds within 15 minutes during operating hours.</p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-saffron-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-brand-200 block text-[11px]">Phone Support</span>
                <span className="font-semibold">+91 80000 12345 (Toll Free)</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-saffron-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-brand-200 block text-[11px]">Email Inquiries</span>
                <span className="font-semibold">support@sahaayak.in</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-saffron-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-brand-200 block text-[11px]">Operations Hub</span>
                <span className="font-semibold">HSR Layout, Sector 4, Bengaluru, Karnataka 560102</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-brand-800 text-xs text-brand-200">
            Operating Hours: Monday – Sunday, 8:00 AM – 9:00 PM IST.
          </div>
        </div>

        {/* Form Column */}
        <div className="md:col-span-7 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          {submitted ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Message Dispatched</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                A Sahaayak support representative will contact you via phone or email shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Your Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                    placeholder="E.g. Priya Sharma"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                    placeholder="+91 98765 00000"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                  placeholder="priya@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Message</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                  placeholder="How can we assist you today?"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <span>Send Support Request</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
