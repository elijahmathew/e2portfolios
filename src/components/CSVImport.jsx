import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Check, AlertTriangle, ChevronDown } from 'lucide-react';
import { usePortfolio } from '../contexts/PortfolioContext';

// Flexible column matcher — checks if header contains key phrases
const matchCol = (patterns) => (h) => {
  const t = h.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  return patterns.some(p => t === p || t.includes(p));
};

// Brokerage detection patterns and column mappings
const BROKERAGE_PROFILES = {
  fidelity: {
    name: 'Fidelity',
    detect: (headers) => headers.some(h => /account\s*name/i.test(h)) && headers.some(h => /symbol/i.test(h)),
    map: {
      symbol: matchCol(['symbol']),
      shares: matchCol(['quantity']),
      avgPrice: matchCol(['cost basis per share', 'average cost basis', 'avg cost']),
      totalCostBasis: matchCol(['cost basis total', 'cost basis']),
    }
  },
  schwab: {
    name: 'Charles Schwab',
    detect: (headers) => headers.some(h => /symbol/i.test(h)) && headers.some(h => /cost\s*basis/i.test(h)) && !headers.some(h => /account\s*name/i.test(h)),
    map: {
      symbol: matchCol(['symbol']),
      shares: matchCol(['quantity']),
      avgPrice: matchCol(['cost basis per share', 'average cost', 'price']),
      totalCostBasis: matchCol(['cost basis total', 'cost basis']),
    }
  },
  robinhood: {
    name: 'Robinhood',
    detect: (headers) => headers.some(h => /purchase\s*price/i.test(h)),
    map: {
      symbol: matchCol(['symbol']),
      shares: matchCol(['shares', 'quantity']),
      avgPrice: matchCol(['purchase price per share', 'average cost', 'avg cost']),
    }
  },
  etrade: {
    name: 'E*TRADE',
    detect: (headers) => headers.some(h => /symbol/i.test(h)) && headers.some(h => /price\s*paid/i.test(h)),
    map: {
      symbol: matchCol(['symbol']),
      shares: matchCol(['quantity', 'qty']),
      avgPrice: matchCol(['price paid', 'cost per share']),
    }
  },
  vanguard: {
    name: 'Vanguard',
    detect: (headers) => headers.some(h => /investment\s*name/i.test(h)) && headers.some(h => /share\s*price/i.test(h)),
    map: {
      symbol: matchCol(['symbol']),
      shares: matchCol(['shares', 'quantity']),
      avgPrice: matchCol(['share price', 'price']),
    }
  },
  webull: {
    name: 'Webull',
    detect: (headers) => headers.some(h => /ticker/i.test(h)) && headers.some(h => /avg\s*cost/i.test(h)),
    map: {
      symbol: matchCol(['ticker', 'symbol']),
      shares: matchCol(['qty', 'quantity', 'shares']),
      avgPrice: matchCol(['avg cost', 'average cost']),
    }
  },
  generic: {
    name: 'Generic',
    detect: () => true,
    map: {
      symbol: matchCol(['symbol', 'ticker', 'stock', 'code']),
      shares: matchCol(['shares', 'quantity', 'qty', 'units', 'amount']),
      avgPrice: matchCol([
        'cost basis per share', 'avg price', 'average price', 'avg cost', 'average cost',
        'entry price', 'buy price', 'purchase price', 'price per share', 'unit cost',
        'cost per share', 'price paid', 'share price', 'price'
      ]),
      totalCostBasis: matchCol(['cost basis', 'total cost', 'book value']),
    }
  }
};

function parseCSV(text) {
  // Handle BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const lines = text.split(/\r?\n/).filter(line => line.trim());

  // Skip any non-header preamble lines (some brokerages add notes at top)
  let headerIndex = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cols = lines[i].split(',');
    // A header row typically has multiple columns and contains text like "symbol" or "ticker"
    if (cols.length >= 3 && cols.some(c => /symbol|ticker|stock|shares|quantity/i.test(c))) {
      headerIndex = i;
      break;
    }
  }

  const headers = lines[headerIndex].split(',').map(h => h.replace(/"/g, '').trim());
  const rows = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Simple CSV parse (handles quoted fields)
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += char; }
    }
    values.push(current.trim());

    if (values.length >= headers.length - 1) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      rows.push(row);
    }
  }

  return { headers, rows };
}

