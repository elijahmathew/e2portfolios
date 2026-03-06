import React, { useState } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import HoldingsTable from '../components/HoldingsTable';
import AddTransactionModal from '../components/AddTransactionModal';
import { Plus, Trash2, Edit3, FolderPlus, ChevronDown, ChevronUp } from 'lucide-react';

export default function Portfolio() {
  const {
    portfolios, activePortfolioId, setActivePortfolioId,
    transactions, deleteTransaction,
    createPortfolio, renamePortfolio, deletePortfolio
  } = usePortfolio();
  const [showAdd, setShowAdd] = useState(false);
  const [showTx, setShowTx] = useState(false);
  const [showNewPortfolio, setShowNewPortfolio] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId);

  const handleCreatePortfolio = async (e) => {
    e.preventDefault();
    if (!newPortfolioName.trim()) return;
    const id = await createPortfolio(newPortfolioName.trim());
    setNewPortfolioName('');
    setShowNewPortfolio(false);
    if (id) setActivePortfolioId(id);
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    await renamePortfolio(activePortfolioId, editName.trim());
    setEditingName(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Portfolio management */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            {editingName ? (
              <form onSubmit={handleRename} className="flex gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-field text-lg font-bold py-1"
                  autoFocus
                />
                <button type="submit" className="btn-primary text-sm">Save</button>
                <button type="button" onClick={() => setEditingName(false)} className="btn-secondary text-sm">Cancel</button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{activePortfolio?.name || 'Portfolio'}</h1>
                <button
                  onClick={() => { setEditName(activePortfolio?.name || ''); setEditingName(true); }}
                  className="p-1 text-slate-500 hover:text-white rounded"
                >
                  <Edit3 size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewPortfolio(!showNewPortfolio)}
              className="btn-secondary flex items-center gap-1 text-sm"
            >
              <FolderPlus size={14} />
              <span className="hidden sm:inline">New Portfolio</span>
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="btn-primary flex items-center gap-1 text-sm"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Add Transaction</span>
            </button>
          </div>
        </div>

        {/* Portfolio tabs */}
        {portfolios.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {portfolios.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePortfolioId(p.id)}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${p.id === activePortfolioId ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* New portfolio form */}
        {showNewPortfolio && (
          <form onSubmit={handleCreatePortfolio} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newPortfolioName}
              onChange={(e) => setNewPortfolioName(e.target.value)}
              placeholder="Portfolio name..."
              className="input-field flex-1"
              autoFocus
            />
            <button type="submit" className="btn-primary text-sm">Create</button>
          </form>
        )}

        {/* Delete portfolio */}
        {portfolios.length > 1 && (
          <button
            onClick={() => {
              if (confirm(`Delete "${activePortfolio?.name}"? This removes all holdings and transactions.`)) {
                deletePortfolio(activePortfolioId);
              }
            }}
            className="btn-danger text-xs flex items-center gap-1 mb-4"
          >
            <Trash2 size={12} />
            Delete this portfolio
          </button>
        )}
      </div>

      {/* Holdings */}
      <div className="card">
        <h2 className="text-sm font-medium text-slate-400 mb-3">Holdings</h2>
        <HoldingsTable />
      </div>

      {/* Transaction history */}
      <div className="card">
        <button
          onClick={() => setShowTx(!showTx)}
          className="flex items-center justify-between w-full"
        >
          <h2 className="text-sm font-medium text-slate-400">
            Transaction History ({transactions.length})
          </h2>
          {showTx ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showTx && (
          <div className="mt-4 space-y-2">
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No transactions yet.</p>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${tx.type === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {tx.type.toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{tx.symbol}</p>
                      <p className="text-xs text-slate-500">
                        {tx.shares} shares @ ${tx.pricePerShare.toFixed(2)} &middot; {tx.date}
                      </p>
                      {tx.notes && <p className="text-xs text-slate-600 italic">{tx.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400">
                      ${(tx.shares * tx.pricePerShare).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm('Delete this transaction? Note: this will not automatically adjust your holdings.')) {
                          deleteTransaction(tx.id);
                        }
                      }}
                      className="p-1 text-slate-600 hover:text-red-400 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <AddTransactionModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
