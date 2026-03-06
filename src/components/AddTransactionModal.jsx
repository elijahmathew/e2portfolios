import React, { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { searchSymbol, fetchQuote } from '../services/priceService';

export default function AddTransactionModal({ isOpen, onClose }) {
  const { addTransaction } = usePortfolio();
  const [type, setType] = useState('buy');
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [pricePerShare, setPricePerShare] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const searchTimeout = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSymbolChange = (value) => {
    setSymbol(value);
    setSelectedName('');
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.length >= 1) {
      setSearching(true);
      searchTimeout.current = setTimeout(async () => {
        const results = await searchSymbol(value);
        setSearchResults(results);
        setSearching(false);
      }, 300);
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  };

  const selectSymbol = async (result) => {
    setSymbol(result.symbol);
    setSelectedName(result.name);
    setSearchResults([]);

    // Auto-fill current price
    const quote = await fetchQuote(result.symbol);
    if (quote) {
      setPricePerShare(quote.price.toFixed(2));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symbol || !shares || !pricePerShare) return;

    setSubmitting(true);
    try {
      await addTransaction({
        symbol,
        shares: parseFloat(shares),
        pricePerShare: parseFloat(pricePerShare),
        date,
        type,
        notes
      });
      // Reset form
      setSymbol('');
      setShares('');
      setPricePerShare('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setSelectedName('');
      onClose();
    } catch (err) {
      console.error('Error adding transaction:', err);
    }
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add Transaction</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Buy/Sell toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('buy')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === 'buy' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setType('sell')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${type === 'sell' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400'}`}
            >
              Sell
            </button>
          </div>

          {/* Symbol search */}
          <div className="relative">
            <label className="block text-sm text-slate-400 mb-1">Ticker Symbol</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                ref={inputRef}
                type="text"
                value={symbol}
                onChange={(e) => handleSymbolChange(e.target.value.toUpperCase())}
                placeholder="AAPL, BTC, TSLA..."
                className="input-field pl-9"
                required
              />
            </div>
            {selectedName && (
              <p className="text-xs text-slate-500 mt-1">{selectedName}</p>
            )}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-slate-700 rounded-lg shadow-xl border border-slate-600 max-h-48 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectSymbol(r)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-600 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-sm">{r.symbol}</span>
                      <span className="text-xs text-slate-400 ml-2">{r.name}</span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${r.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                      {r.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Shares */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Number of Shares</label>
            <input
              type="number"
              step="any"
              min="0"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="10"
              className="input-field"
              required
            />
          </div>

          {/* Price per share */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Price per Share ($)</label>
            <input
              type="number"
              step="any"
              min="0"
              value={pricePerShare}
              onChange={(e) => setPricePerShare(e.target.value)}
              placeholder="150.00"
              className="input-field"
              required
            />
            {shares && pricePerShare && (
              <p className="text-xs text-slate-500 mt-1">
                Total: ${(parseFloat(shares) * parseFloat(pricePerShare)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Earnings play, DCA, etc."
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !symbol || !shares || !pricePerShare}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding...' : `Add ${type === 'buy' ? 'Buy' : 'Sell'}`}
          </button>
        </form>
      </div>
    </div>
  );
}
