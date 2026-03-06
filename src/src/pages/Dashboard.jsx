import React, { useState } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { AllocationChart, AllocationLegend, GainChart, DayChangeChart } from '../components/Charts';
import HoldingsTable from '../components/HoldingsTable';
import AddTransactionModal from '../components/AddTransactionModal';
import PriceAlerts from '../components/PriceAlerts';
import AllocationTargets from '../components/AllocationTargets';
import CorrelationFlags from '../components/CorrelationFlags';
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Plus, Activity,
  Bell, Briefcase, Shield, Target
} from 'lucide-react';

export default function Dashboard() {
  const {
    holdings, totalValue, totalCost, totalGain, totalGainPercent,
    prices, priceLoading,
    wealthHoldings, activeHoldings, wealthValue, activeValue,
    alerts, addAlert, deleteAlert, dismissAlert,
    allocationTargets
  } = usePortfolio();
  const [showAdd, setShowAdd] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [bookView, setBookView] = useState('all'); // 'all' | 'wealth' | 'active'

  // Today's change
  const todayChange = holdings.reduce((sum, h) => {
    const quote = prices[h.symbol];
    if (!quote) return sum;
    return sum + ((quote.price - quote.previousClose) * h.shares);
  }, 0);
  const todayChangePercent = totalValue > 0 ? (todayChange / (totalValue - todayChange)) * 100 : 0;

  // Triggered alerts count
  const triggeredAlerts = alerts.filter(a => a.status === 'triggered').length;

  // Best/worst today
  const performers = holdings.map(h => ({
    symbol: h.symbol,
    dayChange: prices[h.symbol]?.changePercent || 0,
  })).sort((a, b) => b.dayChange - a.dayChange);
  const bestToday = performers[0];
  const worstToday = performers[performers.length - 1];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <DollarSign size={14} />
            Total Value
          </div>
          <p className="text-xl sm:text-2xl font-bold">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {priceLoading && <p className="text-xs text-slate-500 mt-1">Updating...</p>}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            {totalGain >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            Total Gain/Loss
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${totalGain >= 0 ? 'gain' : 'loss'}`}>
            {totalGain >= 0 ? '+' : ''}${totalGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={`text-xs ${totalGain >= 0 ? 'gain' : 'loss'}`}>
            {totalGain >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Activity size={14} />
            Today
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${todayChange >= 0 ? 'gain' : 'loss'}`}>
            {todayChange >= 0 ? '+' : ''}${todayChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={`text-xs ${todayChange >= 0 ? 'gain' : 'loss'}`}>
            {todayChange >= 0 ? '+' : ''}{todayChangePercent.toFixed(2)}%
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <BarChart3 size={14} />
            Holdings
          </div>
          <p className="text-xl sm:text-2xl font-bold">{holdings.length}</p>
          <p className="text-xs text-slate-500">
            Cost basis: ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Book split summary */}
      {(wealthHoldings.length > 0 || activeHoldings.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card border-emerald-500/20">
            <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1">
              <Shield size={14} />
              Wealth Book
            </div>
            <p className="text-lg font-bold">${wealthValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${totalValue > 0 ? (wealthValue / totalValue) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-slate-400">
                {totalValue > 0 ? ((wealthValue / totalValue) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
          <div className="card border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-400 text-xs mb-1">
              <Briefcase size={14} />
              Active Book
            </div>
            <p className="text-lg font-bold">${activeValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${totalValue > 0 ? (activeValue / totalValue) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-slate-400">
                {totalValue > 0 ? ((activeValue / totalValue) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Correlation warnings */}
      <CorrelationFlags holdings={holdings} prices={prices} />

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Transaction
        </button>
        <button onClick={() => setShowAlerts(true)} className="btn-secondary flex items-center gap-2 relative">
          <Bell size={18} /> Price Alerts
          {triggeredAlerts > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
              {triggeredAlerts}
            </span>
          )}
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Portfolio Allocation</h3>
          <AllocationChart />
          <AllocationLegend />
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Gain/Loss by Holding</h3>
          <GainChart />
        </div>
      </div>

      {/* Allocation targets */}
      {allocationTargets.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <Target size={14} /> Allocation Targets
          </h3>
          <AllocationTargets holdings={holdings} prices={prices} targets={allocationTargets} />
        </div>
      )}

      {/* Day performance */}
      {holdings.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Today's Performance</h3>
          <DayChangeChart />
        </div>
      )}

      {/* Top movers */}
      {performers.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bestToday && (
            <div className="card border-emerald-500/30">
              <p className="text-xs text-slate-400 mb-1">Best Today</p>
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">{bestToday.symbol}</span>
                <span className="gain font-bold">+{bestToday.dayChange.toFixed(2)}%</span>
              </div>
            </div>
          )}
          {worstToday && worstToday.symbol !== bestToday?.symbol && (
            <div className="card border-red-500/30">
              <p className="text-xs text-slate-400 mb-1">Worst Today</p>
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">{worstToday.symbol}</span>
                <span className="loss font-bold">{worstToday.dayChange.toFixed(2)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Holdings with book filter tabs */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-400">Holdings</h3>
          <div className="flex gap-1">
            {['all', 'wealth', 'active'].map(view => (
              <button
                key={view}
                onClick={() => setBookView(view)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  bookView === view
                    ? view === 'wealth' ? 'bg-emerald-600 text-white'
                      : view === 'active' ? 'bg-purple-600 text-white'
                      : 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <HoldingsTable bookFilter={bookView === 'all' ? null : bookView} />
      </div>

      <AddTransactionModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
      <PriceAlerts
        isOpen={showAlerts}
        onClose={() => setShowAlerts(false)}
        alerts={alerts}
        prices={prices}
        onAddAlert={addAlert}
        onDeleteAlert={deleteAlert}
        onDismissAlert={dismissAlert}
      />
    </div>
  );
}
