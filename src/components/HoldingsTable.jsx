import React from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function HoldingsTable({ compact = false }) {
  const { holdings, prices, totalValue } = usePortfolio();

  if (holdings.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>No holdings yet. Add your first transaction to get started.</p>
      </div>
    );
  }

  const enrichedHoldings = holdings.map(h => {
    const quote = prices[h.symbol];
    const currentPrice = quote?.price || 0;
    const marketValue = currentPrice * h.shares;
    const costBasis = h.avgPrice * h.shares;
    const gain = marketValue - costBasis;
    const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;
    const dayChange = quote?.changePercent || 0;
    const allocation = totalValue > 0 ? (marketValue / totalValue) * 100 : 0;

    return {
      ...h,
      currentPrice,
      marketValue,
      costBasis,
      gain,
      gainPercent,
      dayChange,
      allocation,
      type: quote?.type || 'stock'
    };
  }).sort((a, b) => b.marketValue - a.marketValue);

  if (compact) {
    return (
      <div className="space-y-2">
        {enrichedHoldings.slice(0, 5).map(h => (
          <div key={h.id} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${h.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                {h.symbol.slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium">{h.symbol}</p>
                <p className="text-xs text-slate-500">{h.shares} shares</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">${h.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className={`text-xs ${h.gain >= 0 ? 'gain' : 'loss'}`}>
                {h.gain >= 0 ? '+' : ''}{h.gainPercent.toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
            <th className="text-left py-3 px-2">Asset</th>
            <th className="text-right py-3 px-2">Price</th>
            <th className="text-right py-3 px-2 hidden sm:table-cell">Shares</th>
            <th className="text-right py-3 px-2">Value</th>
            <th className="text-right py-3 px-2">Gain/Loss</th>
            <th className="text-right py-3 px-2 hidden md:table-cell">Day</th>
            <th className="text-right py-3 px-2 hidden lg:table-cell">Allocation</th>
          </tr>
        </thead>
        <tbody>
          {enrichedHoldings.map(h => (
            <tr key={h.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${h.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                    {h.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium">{h.symbol}</p>
                    <p className="text-xs text-slate-500 sm:hidden">{h.shares} shares</p>
                  </div>
                </div>
              </td>
              <td className="text-right py-3 px-2">
                ${h.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="text-right py-3 px-2 hidden sm:table-cell text-slate-400">
                {h.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </td>
              <td className="text-right py-3 px-2 font-medium">
                ${h.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="text-right py-3 px-2">
                <div className={h.gain >= 0 ? 'gain' : 'loss'}>
                  <div className="flex items-center justify-end gap-1">
                    {h.gain >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span>{h.gain >= 0 ? '+' : ''}${h.gain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-xs">{h.gain >= 0 ? '+' : ''}{h.gainPercent.toFixed(2)}%</p>
                </div>
              </td>
              <td className={`text-right py-3 px-2 hidden md:table-cell ${h.dayChange >= 0 ? 'gain' : 'loss'}`}>
                {h.dayChange >= 0 ? '+' : ''}{h.dayChange.toFixed(2)}%
              </td>
              <td className="text-right py-3 px-2 hidden lg:table-cell text-slate-400">
                {h.allocation.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
