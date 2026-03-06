import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export default function ThesisCard({ isOpen, onClose, holding, activePortfolioId }) {
  const { user } = useAuth();
  const [thesis, setThesis] = useState('');
  const [primarySignal, setPrimarySignal] = useState('');
  const [takeProfitTarget, setTakeProfitTarget] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [warningZone, setWarningZone] = useState('');
  const [timeStop, setTimeStop] = useState('');
  const [notes, setNotes] = useState('');
  const [monitoringCadence, setMonitoringCadence] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill form if holding has existing thesis data
  useEffect(() => {
    if (holding && isOpen) {
      setThesis(holding.thesis || '');
      setPrimarySignal(holding.primarySignal || '');
      setTakeProfitTarget(holding.takeProfitTarget || '');
      setStopLoss(holding.stopLoss || '');
      setWarningZone(holding.warningZone || '');
      setTimeStop(holding.timeStop || '');
      setNotes(holding.notes || '');
      setMonitoringCadence(holding.monitoringCadence || '');
    }
  }, [holding, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !activePortfolioId || !holding) return;

    setSubmitting(true);
    try {
      const holdingRef = doc(
        db,
        'users',
        user.uid,
        'portfolios',
        activePortfolioId,
        'holdings',
        holding.id
      );
      await updateDoc(holdingRef, {
        thesis,
        primarySignal,
        takeProfitTarget,
        stopLoss,
        warningZone,
        timeStop,
        notes,
        monitoringCadence
      });
      onClose();
    } catch (err) {
      console.error('Error saving thesis:', err);
    }
    setSubmitting(false);
  };

  if (!isOpen || !holding) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-slate-400">Trade Thesis</p>
            <h2 className="text-2xl font-bold text-white">{holding.symbol}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Thesis */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              One Sentence Thesis
            </label>
            <textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              placeholder="e.g., RTX benefits from increased defense spending and geopolitical tensions"
              className="input-field h-20 resize-none"
            />
          </div>

          {/* Primary Signal */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Primary Signal to Watch
            </label>
            <textarea
              value={primarySignal}
              onChange={(e) => setPrimarySignal(e.target.value)}
              placeholder="e.g., Quarterly defense contract awards, earnings growth, valuation multiples"
              className="input-field h-16 resize-none"
            />
          </div>

          {/* Take Profit Target */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Take Profit Target
            </label>
            <input
              type="text"
              value={takeProfitTarget}
              onChange={(e) => setTakeProfitTarget(e.target.value)}
              placeholder="e.g., $241-252 (+15-20%)"
              className="input-field"
            />
          </div>

          {/* Stop Loss */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Stop Loss
            </label>
            <input
              type="text"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="e.g., $157 (hard stop, OCO)"
              className="input-field"
            />
          </div>

          {/* Warning Zone */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Warning Zone / Take Profit Partial
            </label>
            <input
              type="text"
              value={warningZone}
              onChange={(e) => setWarningZone(e.target.value)}
              placeholder="e.g., $190"
              className="input-field"
            />
          </div>

          {/* Time Stop */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Time Stop
            </label>
            <input
              type="text"
              value={timeStop}
              onChange={(e) => setTimeStop(e.target.value)}
              placeholder="e.g., 6-8 weeks if flat"
              className="input-field"
            />
          </div>

          {/* Monitoring Cadence */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Monitoring Cadence
            </label>
            <input
              type="text"
              value={monitoringCadence}
              onChange={(e) => setMonitoringCadence(e.target.value)}
              placeholder="e.g., Morning + evening checks"
              className="input-field"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional observations or context..."
              className="input-field h-20 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save Thesis'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
