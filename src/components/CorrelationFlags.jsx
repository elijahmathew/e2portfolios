import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function CorrelationFlags({ holdings, prices }) {
  const correlations = useMemo(() => {
    if (!holdings || holdings.length < 2) return [];

    // Extract thesis keywords from all holdings
    const thesisKeywords = [];
    holdings.forEach((h) => {
      if (!h.thesis) return;

      // Split thesis into words and filter for meaningful keywords
      const words = h.thesis.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      words.forEach((word) => {
        // Look for domain-specific keywords that indicate shared thesis
        const domainKeywords = [
          'iran', 'conflict', 'defense', 'defense spending', 'geopolitical', 'war',
          'inflation', 'fed', 'interest rates', 'yield curve', 'recession', 'macro',
          'ai', 'artificial intelligence', 'nvidia', 'semiconductor',
          'oil', 'energy', 'renewable', 'climate',
          'crypto', 'bitcoin', 'blockchain',
          'pharma', 'biotech', 'drug', 'fda', 'clinical',
          'tech', 'software', 'saas', 'cloud',
          'real estate', 'housing', 'mortgage', 'reits',
          'automotive', 'ev', 'electric vehicle', 'tesla',
          'retail', 'consumer', 'earnings', 'margin',
          'china', 'trade', 'tariff'
        ];

        if (domainKeywords.some((keyword) => keyword.includes(word) || word.includes(keyword))) {
          thesisKeywords.push({
            keyword: word,
            symbol: h.symbol
          });
        }
      });
    });

    // Group holdings by common keywords
    const grouped = {};
    thesisKeywords.forEach(({ keyword, symbol }) => {
      if (!grouped[keyword]) {
        grouped[keyword] = [];
      }
      if (!grouped[keyword].includes(symbol)) {
        grouped[keyword].push(symbol);
      }
    });

    // Filter to only keywords shared by 2+ holdings
    const correlatedGroups = Object.entries(grouped)
      .filter(([, symbols]) => symbols.length >= 2)
      .map(([keyword, symbols]) => ({
        keyword,
        symbols,
        count: symbols.length
      }))
      .sort((a, b) => b.count - a.count);

    return correlatedGroups;
  }, [holdings]);

  const calculateExposure = (symbols) => {
    if (!prices || !holdings) return 0;

    let totalValue = 0;
    symbols.forEach((symbol) => {
      const holding = holdings.find((h) => h.symbol === symbol);
      if (holding && prices[symbol]) {
        totalValue += prices[symbol].price * holding.shares;
      }
    });
    return totalValue;
  };

  const calculateTotalPortfolioValue = () => {
    if (!holdings || !prices) return 0;
    return holdings.reduce((sum, h) => {
      const price = prices[h.symbol]?.price || 0;
      return sum + price * h.shares;
    }, 0);
  };

  if (correlations.length === 0) return null;

  const totalValue = calculateTotalPortfolioValue();

  return (
    <div className="space-y-3">
      {correlations.map((group, idx) => {
        const exposure = calculateExposure(group.symbols);
        const exposurePercent = totalValue > 0 ? (exposure / totalValue) * 100 : 0;

        return (
          <div
            key={idx}
            className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-300 mb-1">
                  {group.count} holdings share "{group.keyword}" thesis
                </p>
                <p className="text-sm text-slate-300 mb-2">
                  <span className="font-mono font-medium">{group.symbols.join(', ')}</span>
                </p>
                <p className="text-xs text-amber-200/70">
                  Combined exposure:{' '}
                  <span className="font-semibold text-amber-300">
                    ${exposure.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </span>
                  {' '}
                  <span className="text-amber-200">
                    ({exposurePercent.toFixed(1)}% of portfolio)
                  </span>
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
