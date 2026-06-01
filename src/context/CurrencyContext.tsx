// src/context/CurrencyContext.tsx
"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { fetchExchangeRates } from "@/services/currencyRateService";
import type { ExchangeRates } from "@/types/exchangeRates";

const STORAGE_KEY = "mmgr_currency";

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
  // Initialise from localStorage so the setting survives a page refresh
  const [currency, _setCurrency] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) ?? "USD";
    }
    return "USD";
  });
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});

  const setCurrency = (c: string) => {
    _setCurrency(c);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, c);
    }
  };

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
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return value.toFixed(2);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, exchangeRates, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
