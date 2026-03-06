import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function AllocationTargets({ holdings, prices, targets, bookFilter }) {
  const allocation = useMemo(() => {
    if (!holdings || !prices) return {};

    const totalValue = holdings.reduce((sum, h) => {
      const price = prices[h.symbol]?.price || 0;
      return sum + (price * h.shares);
    }, 0);

    if (totalValue === 0) return {};

    const alloc = {};
    holdings.forEach((h) => {
      const price = prices[h.symbol]?.price || 0;
      const value = price * h.shares;
      const percent = (value / totalValue) * 100;
      alloc[h.symbol] = {
        value,
        percent,
        symbol: h.symbol
      };
    });

    return alloc;
  }, [holdings, prices]);

  const getColorForDeviation = (actual, target) => {
    const diff = Math.abs(actual - target);
    if (diff <= 5) return 'bg-emerald-500';
    if (diff <= 15) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getTextColorForDeviation = (actual, target) => {
    const diff = Math.abs(actual - target);
    if (diff <= 5) return 'text-emerald-400';
    if (diff <= 15) return 'text-amber-400';
    return 'text-red-400';
  };

  if (!targets || targets.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Allocation Targets</h3>
        <p className="text-slate-400">No allocation targets configured</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-6">Allocation Targets</h3>

      <div className="space-y-6">
        {targets.map((target, idx) => {
          const actual = allocation[target.label]?.percent || 0;
          const deviation = actual - target.targetPercent;
          const textColor = getTextColorForDeviation(actual, target.targetPercent);
          const barColor = getColorForDeviation(actual, target.targetPercent);

          return (
            <div key={idx}>
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-white">{target.label}</span>
                  <span className={`text-sm ${textColor} font-medium flex items-center gap-1`}>
                    {actual > target.targetPercent ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    )}
                    {actual.toFixed(1)}%
                  </span>
                </div>
                <span className="text-sm text-slate-400">
                  Target: {target.targetPercent.toFixed(1)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative h-8 bg-slate-700 rounded-lg overflow-hidden border border-slate-600">
                {/* Actual allocation bar */}
                <div
                  className={`h-full ${barColor} transition-all duration-300`}
                  style={{ width: `${Math.min(actual, 100)}%` }}
                />
                {/* Target line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-cyan-400/50"
                  style={{ left: `${target.targetPercent}%` }}
                  title={`Target: ${target.targetPercent}%`}
                />
              </div>

              {/* Details */}
              <div className="flex items-center justify-between mt-2 text-xs">
                <div className="text-slate-400">
                  Actual: <span className="text-white font-medium">{actual.toFixed(1)}%</span>
                  {' / '}
                  Target: <span className="text-white font-medium">{target.targetPercent.toFixed(1)}%</span>
                </div>
                <div className={`font-medium ${textColor}`}>
                  {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-700 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-slate-400">Within 5% (Good)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-slate-400">5-15% off (Fair)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-slate-400">15%+ off (Poor)</span>
        </div>
      </div>
    </div>
  );
}
