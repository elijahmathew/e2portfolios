import React, { useState } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { TrendingUp, TrendingDown, FileText, Trash2 } from 'lucide-react';
import ThesisCard from './ThesisCard';

export default function HoldingsTable({ compact = false, bookFilter = null }) {
  const { holdings, prices, totalValue, updateHoldingBook, updateHoldingThesis, deleteHolding, clearAllHoldings } = usePortfolio();
  const [editingThesis, setEditingThesis] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  let filteredHoldings = holdings;
  if (bookFilter === 'wealth') filteredHoldings = holdings.filter(h => h.book === 'wealth');
  else if (bookFilter === 'active') filteredHoldings = holdings.filter(h => h.book === 'active');

  if (filteredHoldings.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>{bookFilter ? `No ${bookFilter} book holdings.` : 'No holdings yet. Add your first transaction to get started.'}</p>
      </div>
    );
  }

  const enrichedHoldings = filteredHoldings.map(h => {
    const quote = prices[h.symbol];
    const currentPrice = quote?.price || 0;
    const marketValue = currentPrice * h.shares;
    const costBasis = h.avgPrice * h.shares;
    const gain = marketValue - costBasis;
    const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;
    const dayChange = quote?.changePercent || 0;
    const allocation = totalValue > 0 ? (marketValue / totalValue) * 100 : 0;

    return { ...h, currentPrice, marketValue, costBasis, gain, gainPercent, dayChange, allocation, type: quote?.type || 'stock' };
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
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium">{h.symbol}</p>
                  {h.book && (
                    <span className={`text-[10px] px-1 py-0.5 rounded ${h.book === 'wealth' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                      {h.book === 'wealth' ? 'W' : 'A'}
                    </span>
                  )}
                </div>
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
    <>
      {/* Clear all button */}
      {filteredHoldings.length > 0 && (
        <div className="flex justify-end mb-2">
          {!confirmClear ? (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} />
              Clear All Holdings
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Delete all holdings & transactions?</span>
              <button
                onClick={async () => {
                  setClearing(true);
                  await clearAllHoldings();
                  setClearing(false);
                  setConfirmClear(false);
                }}
                disabled={clearing}
                className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded transition-colors"
              >
                {clearing ? 'Clearing...' : 'Yes, clear'}
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
              <th className="text-left py-3 px-2">Asset</th>
              <th className="text-left py-3 px-2 hidden lg:table-cell">Book</th>
              <th className="text-right py-3 px-2">Price</th>
              <th className="text-right py-3 px-2 hidden sm:table-cell">Shares</th>
              <th className="text-right py-3 px-2">Value</th>
              <th className="text-right py-3 px-2">Gain/Loss</th>
              <th className="text-right py-3 px-2 hidden md:table-cell">Day</th>
              <th className="text-center py-3 px-2 hidden md:table-cell">Thesis</th>
              <th className="py-3 px-2 w-8"></th>
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
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium">{h.symbol}</p>
                        {h.book && (
                          <span className={`text-[10px] px-1 py-0.5 rounded lg:hidden ${h.book === 'wealth' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {h.book === 'wealth' ? 'W' : 'A'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 sm:hidden">{h.shares} shares</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2 hidden lg:table-cell">
                  <select
                    value={h.book || ''}
                    onChange={(e) => updateHoldingBook(h.id, e.target.value || null)}
                    className="bg-slate-700 border-none text-xs rounded px-1.5 py-1 text-slate-300"
                  >
                    <option value="">—</option>
                    <option value="wealth">Wealth</option>
                    <option value="active">Active</option>
                  </select>
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
                <td className="text-center py-3 px-2 hidden md:table-cell">
                  {h.book === 'active' && (
                    <button
                      onClick={() => setEditingThesis(h)}
                      className={`p-1.5 rounded-lg transition-colors ${h.thesis ? 'text-cyan-400 hover:bg-cyan-400/10' : 'text-slate-600 hover:text-slate-400 hover:bg-slate-700'}`}
                      title={h.thesis ? 'Edit thesis' : 'Add thesis'}
                    >
                      <FileText size={14} />
                    </button>
                  )}
                </td>
                <td className="py-3 px-2">
                  <button
                    onClick={() => deleteHolding(h.id)}
                    className="p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    title="Remove holding"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingThesis && (
        <ThesisCard
          isOpen={true}
          onClose={() => setEditingThesis(null)}
          holding={editingThesis}
          onSave={async (thesisData) => {
            await updateHoldingThesis(editingThesis.id, thesisData);
            setEditingThesis(null);
          }}
        />
      )}
    </>
  );
}
