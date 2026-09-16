import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Star, EyeOff, Eye, Search, Filter, MessageSquare, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [starFilter, setStarFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReview, setSelectedReview] = useState(null);
  const [moderationReason, setModerationReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/reviews');
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModerate = (rev) => {
    setSelectedReview(rev);
    setModerationReason(rev.moderation_reason || '');
  };

  const handleModerateSubmit = async (isModerated) => {
    if (isModerated && !moderationReason.trim()) {
      addToast('A reason is mandatory to suppress or hide a review', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/admin/reviews/${selectedReview.id}/moderate`, {
        isModerated,
        reason: moderationReason.trim() || 'Review restored by moderator'
      });
      addToast(isModerated ? 'Review suppressed and hidden from public profile' : 'Review unhidden and restored', 'success');
      setSelectedReview(null);
      fetchReviews();
    } catch (err) {
      console.error(err);
      addToast('Failed to moderate review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = reviews.filter(r => {
    const matchesSearch =
      r.reviewer_email?.toLowerCase().includes(search.toLowerCase()) ||
      r.reviewee_email?.toLowerCase().includes(search.toLowerCase()) ||
      r.booking_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.review_text?.toLowerCase().includes(search.toLowerCase());

    const matchesStar = starFilter === 'all' || r.rating === parseInt(starFilter);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'moderated' && r.is_moderated === 1) ||
      (statusFilter === 'active' && r.is_moderated === 0);

    return matchesSearch && matchesStar && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
          Review & Rating Moderation
        </h1>
        <p className="text-sm text-slate-600">
          Audit customer and worker feedback, monitor ratings, and moderate abusive or false reviews.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search reviews, users, bookings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Star Filter */}
          <select
            value={starFilter}
            onChange={(e) => setStarFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700"
          >
            <option value="all">All Ratings (★)</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active & Visible</option>
            <option value="moderated">Suppressed / Hidden</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No reviews found</h3>
          <p className="text-sm text-slate-500 mt-1">No reviews match your selected filter criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Reviewer & Reviewee</th>
                  <th className="px-5 py-3.5">Rating & Booking</th>
                  <th className="px-5 py-3.5">Feedback Text</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(rev => (
                  <tr key={rev.id} className={`hover:bg-slate-50/75 transition ${rev.is_moderated ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="text-xs font-semibold text-slate-900">By: {rev.reviewer_email}</div>
                      <div className="text-xs text-slate-500 mt-0.5">For: {rev.reviewee_email}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'
                            }`}
                          />
                        ))}
                        <span className="text-xs font-bold text-slate-800 ml-1">{rev.rating}.0</span>
                      </div>
                      <div className="text-xs text-emerald-600 font-medium mt-1">
                        Booking: #{rev.booking_number}
                      </div>
                    </td>
                    <td className="px-5 py-4 max-w-sm">
                      <p className="text-xs text-slate-700 line-clamp-3">
                        "{rev.review_text || 'No written commentary provided.'}"
                      </p>
                      {rev.is_moderated === 1 && rev.moderation_reason && (
                        <div className="mt-1.5 p-1.5 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800">
                          <span className="font-semibold">Suppressed:</span> {rev.moderation_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {rev.is_moderated === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                          <EyeOff className="w-3 h-3" /> Suppressed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <Eye className="w-3 h-3" /> Public
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleOpenModerate(rev)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                          rev.is_moderated === 1
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                        }`}
                      >
                        {rev.is_moderated === 1 ? 'Restore Review' : 'Moderate / Hide'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Moderation Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {selectedReview.is_moderated === 1 ? 'Restore Review Visibility' : 'Suppress Review'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Booking: #{selectedReview.booking_number} • Reviewer: {selectedReview.reviewer_email}
            </p>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 mb-4">
              <div className="flex items-center gap-1 mb-1">
                {[...Array(selectedReview.rating)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                ))}
              </div>
              "{selectedReview.review_text}"
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Moderation Audit Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  placeholder="E.g., Profanity, abusive language, or fraudulent review..."
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReview(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                {selectedReview.is_moderated === 1 ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleModerateSubmit(false)}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
                  >
                    Restore to Public
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleModerateSubmit(true)}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition disabled:opacity-50"
                  >
                    Suppress / Hide Review
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