function cleanNumber(val) {
  if (!val) return NaN;
  // Remove $, commas, %, +, and whitespace
  const cleaned = String(val).replace(/[$,%+\s]/g, '').replace(/[()]/g, '-');
  return parseFloat(cleaned);
}

function cleanSymbol(val) {
  if (!val) return '';
  // Remove quotes, whitespace, and common suffixes
  return String(val).replace(/["'\s]/g, '').replace(/\*+$/, '').toUpperCase();
}

export default function CSVImport({ isOpen, onClose }) {
  const { addTransaction } = usePortfolio();
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState(null); // { brokerage, holdings, unmapped }
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [error, setError] = useState('');
  const [manualMapping, setManualMapping] = useState(null);
  const fileRef = useRef(null);

  const resetState = () => {
    setParsed(null);
    setImporting(false);
    setImported(false);
    setError('');
    setManualMapping(null);
  };

  const processFile = (file) => {
    resetState();
    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      setError('Please upload a CSV file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const { headers, rows } = parseCSV(text);

        if (rows.length === 0) {
          setError('No data rows found in the file.');
          return;
        }

        // Detect brokerage
        let detected = null;
        for (const [key, profile] of Object.entries(BROKERAGE_PROFILES)) {
          if (key === 'generic') continue;
          if (profile.detect(headers)) {
            detected = { key, ...profile };
            break;
          }
        }
        if (!detected) {
          detected = { key: 'generic', ...BROKERAGE_PROFILES.generic };
        }

        // Map columns
        const symbolCol = headers.find(detected.map.symbol);
        const sharesCol = headers.find(detected.map.shares);
        const priceCol = headers.find(detected.map.avgPrice);
        const totalCostCol = detected.map.totalCostBasis ? headers.find(detected.map.totalCostBasis) : null;

        if (!symbolCol) {
          // Need manual mapping
          setManualMapping({ headers, rows, brokerage: detected });
          return;
        }

        // Extract holdings
        const holdings = [];
        const skipped = [];

        for (const row of rows) {
          const symbol = cleanSymbol(row[symbolCol]);
          const shares = cleanNumber(row[sharesCol]);
          let price = priceCol ? cleanNumber(row[priceCol]) : NaN;

          // Fallback: compute per-share price from total cost basis / shares
          if ((isNaN(price) || price <= 0) && totalCostCol) {
            const totalCost = cleanNumber(row[totalCostCol]);
            if (!isNaN(totalCost) && totalCost > 0 && !isNaN(shares) && shares > 0) {
              price = totalCost / shares;
            }
          }

          if (!symbol || symbol === 'TOTAL' || symbol === 'CASH' || symbol.includes('**') || symbol.length > 10) {
            continue;
          }

          if (isNaN(shares) || shares <= 0) {
            skipped.push({ symbol, reason: 'Invalid shares' });
            continue;
          }

          holdings.push({
            symbol,
            shares,
            avgPrice: isNaN(price) || price <= 0 ? 0 : price,
            selected: true
          });
        }

        // Aggregate duplicate symbols
        const aggregated = {};
        for (const h of holdings) {
          if (aggregated[h.symbol]) {
            const existing = aggregated[h.symbol];
            const totalCost = (existing.avgPrice * existing.shares) + (h.avgPrice * h.shares);
            existing.shares += h.shares;
            existing.avgPrice = existing.shares > 0 ? totalCost / existing.shares : 0;
          } else {
            aggregated[h.symbol] = { ...h };
          }
        }

        setParsed({
          brokerage: detected.name,
          holdings: Object.values(aggregated),
          skipped,
          totalFound: rows.length,
          symbolCol,
          sharesCol,
          priceCol
        });
      } catch (err) {
        console.error('CSV parse error:', err);
        setError('Failed to parse CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const toggleHolding = (index) => {
    setParsed(prev => ({
      ...prev,
      holdings: prev.holdings.map((h, i) =>
        i === index ? { ...h, selected: !h.selected } : h
      )
    }));
  };

  const handleImport = async () => {
    if (!parsed) return;
    const selected = parsed.holdings.filter(h => h.selected);
    if (selected.length === 0) return;

    setImporting(true);
    try {
      for (const holding of selected) {
        await addTransaction({
          symbol: holding.symbol,
          shares: holding.shares,
          pricePerShare: holding.avgPrice,
          date: new Date().toISOString().split('T')[0],
          type: 'buy',
          notes: `Imported from ${parsed.brokerage} CSV`
        });
      }
      setImported(true);
    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to import some holdings. Please try again.');
    }
    setImporting(false);
  };

  const handleManualMap = (field, headerName) => {
    setManualMapping(prev => ({
      ...prev,
      [field]: headerName
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Import from CSV</h2>
          <button onClick={() => { resetState(); onClose(); }} className="p-1 hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Success state */}
        {imported && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">Import Complete!</h3>
            <p className="text-sm text-slate-400 mb-4">
              {parsed.holdings.filter(h => h.selected).length} holdings imported from {parsed.brokerage}
            </p>
            <button onClick={() => { resetState(); onClose(); }} className="btn-primary">
              Done
            </button>
          </div>
        )}

        {/* Error state */}
        {error && !imported && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Upload area */}
        {!parsed && !imported && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-cyan-400 bg-cyan-400/5' : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <Upload size={32} className="mx-auto mb-3 text-slate-500" />
              <p className="text-sm font-medium mb-1">Drop your CSV file here</p>
              <p className="text-xs text-slate-500">or click to browse</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-400 font-medium mb-2">Supported brokerages:</p>
              <div className="flex flex-wrap gap-2">
                {['Fidelity', 'Schwab', 'Robinhood', 'Vanguard', 'E*TRADE', 'Webull'].map(b => (
                  <span key={b} className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded">
                    {b}
                  </span>
                ))}
                <span className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded">
                  + any CSV with ticker/shares/price
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Export your positions from your brokerage account and upload the CSV file here. We'll auto-detect the format.
              </p>
            </div>
          </>
        )}

        {/* Manual column mapping */}
        {manualMapping && !parsed && !imported && (
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg p-3 text-sm">
              Couldn't auto-detect columns. Please map them manually.
            </div>
            {['symbol', 'shares', 'avgPrice'].map(field => (
              <div key={field}>
                <label className="block text-sm text-slate-400 mb-1">
                  {field === 'symbol' ? 'Ticker/Symbol column' : field === 'shares' ? 'Shares/Quantity column' : 'Price/Cost column'}
                </label>
                <select
                  className="input-field"
                  value={manualMapping[field] || ''}
                  onChange={(e) => handleManualMap(field, e.target.value)}
                >
                  <option value="">Select column...</option>
                  {manualMapping.headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
            <button
              onClick={() => {
                if (!manualMapping.symbol) return;
                const holdings = [];
                for (const row of manualMapping.rows) {
                  const symbol = cleanSymbol(row[manualMapping.symbol]);
                  const shares = cleanNumber(row[manualMapping.shares]);
                  const price = manualMapping.avgPrice ? cleanNumber(row[manualMapping.avgPrice]) : 0;
                  if (symbol && !isNaN(shares) && shares > 0) {
                    holdings.push({ symbol, shares, avgPrice: isNaN(price) ? 0 : price, selected: true });
                  }
                }
                setParsed({
                  brokerage: 'Manual',
                  holdings,
                  skipped: [],
                  totalFound: manualMapping.rows.length
                });
                setManualMapping(null);
              }}
              disabled={!manualMapping.symbol}
              className="btn-primary w-full disabled:opacity-50"
            >
              Map Columns
            </button>
          </div>
        )}

        {/* Preview and confirm */}
        {parsed && !imported && (
          <div className="space-y-4">
            <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg p-3 text-sm">
              Detected <strong>{parsed.brokerage}</strong> format — found {parsed.holdings.length} holdings
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {parsed.holdings.map((h, i) => (
                <div
                  key={i}
                  onClick={() => toggleHolding(i)}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-colors ${
                    h.selected ? 'bg-slate-700/50' : 'bg-slate-800/50 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      h.selected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'
                    }`}>
                      {h.selected && <Check size={12} className="text-slate-900" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{h.symbol}</p>
                      <p className="text-xs text-slate-500">
                        {h.shares} shares
                        {h.avgPrice > 0 ? ` @ $${h.avgPrice.toFixed(2)}` : ' (no price data)'}
                      </p>
                    </div>
                  </div>
                  {h.avgPrice > 0 && (
                    <span className="text-sm text-slate-400">
                      ${(h.shares * h.avgPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {parsed.skipped.length > 0 && (
              <p className="text-xs text-slate-500">
                Skipped {parsed.skipped.length} rows (invalid data or cash positions)
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => resetState()}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || parsed.holdings.filter(h => h.selected).length === 0}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {importing
                  ? `Importing ${parsed.holdings.filter(h => h.selected).length}...`
                  : `Import ${parsed.holdings.filter(h => h.selected).length} Holdings`
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
