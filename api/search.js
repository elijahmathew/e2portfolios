// Vercel Serverless Function - proxies Yahoo Finance search
export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${q}&quotesCount=6&newsCount=0`
    );
    const data = await response.json();

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.json({
      quotes: (data.quotes || [])
        .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
        .map(q => ({
          symbol: q.symbol,
          shortname: q.shortname || q.longname || q.symbol,
          quoteType: q.quoteType,
          exchange: q.exchange
        }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
