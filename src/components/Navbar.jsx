import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePortfolio } from '../contexts/PortfolioContext';
import {
  LayoutDashboard, Briefcase, Eye, LogOut, Menu, X,
  RefreshCw, ChevronDown
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { portfolios, activePortfolioId, setActivePortfolioId, refreshPrices, priceLoading } = usePortfolio();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId);

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/portfolio', icon: Briefcase, label: 'Portfolio' },
    { to: '/watchlist', icon: Eye, label: 'Watchlist' },
  ];

  return (
    <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-bold text-lg">Portfolio</span>

            {/* Portfolio selector */}
            {portfolios.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1 text-sm text-slate-400 hover:text-white bg-slate-700 rounded-lg px-2 py-1"
                >
                  {activePortfolio?.name || 'Select'}
                  <ChevronDown size={14} />
                </button>
                {dropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-700 rounded-lg shadow-xl border border-slate-600 py-1 min-w-[150px]">
                    {portfolios.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setActivePortfolioId(p.id); setDropdownOpen(false); }}
                        className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 ${p.id === activePortfolioId ? 'text-cyan-400' : 'text-slate-300'}`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-slate-700 text-cyan-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={refreshPrices}
              disabled={priceLoading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
              title="Refresh prices"
            >
              <RefreshCw size={16} className={priceLoading ? 'animate-spin' : ''} />
            </button>

            {user && (
              <div className="hidden md:flex items-center gap-2">
                {user.photoURL && (
                  <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
                )}
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700 transition-colors"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-700 pb-3 px-4">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${isActive ? 'text-cyan-400 bg-slate-700' : 'text-slate-400'}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          {user && (
            <button
              onClick={() => { logout(); setMobileOpen(false); }}
              className="flex items-center gap-3 px-3 py-3 text-red-400 text-sm w-full"
            >
              <LogOut size={18} />
              Sign out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
