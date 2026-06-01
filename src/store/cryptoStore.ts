import { create } from 'zustand';
import { CryptoHolding } from '@/types';
import { cryptoService } from '@/services/cryptoService';

interface CryptoState {
  holdings: CryptoHolding[];
  loading: boolean;
  error: string | null;
  fetchHoldings: (userId: string) => Promise<void>;
  addHolding: (data: Omit<CryptoHolding, 'id' | 'createdAt'>) => Promise<CryptoHolding>;
  updateHolding: (id: string, updates: Partial<CryptoHolding>) => Promise<void>;
  deleteHolding: (id: string) => Promise<void>;
}

export const useCryptoStore = create<CryptoState>((set, get) => ({
  holdings: [],
  loading: false,
  error: null,

  fetchHoldings: async (userId) => {
    set({ loading: true, error: null });
    try {
      const holdings = await cryptoService.getAll(userId);
      set({ holdings, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  addHolding: async (data) => {
    set({ loading: true, error: null });
    try {
      const newHolding = await cryptoService.create(data);
      set((state) => ({ holdings: [...state.holdings, newHolding], loading: false }));
      return newHolding;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  updateHolding: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await cryptoService.update(id, updates);
      set((state) => ({
        holdings: state.holdings.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        loading: false,
      }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  deleteHolding: async (id) => {
    set({ loading: true, error: null });
    try {
      await cryptoService.delete(id);
      set((state) => ({
        holdings: state.holdings.filter((h) => h.id !== id),
        loading: false,
      }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },
}));
