import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar
} from 'recharts';
import { usePortfolio } from '../contexts/PortfolioContext';

const COLORS = [
  '#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24',
  '#fb923c', '#60a5fa', '#e879f9', '#4ade80', '#f87171'
];

// Allocation pie chart
export function AllocationChart() {
  const { holdings, prices, totalValue } = usePortfolio();

  const data = holdings
    .map(h => ({
      name: h.symbol,
      value: (prices[h.symbol]?.price || 0) * h.shares
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Add holdings to see allocation
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percent = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0;
      return (
        <div className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-sm font-medium">{item.name}</p>
          <p className="text-xs text-slate-400">
            ${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Performance / gain per holding bar chart
export function GainChart() {
  const { holdings, prices } = usePortfolio();

  const data = holdings
    .map(h => {
      const currentPrice = prices[h.symbol]?.price || 0;
      const gain = (currentPrice - h.avgPrice) * h.shares;
      const gainPercent = h.avgPrice > 0 ? ((currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0;
      return {
        symbol: h.symbol,
        gain,
        gainPercent,
        fill: gain >= 0 ? '#34d399' : '#f87171'
      };
    })
    .sort((a, b) => b.gain - a.gain);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Add holdings to see gains
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-sm font-medium">{item.symbol}</p>
          <p className={`text-xs ${item.gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {item.gain >= 0 ? '+' : ''}${item.gain.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            ({item.gain >= 0 ? '+' : ''}{item.gainPercent.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 40, right: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v.toFixed(0)}`} />
        <YAxis type="category" dataKey="symbol" tick={{ fill: '#94a3b8', fontSize: 11 }} width={40} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="gain" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Day change chart
export function DayChangeChart() {
  const { holdings, prices } = usePortfolio();

  const data = holdings
    .map(h => {
      const quote = prices[h.symbol];
      const dayChange = quote?.changePercent || 0;
      return {
        symbol: h.symbol,
        change: dayChange,
        fill: dayChange >= 0 ? '#34d399' : '#f87171'
      };
    })
    .sort((a, b) => b.change - a.change);

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: 0, right: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="symbol" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(1)}%`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#334155', border: '1px solid #475569', borderRadius: '8px' }}
          labelStyle={{ color: '#e2e8f0' }}
          formatter={(value) => [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, 'Change']}
        />
        <Bar dataKey="change" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Allocation legend
export function AllocationLegend() {
  const { holdings, prices, totalValue } = usePortfolio();

  const data = holdings
    .map(h => ({
      symbol: h.symbol,
      value: (prices[h.symbol]?.price || 0) * h.shares,
      type: prices[h.symbol]?.type || 'stock'
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {data.map((item, i) => (
        <div key={item.symbol} className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
          <span className="text-slate-400">{item.symbol}</span>
          <span className="text-slate-500 ml-auto">
            {totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0}%
          </span>
        </div>
      ))}
    </div>
  );
}
