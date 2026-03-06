// Vercel Serverless Function - proxies Yahoo Finance API
export default async function handler(req, res) {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    );
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: 'Not found' });

    const meta = result.meta;
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.json({
      symbol: symbol.toUpperCase(),
      price: meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose || meta.previousClose,
      change: meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose),
      changePercent: ((meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose)) / (meta.chartPreviousClose || meta.previousClose)) * 100,
      name: meta.shortName || symbol,
      currency: meta.currency || 'USD',
      type: 'stock'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
