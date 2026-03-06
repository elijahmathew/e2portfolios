import React, { useState, useEffect } from 'react';
import {
  Bell, BellRing, Trash2, Plus, TrendingUp, TrendingDown, AlertTriangle
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query
} from 'firebase/firestore';

export default function PriceAlerts({ isOpen, onClose }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [prices, setPrices] = useState({});
  const [newAlert, setNewAlert] = useState({
    symbol: '',
    targetPrice: '',
    direction: 'above',
    meaning: 'Take profit'
  });
  const [submitting, setSubmitting] = useState(false);

  // Listen to alerts from Firestore
  useEffect(() => {
    if (!user) return;

    const alertsRef = collection(db, 'users', user.uid, 'priceAlerts');
    const q = query(alertsRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAlerts(alertsList);
    });

    return unsubscribe;
  }, [user]);

  // Get unique symbols and fetch prices
  useEffect(() => {
    const symbols = [...new Set([...alerts.map(a => a.symbol), newAlert.symbol].filter(Boolean))];
    if (symbols.length === 0) return;

    const fetchPrices = async () => {
      try {
        const response = await fetch(
          `https://api.example.com/quotes?symbols=${symbols.join(',')}`
        );
        // Mock: would fetch real prices, for now using placeholder
        const mockPrices = {};
        symbols.forEach(symbol => {
          mockPrices[symbol] = Math.random() * 300 + 50;
        });
        setPrices(mockPrices);
      } catch (err) {
        console.error('Error fetching prices:', err);
      }
    };

    fetchPrices();
  }, [alerts, newAlert.symbol]);

  const handleAddAlert = async (e) => {
    e.preventDefault();
    if (!user || !newAlert.symbol || !newAlert.targetPrice) return;

    setSubmitting(true);
    try {
      const alertsRef = collection(db, 'users', user.uid, 'priceAlerts');
      await addDoc(alertsRef, {
        symbol: newAlert.symbol.toUpperCase(),
        targetPrice: parseFloat(newAlert.targetPrice),
        direction: newAlert.direction,
        meaning: newAlert.meaning,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      setNewAlert({ symbol: '', targetPrice: '', direction: 'above', meaning: 'Take profit' });
    } catch (err) {
      console.error('Error adding alert:', err);
    }
    setSubmitting(false);
  };

  const handleDeleteAlert = async (alertId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'priceAlerts', alertId));
    } catch (err) {
      console.error('Error deleting alert:', err);
    }
  };

  const handleDismissAlert = async (alertId) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'priceAlerts', alertId), {
        status: 'dismissed'
      });
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  };

  const getAlertStatus = (alert) => {
    const currentPrice = prices[alert.symbol];
    if (!currentPrice) return 'pending';

    if (alert.direction === 'above') {
      return currentPrice >= alert.targetPrice ? 'triggered' : 'active';
    } else {
      return currentPrice <= alert.targetPrice ? 'triggered' : 'active';
    }
  };

  const getMeaningColor = (meaning) => {
    if (meaning.toLowerCase().includes('profit')) return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    if (meaning.toLowerCase().includes('stop') || meaning.toLowerCase().includes('loss')) return 'bg-red-500/10 border-red-500/20 text-red-400';
    if (meaning.toLowerCase().includes('warning')) return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    if (meaning.toLowerCase().includes('buy')) return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    return 'bg-slate-500/10 border-slate-500/20 text-slate-400';
  };

  const getStatusIcon = (status, direction) => {
    if (status === 'triggered') return <BellRing size={16} className="text-amber-400" />;
    if (status === 'dismissed') return <Bell size={16} className="text-slate-500" />;
    return direction === 'above' ? (
      <TrendingUp size={16} className="text-cyan-400" />
    ) : (
      <TrendingDown size={16} className="text-cyan-400" />
    );
  };

  const getDistancePercent = (currentPrice, targetPrice) => {
    if (!currentPrice || !targetPrice) return 0;
    return Math.abs((currentPrice - targetPrice) / targetPrice * 100).toFixed(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bell size={24} className="text-cyan-400" />
              Price Alerts
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {alerts.length} alert{alerts.length !== 1 ? 's' : ''} set
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg">
            ✕
          </button>
        </div>

        {/* Add New Alert Form */}
        <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Plus size={16} /> Add New Alert
          </h3>
          <form onSubmit={handleAddAlert} className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <input
                type="text"
                value={newAlert.symbol}
                onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value.toUpperCase() })}
                placeholder="Symbol"
                className="input-field text-sm"
              />
            </div>
            <div>
              <input
                type="number"
                value={newAlert.targetPrice}
                onChange={(e) => setNewAlert({ ...newAlert, targetPrice: e.target.value })}
                placeholder="Target $"
                step="any"
                className="input-field text-sm"
              />
            </div>
            <div>
              <select
                value={newAlert.direction}
                onChange={(e) => setNewAlert({ ...newAlert, direction: e.target.value })}
                className="input-field text-sm"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </div>
            <div>
              <select
                value={newAlert.meaning}
                onChange={(e) => setNewAlert({ ...newAlert, meaning: e.target.value })}
                className="input-field text-sm"
              >
                <option value="Take profit">Take profit</option>
                <option value="Warning zone">Warning zone</option>
                <option value="Strong buy">Strong buy</option>
                <option value="Stop loss">Stop loss</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting || !newAlert.symbol || !newAlert.targetPrice}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </form>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle size={32} className="mx-auto text-slate-600 mb-2" />
              <p className="text-slate-400">No price alerts set yet</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const status = getAlertStatus(alert);
              const currentPrice = prices[alert.symbol];
              const distance = getDistancePercent(currentPrice, alert.targetPrice);

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border transition-all ${
                    status === 'triggered'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : status === 'dismissed'
                      ? 'bg-slate-700/20 border-slate-700/30 opacity-60'
                      : 'bg-slate-700/20 border-slate-700/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status, alert.direction)}
                        <div>
                          <h4 className="font-semibold text-white">
                            {alert.symbol}
                            {status === 'triggered' && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 font-medium">
                                TRIGGERED
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-slate-400">
                            {currentPrice ? `${currentPrice.toFixed(2)}` : 'Loading...'} → ${alert.targetPrice.toFixed(2)}{' '}
                            {distance && <span className="text-slate-500">({distance}% away)</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded border ${getMeaningColor(alert.meaning)}`}>
                          {alert.meaning}
                        </span>
                        <span className="text-xs text-slate-500">
                          {alert.direction === 'above' ? 'Price above target' : 'Price below target'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {status === 'triggered' && (
                        <button
                          onClick={() => handleDismissAlert(alert.id)}
                          className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                        >
                          Dismiss
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-700 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
