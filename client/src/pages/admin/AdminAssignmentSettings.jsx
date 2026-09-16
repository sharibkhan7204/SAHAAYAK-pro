import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Sliders, CheckCircle2, AlertTriangle, RefreshCw, Save, Info, Zap } from 'lucide-react';

export default function AdminAssignmentSettings() {
  const [settings, setSettings] = useState({
    distanceWeight: 0.35,
    workloadWeight: 0.20,
    ratingWeight: 0.25,
    fairnessWeight: 0.10,
    performanceWeight: 0.10,
    maxRadiusKm: 25,
    responseTimeoutSecs: 90,
    maxConcurrentJobs: 2,
    autoReassignOnTimeout: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/settings/assignment');
      if (res.data.settings && Object.keys(res.data.settings).length > 0) {
        setSettings(prev => ({ ...prev, ...res.data.settings }));
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load assignment settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSliderChange = (field, val) => {
    setSettings(prev => ({
      ...prev,
      [field]: parseFloat(val)
    }));
  };

  const totalWeight = Math.round(
    ((settings.distanceWeight || 0) +
     (settings.workloadWeight || 0) +
     (settings.ratingWeight || 0) +
     (settings.fairnessWeight || 0) +
     (settings.performanceWeight || 0)) * 100
  );

  const normalizeWeights = () => {
    const sum = (settings.distanceWeight || 0) +
                (settings.workloadWeight || 0) +
                (settings.ratingWeight || 0) +
                (settings.fairnessWeight || 0) +
                (settings.performanceWeight || 0);
    if (sum === 0) return;
    setSettings(prev => ({
      ...prev,
      distanceWeight: parseFloat((prev.distanceWeight / sum).toFixed(2)),
      workloadWeight: parseFloat((prev.workloadWeight / sum).toFixed(2)),
      ratingWeight: parseFloat((prev.ratingWeight / sum).toFixed(2)),
      fairnessWeight: parseFloat((prev.fairnessWeight / sum).toFixed(2)),
      performanceWeight: parseFloat((prev.performanceWeight / sum).toFixed(2))
    }));
    addToast('Weights normalized to sum to 100%', 'info');
  };

  const resetDefaults = () => {
    setSettings({
      distanceWeight: 0.35,
      workloadWeight: 0.20,
      ratingWeight: 0.25,
      fairnessWeight: 0.10,
      performanceWeight: 0.10,
      maxRadiusKm: 25,
      responseTimeoutSecs: 90,
      maxConcurrentJobs: 2,
      autoReassignOnTimeout: true
    });
    addToast('Reset to default algorithm weights', 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/admin/settings/assignment', settings);
      addToast('Assignment algorithm parameters saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to save assignment parameters', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-emerald-600" />
            Automatic Assignment Engine Settings
          </h1>
          <p className="text-sm text-slate-600">
            Tune multi-factor scoring weights, acceptance dispatch timeouts, and operational search radiuses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetDefaults}
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Weight Distribution Warning/Status Card */}
      <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
        totalWeight === 100
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-3">
          {totalWeight === 100 ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          )}
          <div>
            <p className="font-semibold text-sm">
              Total Algorithm Factor Weight: {totalWeight}%
            </p>
            <p className="text-xs text-slate-600">
              {totalWeight === 100
                ? 'All factor weights are balanced at exactly 100%.'
                : 'For optimal ranking, ensure factor weights sum up to 100%.'}
            </p>
          </div>
        </div>
        {totalWeight !== 100 && (
          <button
            type="button"
            onClick={normalizeWeights}
            className="text-xs font-semibold px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
          >
            Auto-Balance to 100%
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Factor Sliders Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Zap className="w-5 h-5 text-amber-500" />
            Multi-Factor Scoring Weights
          </h2>

          <div className="space-y-5">
            {/* Distance Weight */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-slate-800">
                  Haversine Proximity / Distance Weight
                </label>
                <span className="text-sm font-bold text-emerald-600">
                  {Math.round(settings.distanceWeight * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.distanceWeight}
                onChange={(e) => handleSliderChange('distanceWeight', e.target.value)}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-1">
                Prioritizes gig workers closest to the customer's GPS address for faster arrivals.
              </p>
            </div>

            {/* Rating Weight */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-slate-800">
                  Customer Rating & Reviews Weight
                </label>
                <span className="text-sm font-bold text-emerald-600">
                  {Math.round(settings.ratingWeight * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.ratingWeight}
                onChange={(e) => handleSliderChange('ratingWeight', e.target.value)}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-1">
                Gives preference to top-rated gig workers with consistently high customer feedback.
              </p>
            </div>

            {/* Workload Weight */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-slate-800">
                  Active Workload Balance Weight
                </label>
                <span className="text-sm font-bold text-emerald-600">
                  {Math.round(settings.workloadWeight * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.workloadWeight}
                onChange={(e) => handleSliderChange('workloadWeight', e.target.value)}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-1">
                Penalizes busy workers to prevent fatigue and delays, routing jobs to available workers.
              </p>
            </div>

            {/* Fairness Weight */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-slate-800">
                  Fairness & Opportunity Distribution Weight
                </label>
                <span className="text-sm font-bold text-emerald-600">
                  {Math.round(settings.fairnessWeight * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.fairnessWeight}
                onChange={(e) => handleSliderChange('fairnessWeight', e.target.value)}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-1">
                Ensures newly onboarded or under-utilized workers receive job opportunities fairly.
              </p>
            </div>

            {/* Performance Score Weight */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-slate-800">
                  Completion & Reliability Score Weight
                </label>
                <span className="text-sm font-bold text-emerald-600">
                  {Math.round(settings.performanceWeight * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.performanceWeight}
                onChange={(e) => handleSliderChange('performanceWeight', e.target.value)}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-1">
                Rewards workers with high acceptance rates and zero unauthorized cancellations.
              </p>
            </div>
          </div>
        </div>

        {/* Operational Constraints */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Info className="w-5 h-5 text-indigo-500" />
            Operational Dispatch Boundaries
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Max Search Radius (km)
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={settings.maxRadiusKm}
                onChange={(e) => setSettings({ ...settings, maxRadiusKm: parseInt(e.target.value) || 20 })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Maximum distance to scan for eligible verified workers.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Worker Accept Timeout (seconds)
              </label>
              <input
                type="number"
                min="30"
                max="300"
                value={settings.responseTimeoutSecs}
                onChange={(e) => setSettings({ ...settings, responseTimeoutSecs: parseInt(e.target.value) || 60 })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Time before system reassigns to the next best candidate.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Max Concurrent Jobs
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={settings.maxConcurrentJobs}
                onChange={(e) => setSettings({ ...settings, maxConcurrentJobs: parseInt(e.target.value) || 1 })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Limit active parallel jobs to protect service quality.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-slate-800">Auto Reassign on Worker Timeout</span>
              <p className="text-xs text-slate-500">Automatically cascade job dispatch to the second-highest scoring worker if not accepted.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoReassignOnTimeout}
                onChange={(e) => setSettings({ ...settings, autoReassignOnTimeout: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Algorithm Calibration'}
          </button>
        </div>
      </form>
    </div>
  );
}
