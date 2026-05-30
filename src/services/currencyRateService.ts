import type { ExchangeRates } from '@/types/exchangeRates';

/**
 * Fetches latest exchange rates relative to USD from exchangerate.host.
 * Returns a map of currency code to rate.
 * If the API fails or returns an unexpected shape, returns an empty object.
 */
export async function fetchExchangeRates(): Promise<ExchangeRates> {
  try {
    // Build request URL with optional API key
    const baseUrl = 'https://api.exchangerate.host/latest?base=USD';
    const apiKey = process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_KEY;
    const url = apiKey ? `${baseUrl}&access_key=${apiKey}` : baseUrl;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    // Validate response shape
    if (!data || typeof data !== 'object' || !data.rates) {
      // Some APIs return { success: false, error: {...} } when missing/invalid key
      console.warn('Exchange rate API returned unexpected shape', data);
      throw new Error('Invalid rate response');
    }
    const rates: ExchangeRates = {};
    for (const [code, rate] of Object.entries(data.rates)) {
      if (typeof rate === 'number') {
        rates[code] = rate;
      }
    }
    return rates;
  } catch (e) {
    console.error('Failed to fetch exchange rates', e);
    return {} as ExchangeRates;
  }
}
