import { create } from 'zustand';
import { Investment } from '@/types';
import { investmentService } from '@/services/investmentService';

interface InvestmentState {
  investments: Investment[];
  loading: boolean;
  error: string | null;
  selectedInvestment: Investment | null;
  fetchInvestments: (userId: string, familyId?: string) => Promise<void>;
  addInvestment: (data: Omit<Investment, 'id' | 'createdAt'>) => Promise<void>;
  updateInvestment: (id: string, updates: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  setSelectedInvestment: (inv: Investment | null) => void;
  // Optimistic helpers
  addOptimistic: (inv: Investment) => void;
  updateOptimistic: (id: string, updates: Partial<Investment>) => void;
  removeOptimistic: (id: string) => void;
  refresh: (userId: string) => Promise<void>;
}

export const useInvestmentStore = create<InvestmentState>((set, get) => ({
  investments: [],
  loading: false,
  error: null,
  selectedInvestment: null,
  fetchInvestments: async (userId, familyId) => {
    set({ loading: true, error: null });
    try {
      const investments = await investmentService.getAll(userId, familyId);
      set({ investments, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  addInvestment: async (data) => {
    set({ loading: true, error: null });
    try {
      const newInv = await investmentService.create(data);
      // Optimistic add
      get().addOptimistic(newInv);
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  updateInvestment: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await investmentService.update(id, updates);
      get().updateOptimistic(id, updates);
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  deleteInvestment: async (id) => {
    set({ loading: true, error: null });
    try {
      await investmentService.delete(id);
      get().removeOptimistic(id);
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  setSelectedInvestment: (inv) => set({ selectedInvestment: inv }),
  addOptimistic: (inv) => set((state) => ({ investments: [...state.investments, inv], loading: false })),
  updateOptimistic: (id, updates) =>
    set((state) => ({
      investments: state.investments.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      loading: false,
    })),
  removeOptimistic: (id) =>
    set((state) => ({
      investments: state.investments.filter((i) => i.id !== id),
      loading: false,
    })),
  refresh: async (userId) => {
    await get().fetchInvestments(userId);
  },
}));
