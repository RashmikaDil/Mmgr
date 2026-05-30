import { create } from 'zustand';
import { FixedDeposit } from '@/types';
import { fixedDepositService } from '@/services/fixedDepositService';

interface FixedDepositState {
  deposits: FixedDeposit[];
  loading: boolean;
  error: string | null;
  fetchDeposits: (userId: string, familyId?: string) => Promise<void>;
  addDeposit: (data: Omit<FixedDeposit, 'id' | 'createdAt'>) => Promise<void>;
  updateDeposit: (id: string, updates: Partial<FixedDeposit>) => Promise<void>;
  deleteDeposit: (id: string) => Promise<void>;
}

export const useFixedDepositStore = create<FixedDepositState>((set) => ({
  deposits: [],
  loading: false,
  error: null,
  fetchDeposits: async (userId, familyId) => {
    set({ loading: true, error: null });
    try {
      const deposits = await fixedDepositService.getDepositsByUser(userId, familyId);
      set({ deposits, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  addDeposit: async (data) => {
    set({ loading: true, error: null });
    try {
      const newDeposit = await fixedDepositService.createFixedDeposit(data);
      set((state) => ({ deposits: [...state.deposits, newDeposit], loading: false }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  updateDeposit: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await fixedDepositService.updateFixedDeposit(id, updates);
      set((state) => ({
        deposits: state.deposits.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        loading: false,
      }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  deleteDeposit: async (id) => {
    set({ loading: true, error: null });
    try {
      await fixedDepositService.deleteFixedDeposit(id);
      set((state) => ({ deposits: state.deposits.filter((d) => d.id !== id), loading: false }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
}));
