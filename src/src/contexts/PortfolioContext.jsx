import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, setDoc, getDocs
} from 'firebase/firestore';
import { fetchQuotes } from '../services/priceService';

const PortfolioContext = createContext();

export function usePortfolio() {
  return useContext(PortfolioContext);
}

export function PortfolioProvider({ children }) {
  const { user } = useAuth();
  const [portfolios, setPortfolios] = useState([]);
  const [activePortfolioId, setActivePortfolioId] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);

  // Listen to portfolios
  useEffect(() => {
    if (!user) {
      setPortfolios([]);
      setActivePortfolioId(null);
      setHoldings([]);
      setTransactions([]);
      setWatchlist([]);
      setPrices({});
      setLoading(false);
      return;
    }

    const portfoliosRef = collection(db, 'users', user.uid, 'portfolios');
    const q = query(portfoliosRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const portfolioList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Create default portfolio if none exists
      if (portfolioList.length === 0) {
        await addDoc(portfoliosRef, {
          name: 'My Portfolio',
          createdAt: serverTimestamp()
        });
        return;
      }

      setPortfolios(portfolioList);
      if (!activePortfolioId || !portfolioList.find(p => p.id === activePortfolioId)) {
        setActivePortfolioId(portfolioList[0].id);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Listen to holdings for active portfolio
  useEffect(() => {
    if (!user || !activePortfolioId) return;

    const holdingsRef = collection(
      db, 'users', user.uid, 'portfolios', activePortfolioId, 'holdings'
    );
    const unsubscribe = onSnapshot(holdingsRef, (snapshot) => {
      const holdingsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHoldings(holdingsList);
    });

    return unsubscribe;
  }, [user, activePortfolioId]);

  // Listen to transactions for active portfolio
  useEffect(() => {
    if (!user || !activePortfolioId) return;

    const txRef = collection(
      db, 'users', user.uid, 'portfolios', activePortfolioId, 'transactions'
    );
    const q = query(txRef, orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(txList);
    });

    return unsubscribe;
  }, [user, activePortfolioId]);

  // Listen to watchlist
  useEffect(() => {
    if (!user) return;

    const watchlistRef = collection(db, 'users', user.uid, 'watchlist');
    const unsubscribe = onSnapshot(watchlistRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWatchlist(list);
    });

    return unsubscribe;
  }, [user]);

  // Refresh prices
  const refreshPrices = useCallback(async () => {
    const allSymbols = [
      ...holdings.map(h => h.symbol),
      ...watchlist.map(w => w.symbol)
    ];
    const unique = [...new Set(allSymbols)];
    if (unique.length === 0) return;

    setPriceLoading(true);
    try {
      const newPrices = await fetchQuotes(unique);
      setPrices(prev => ({ ...prev, ...newPrices }));
    } catch (err) {
      console.error('Error refreshing prices:', err);
    }
    setPriceLoading(false);
  }, [holdings, watchlist]);

  // Auto-refresh prices every 60 seconds
  useEffect(() => {
    refreshPrices();
    const interval = setInterval(refreshPrices, 60000);
    return () => clearInterval(interval);
  }, [refreshPrices]);

  // Portfolio CRUD
  const createPortfolio = async (name) => {
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'portfolios');
    const doc = await addDoc(ref, { name, createdAt: serverTimestamp() });
    return doc.id;
  };

  const renamePortfolio = async (portfolioId, name) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'portfolios', portfolioId);
    await updateDoc(ref, { name });
  };

  const deletePortfolio = async (portfolioId) => {
    if (!user || portfolios.length <= 1) return;
    // Delete all holdings and transactions first
    const holdingsRef = collection(db, 'users', user.uid, 'portfolios', portfolioId, 'holdings');
    const txRef = collection(db, 'users', user.uid, 'portfolios', portfolioId, 'transactions');
    const [holdingsSnap, txSnap] = await Promise.all([getDocs(holdingsRef), getDocs(txRef)]);
    await Promise.all([
      ...holdingsSnap.docs.map(d => deleteDoc(d.ref)),
      ...txSnap.docs.map(d => deleteDoc(d.ref))
    ]);
    await deleteDoc(doc(db, 'users', user.uid, 'portfolios', portfolioId));
  };

  // Add a buy transaction and update holdings
  const addTransaction = async ({ symbol, shares, pricePerShare, date, type = 'buy', notes = '' }) => {
    if (!user || !activePortfolioId) return;

    const txRef = collection(
      db, 'users', user.uid, 'portfolios', activePortfolioId, 'transactions'
    );
    await addDoc(txRef, {
      symbol: symbol.toUpperCase(),
      shares: Number(shares),
      pricePerShare: Number(pricePerShare),
      date: date || new Date().toISOString().split('T')[0],
      type,
      notes,
      createdAt: serverTimestamp()
    });

    // Update or create holding
    const existingHolding = holdings.find(h => h.symbol === symbol.toUpperCase());
    const holdingsRef = collection(
      db, 'users', user.uid, 'portfolios', activePortfolioId, 'holdings'
    );

    if (existingHolding) {
      let newShares, newAvgPrice;
      if (type === 'buy') {
        const totalCost = (existingHolding.avgPrice * existingHolding.shares) + (Number(pricePerShare) * Number(shares));
        newShares = existingHolding.shares + Number(shares);
        newAvgPrice = totalCost / newShares;
      } else {
        newShares = existingHolding.shares - Number(shares);
        newAvgPrice = existingHolding.avgPrice; // avg price doesn't change on sell
      }

      if (newShares <= 0) {
        await deleteDoc(doc(holdingsRef, existingHolding.id));
      } else {
        await updateDoc(doc(holdingsRef, existingHolding.id), {
          shares: newShares,
          avgPrice: newAvgPrice
        });
      }
    } else if (type === 'buy') {
      await addDoc(holdingsRef, {
        symbol: symbol.toUpperCase(),
        shares: Number(shares),
        avgPrice: Number(pricePerShare)
      });
    }

    // Refresh price for the new symbol
    refreshPrices();
  };

  const deleteTransaction = async (txId) => {
    if (!user || !activePortfolioId) return;
    const ref = doc(
      db, 'users', user.uid, 'portfolios', activePortfolioId, 'transactions', txId
    );
    await deleteDoc(ref);
  };

  // Watchlist
  const addToWatchlist = async (symbol) => {
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'watchlist');
    await addDoc(ref, {
      symbol: symbol.toUpperCase(),
      addedAt: serverTimestamp()
    });
    refreshPrices();
  };

  const removeFromWatchlist = async (watchlistId) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'watchlist', watchlistId));
  };

  // Update holding book tag (wealth/active)
  const updateHoldingBook = async (holdingId, book) => {
    if (!user || !activePortfolioId) return;
    const ref = doc(
      db, 'users', user.uid, 'portfolios', activePortfolioId, 'holdings', holdingId
    );
    await updateDoc(ref, { book });
  };

  // Update holding thesis data
  const updateHoldingThesis = async (holdingId, thesisData) => {
    if (!user || !activePortfolioId) return;
    const ref = doc(
      db, 'users', user.uid, 'portfolios', activePortfolioId, 'holdings', holdingId
    );
    await updateDoc(ref, { thesis: thesisData });
  };

  // Price alerts
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!user) { setAlerts([]); return; }
    const alertsRef = collection(db, 'users', user.uid, 'alerts');
    const unsubscribe = onSnapshot(alertsRef, (snapshot) => {
      setAlerts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [user]);

  // Check alerts against current prices
  useEffect(() => {
    if (!alerts.length || !Object.keys(prices).length) return;
    alerts.forEach(async (alert) => {
      if (alert.status !== 'active') return;
      const quote = prices[alert.symbol];
      if (!quote) return;
      const triggered = alert.direction === 'above'
        ? quote.price >= alert.targetPrice
        : quote.price <= alert.targetPrice;
      if (triggered) {
        const ref = doc(db, 'users', user.uid, 'alerts', alert.id);
        await updateDoc(ref, { status: 'triggered', triggeredAt: serverTimestamp() });
      }
    });
  }, [alerts, prices, user]);

  const addAlert = async ({ symbol, targetPrice, direction, meaning }) => {
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'alerts');
    await addDoc(ref, {
      symbol: symbol.toUpperCase(),
      targetPrice: Number(targetPrice),
      direction,
      meaning,
      status: 'active',
      createdAt: serverTimestamp()
    });
  };

  const deleteAlert = async (alertId) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'alerts', alertId));
  };

  const dismissAlert = async (alertId) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'alerts', alertId);
    await updateDoc(ref, { status: 'dismissed' });
  };

  // Allocation targets
  const [allocationTargets, setAllocationTargets] = useState([]);

  useEffect(() => {
    if (!user) { setAllocationTargets([]); return; }
    const targetsRef = collection(db, 'users', user.uid, 'allocationTargets');
    const unsubscribe = onSnapshot(targetsRef, (snapshot) => {
      setAllocationTargets(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [user]);

  const addAllocationTarget = async ({ label, targetPercent, type }) => {
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'allocationTargets');
    await addDoc(ref, { label, targetPercent: Number(targetPercent), type: type || 'symbol' });
  };

  const deleteAllocationTarget = async (targetId) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'allocationTargets', targetId));
  };

  // Book-level computed values
  const wealthHoldings = holdings.filter(h => h.book === 'wealth');
  const activeHoldings = holdings.filter(h => h.book === 'active');
  const untaggedHoldings = holdings.filter(h => !h.book);

  const wealthValue = wealthHoldings.reduce((sum, h) => sum + ((prices[h.symbol]?.price || 0) * h.shares), 0);
  const activeValue = activeHoldings.reduce((sum, h) => sum + ((prices[h.symbol]?.price || 0) * h.shares), 0);

  // Computed values
  const totalValue = holdings.reduce((sum, h) => {
    const price = prices[h.symbol]?.price || 0;
    return sum + (price * h.shares);
  }, 0);

  const totalCost = holdings.reduce((sum, h) => {
    return sum + (h.avgPrice * h.shares);
  }, 0);

  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const value = {
    portfolios,
    activePortfolioId,
    setActivePortfolioId,
    holdings,
    transactions,
    watchlist,
    prices,
    loading,
    priceLoading,
    totalValue,
    totalCost,
    totalGain,
    totalGainPercent,
    wealthHoldings,
    activeHoldings,
    untaggedHoldings,
    wealthValue,
    activeValue,
    alerts,
    allocationTargets,
    createPortfolio,
    renamePortfolio,
    deletePortfolio,
    addTransaction,
    deleteTransaction,
    addToWatchlist,
    removeFromWatchlist,
    updateHoldingBook,
    updateHoldingThesis,
    addAlert,
    deleteAlert,
    dismissAlert,
    addAllocationTarget,
    deleteAllocationTarget,
    refreshPrices
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}
