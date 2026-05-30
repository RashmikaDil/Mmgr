// src/context/CurrencyContext.tsx
"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { fetchExchangeRates } from "@/services/currencyRateService";

import type { ExchangeRates } from '@/types/exchangeRates';

interface CurrencyContextProps {
  currency: string;
  setCurrency: (c: string) => void;
  exchangeRates: ExchangeRates;
  formatPrice: (value: number) => string;
}

const CurrencyContext = createContext<CurrencyContextProps>({
  currency: "USD",
  setCurrency: () => {},
  exchangeRates: {},
  formatPrice: (v) => v.toString(),
});

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<string>("USD");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});

  // Load rates on mount and refresh every 5 minutes
  useEffect(() => {
    const load = async () => {
      const rates = await fetchExchangeRates();
      setExchangeRates(rates);
    };
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (value: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
      }).format(value);
    } catch {
      return value.toString();
    }
  };

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, exchangeRates, formatPrice }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
