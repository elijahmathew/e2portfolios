import React, { useState } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { AllocationChart, AllocationLegend, GainChart, DayChangeChart } from '../components/Charts';
import HoldingsTable from '../components/HoldingsTable';
import AddTransactionModal from '../components/AddTransactionModal';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Plus, Activity } from 'lucide-react';

export default function Dashboard() {
  const {
    holdings, totalValue, totalCost, totalGain, totalGainPercent,
    prices, priceLoading
  } = usePortfolio();
  const [showAdd, setShowAdd] = useState(false);

  // Calculate today's total change
  const todayChange = holdings.reduce((sum, h) => {
    const quote = prices[h.symbol];
    if (!quote) return sum;
    const prevValue = quote.previousClose * h.shares;
    const currValue = quote.price * h.shares;
    return sum + (currValue - prevValue);
  }, 0);
  const todayChangePercent = totalValue > 0 ? (todayChange / (totalValue - todayChange)) * 100 : 0;

  // Best and worst performers
  const performers = holdings
    .map(h => {
      const quote = prices[h.symbol];
      return {
        symbol: h.symbol,
        dayChange: quote?.changePercent || 0,
        totalGain: h.avgPrice > 0 ? ((quote?.price || 0) - h.avgPrice) / h.avgPrice * 100 : 0
      };
    })
    .sort((a, b) => b.dayChange - a.dayChange);

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

      {/* Quick action */}
      <button
        onClick={() => setShowAdd(true)}
        className="btn-primary flex items-center gap-2"
      >
        <Plus size={18} />
        Add Transaction
      </button>

      {/* Charts section */}
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

      {/* Day performance chart */}
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

      {/* Holdings table */}
      <div className="card">
        <h3 className="text-sm font-medium text-slate-400 mb-3">Holdings</h3>
        <HoldingsTable />
      </div>

      <AddTransactionModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
