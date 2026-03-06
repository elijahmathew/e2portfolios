// Vercel Serverless Function - proxies Yahoo Finance chart history
export default async function handler(req, res) {
  const { symbol, interval = '1d', range = '1mo' } = req.query;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`
    );
    const data = await response.json();

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
