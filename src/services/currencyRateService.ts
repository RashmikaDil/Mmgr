import type { ExchangeRates } from '@/types/exchangeRates';

/**
 * Fetches latest exchange rates relative to USD.
 *
 * Primary:  https://api.frankfurter.dev  — free, no key, ECB data (~30 currencies incl. INR)
 * Fallback: https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api — free, no key, 160+ currencies
 *
 * No API key required. NEXT_PUBLIC_EXCHANGE_RATE_API_KEY is no longer needed.
 */

async function fetchFromFrankfurter(): Promise<ExchangeRates> {
  const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD');
  if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
  const data = await res.json();
  // Shape: { amount, base, date, rates: { [code]: number } }
  if (!data?.rates || typeof data.rates !== 'object') {
    throw new Error('Unexpected Frankfurter shape');
  }
  const rates: ExchangeRates = { USD: 1 };
  for (const [code, rate] of Object.entries(data.rates)) {
    if (typeof rate === 'number') rates[code] = rate;
  }
  return rates;
}

async function fetchFromFawaz(): Promise<ExchangeRates> {
  // Returns: { date, usd: { [code]: number } }
  const res = await fetch(
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'
  );
  if (!res.ok) throw new Error(`Fawaz HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.usd || typeof data.usd !== 'object') {
    throw new Error('Unexpected Fawaz shape');
  }
  const rates: ExchangeRates = { USD: 1 };
  for (const [code, rate] of Object.entries(data.usd as Record<string, unknown>)) {
    if (typeof rate === 'number') rates[code.toUpperCase()] = rate;
  }
  return rates;
}

export async function fetchExchangeRates(): Promise<ExchangeRates> {
  // Try primary source (fawazahmed0 via jsDelivr CDN, 160+ currencies)
  try {
    const rates = await fetchFromFawaz();
    return rates;
  } catch (e) {
    console.warn('[currencyRateService] Fawaz failed, trying fallback:', e);
  }

  // Try fallback source (Frankfurter — ECB data, ~30 currencies)
  try {
    const rates = await fetchFromFrankfurter();
    return rates;
  } catch (e) {
    console.error('[currencyRateService] Both exchange rate sources failed:', e);
  }

  // Ultimate fallback — return USD only, app degrades gracefully
  return { USD: 1 } as ExchangeRates;
}
