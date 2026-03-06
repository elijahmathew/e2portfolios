// Price service using free APIs
// Stocks: Yahoo Finance (via Vercel serverless proxy or direct for dev)
// Crypto: CoinGecko (free, CORS-enabled)

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Top crypto symbols mapped to CoinGecko IDs
const CRYPTO_MAP = {
  'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin',
  'SOL': 'solana', 'XRP': 'ripple', 'ADA': 'cardano',
  'DOGE': 'dogecoin', 'DOT': 'polkadot', 'AVAX': 'avalanche-2',
  'MATIC': 'matic-network', 'LINK': 'chainlink', 'UNI': 'uniswap',
  'ATOM': 'cosmos', 'LTC': 'litecoin', 'SHIB': 'shiba-inu',
  'ARB': 'arbitrum', 'OP': 'optimism', 'APT': 'aptos',
  'NEAR': 'near', 'FIL': 'filecoin', 'ALGO': 'algorand',
  'XLM': 'stellar', 'PEPE': 'pepe', 'RENDER': 'render-token',
  'FET': 'fetch-ai', 'SUI': 'sui', 'AAVE': 'aave',
};

export function isCrypto(symbol) {
  return symbol.toUpperCase() in CRYPTO_MAP;
}

// Fetch stock quote from Yahoo Finance
async function fetchStockQuote(symbol) {
  try {
    // Use the Vercel/Netlify serverless function in production,
    // or Vite proxy in development
    const url = import.meta.env.DEV
      ? `/api/yahoo/v8/finance/chart/${symbol}?interval=1d&range=1d`
      : `/api/quote?symbol=${symbol}`;

    const res = await fetch(url);
    const data = await res.json();

    if (import.meta.env.DEV) {
      const result = data.chart?.result?.[0];
      if (!result) return null;
      const meta = result.meta;
      return {
        symbol: symbol.toUpperCase(),
        price: meta.regularMarketPrice,
        previousClose: meta.chartPreviousClose || meta.previousClose,
        change: meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose),
        changePercent: ((meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose)) / (meta.chartPreviousClose || meta.previousClose)) * 100,
        name: meta.shortName || symbol,
        currency: meta.currency || 'USD',
        type: 'stock'
      };
    }
    return data;
  } catch (err) {
    console.error(`Error fetching stock ${symbol}:`, err);
    return null;
  }
}

// Fetch crypto quote from CoinGecko
async function fetchCryptoQuote(symbol) {
  const id = CRYPTO_MAP[symbol.toUpperCase()];
  if (!id) return null;

  try {
    const res = await fetch(
      `${COINGECKO_BASE}/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`
    );
    const data = await res.json();

    if (!data[id]) return null;

    const price = data[id].usd;
    const changePercent = data[id].usd_24h_change || 0;

    return {
      symbol: symbol.toUpperCase(),
      price,
      previousClose: price / (1 + changePercent / 100),
      change: price - (price / (1 + changePercent / 100)),
      changePercent,
      name: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
      currency: 'USD',
      type: 'crypto'
    };
  } catch (err) {
    console.error(`Error fetching crypto ${symbol}:`, err);
    return null;
  }
}

// Fetch a single quote
export async function fetchQuote(symbol) {
  if (isCrypto(symbol.toUpperCase())) {
    return fetchCryptoQuote(symbol);
  }
  return fetchStockQuote(symbol);
}

// Fetch multiple quotes at once
export async function fetchQuotes(symbols) {
  if (!symbols.length) return {};

  const cryptoSymbols = symbols.filter(s => isCrypto(s));
  const stockSymbols = symbols.filter(s => !isCrypto(s));

  const results = {};

  // Batch crypto fetch
  if (cryptoSymbols.length) {
    const ids = cryptoSymbols.map(s => CRYPTO_MAP[s.toUpperCase()]).filter(Boolean);
    try {
      const res = await fetch(
        `${COINGECKO_BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`
      );
      const data = await res.json();

      for (const symbol of cryptoSymbols) {
        const id = CRYPTO_MAP[symbol.toUpperCase()];
        if (data[id]) {
          const price = data[id].usd;
          const changePercent = data[id].usd_24h_change || 0;
          results[symbol.toUpperCase()] = {
            symbol: symbol.toUpperCase(),
            price,
            previousClose: price / (1 + changePercent / 100),
            change: price - (price / (1 + changePercent / 100)),
            changePercent,
            name: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
            currency: 'USD',
            type: 'crypto'
          };
        }
      }
    } catch (err) {
      console.error('Error batch fetching crypto:', err);
    }
  }

  // Fetch stocks individually (Yahoo doesn't have a great batch endpoint for free)
  const stockPromises = stockSymbols.map(async (symbol) => {
    const quote = await fetchStockQuote(symbol);
    if (quote) results[symbol.toUpperCase()] = quote;
  });

  await Promise.all(stockPromises);
  return results;
}

// Fetch historical prices for charts
export async function fetchHistory(symbol, range = '1M') {
  const rangeMap = {
    '1W': { interval: '1h', range: '5d' },
    '1M': { interval: '1d', range: '1mo' },
    '3M': { interval: '1d', range: '3mo' },
    '6M': { interval: '1d', range: '6mo' },
    '1Y': { interval: '1wk', range: '1y' },
    'ALL': { interval: '1mo', range: 'max' }
  };

  const params = rangeMap[range] || rangeMap['1M'];

  if (isCrypto(symbol)) {
    const id = CRYPTO_MAP[symbol.toUpperCase()];
    if (!id) return [];
    const daysMap = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, 'ALL': 'max' };
    const days = daysMap[range] || 30;
    try {
      const res = await fetch(
        `${COINGECKO_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}`
      );
      const data = await res.json();
      return (data.prices || []).map(([timestamp, price]) => ({
        date: new Date(timestamp).toLocaleDateString(),
        timestamp,
        price
      }));
    } catch (err) {
      console.error('Error fetching crypto history:', err);
      return [];
    }
  }

  // Stock history via Yahoo Finance
  try {
    const url = import.meta.env.DEV
      ? `/api/yahoo/v8/finance/chart/${symbol}?interval=${params.interval}&range=${params.range}`
      : `/api/history?symbol=${symbol}&interval=${params.interval}&range=${params.range}`;

    const res = await fetch(url);
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    return timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toLocaleDateString(),
      timestamp: ts * 1000,
      price: closes[i]
    })).filter(d => d.price != null);
  } catch (err) {
    console.error('Error fetching stock history:', err);
    return [];
  }
}

// Search for a ticker symbol
export async function searchSymbol(query) {
  // Check crypto first
  const upperQuery = query.toUpperCase();
  const cryptoMatches = Object.entries(CRYPTO_MAP)
    .filter(([sym, id]) =>
      sym.includes(upperQuery) || id.includes(query.toLowerCase())
    )
    .map(([sym, id]) => ({
      symbol: sym,
      name: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
      type: 'crypto'
    }));

  // Search Yahoo Finance for stocks
  let stockMatches = [];
  try {
    const url = import.meta.env.DEV
      ? `/api/yahoo/v1/finance/search?q=${query}&quotesCount=6&newsCount=0`
      : `/api/search?q=${query}`;

    const res = await fetch(url);
    const data = await res.json();
    stockMatches = (data.quotes || [])
      .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType === 'ETF' ? 'etf' : 'stock',
        exchange: q.exchange
      }));
  } catch (err) {
    console.error('Error searching stocks:', err);
  }

  return [...cryptoMatches.slice(0, 3), ...stockMatches.slice(0, 6)];
}
