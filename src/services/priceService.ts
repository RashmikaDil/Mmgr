import type { Investment } from '@/types';

// Simple in‑memory cache to avoid hitting rate limits too often
interface CacheEntry {
  price: number;
  expires: number; // epoch ms
}
const priceCache = new Map<string, CacheEntry>();

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';
const ALPHA_VANTAGE_API = 'https://www.alphavantage.co/query';

export async function getCurrentPrice(ticker: string, type: 'stock' | 'crypto'): Promise<number> {
  const cacheKey = `${type}:${ticker}`;
  const now = Date.now();
  const cached = priceCache.get(cacheKey);
  if (cached && cached.expires > now) return cached.price;

  let price: number;
  if (type === 'crypto') {
    // CoinGecko expects IDs like "bitcoin"; we assume ticker is the ID.
    const url = `${COINGECKO_API}?ids=${encodeURIComponent(ticker)}&vs_currencies=usd`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to fetch crypto price');
    const data = await resp.json();
    price = data[ticker]?.usd;
    if (price === undefined) throw new Error(`Crypto ticker ${ticker} not found`);
  } else {
    const apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY;
    if (!apiKey) throw new Error('Alpha Vantage API key missing');
    const url = `${ALPHA_VANTAGE_API}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to fetch stock price');
    const data = await resp.json();
    const quote = data['Global Quote'];
    if (!quote) throw new Error(`Stock ticker ${ticker} not found`);
    price = parseFloat(quote['05. price']);
  }

  // cache for 30 seconds
  priceCache.set(cacheKey, { price, expires: now + 30_000 });
  return price;
}
