import React, { useState } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { searchSymbol } from '../services/priceService';
import { Plus, Trash2, TrendingUp, TrendingDown, Search } from 'lucide-react';

export default function Watchlist() {
  const { watchlist, prices, addToWatchlist, removeFromWatchlist } = usePortfolio();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const res = await searchSymbol(query);
    setResults(res);
    setSearching(false);
  };

  const handleAdd = async (symbol) => {
    if (watchlist.find(w => w.symbol === symbol.toUpperCase())) return;
    setAdding(true);
    await addToWatchlist(symbol);
    setResults([]);
    setQuery('');
    setAdding(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="card">
        <h1 className="text-xl font-bold mb-4">Watchlist</h1>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a stock or crypto to watch..."
              className="input-field pl-9"
            />
          </div>
          <button type="submit" disabled={searching} className="btn-primary">
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Search results */}
        {results.length > 0 && (
          <div className="mb-6 border border-slate-700 rounded-lg overflow-hidden">
            {results.map((r, i) => {
              const alreadyAdded = watchlist.find(w => w.symbol === r.symbol.toUpperCase());
              return (
                <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30">
                  <div>
                    <span className="font-medium text-sm">{r.symbol}</span>
                    <span className="text-xs text-slate-400 ml-2">{r.name}</span>
                    <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${r.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                      {r.type}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAdd(r.symbol)}
                    disabled={alreadyAdded || adding}
                    className={`text-sm flex items-center gap-1 ${alreadyAdded ? 'text-slate-500' : 'btn-primary text-xs py-1 px-2'}`}
                  >
                    {alreadyAdded ? 'Added' : <><Plus size={14} /> Watch</>}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Watchlist items */}
        {watchlist.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>Your watchlist is empty. Search for stocks or crypto to start watching.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {watchlist.map(w => {
              const quote = prices[w.symbol];
              return (
                <div key={w.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${quote?.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                      {w.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <p className="font-medium">{w.symbol}</p>
                      <p className="text-xs text-slate-500">{quote?.name || ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {quote ? (
                      <div className="text-right">
                        <p className="font-medium">
                          ${quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className={`flex items-center gap-1 text-xs ${quote.changePercent >= 0 ? 'gain' : 'loss'}`}>
                          {quote.changePercent >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">Loading...</span>
                    )}
                    <button
                      onClick={() => removeFromWatchlist(w.id)}
                      className="p-1.5 text-slate-600 hover:text-red-400 rounded-lg hover:bg-slate-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
