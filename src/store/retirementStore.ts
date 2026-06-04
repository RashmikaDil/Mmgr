import { create } from 'zustand';
import { retirementService } from '@/services/retirementService';
import type { RetirementAccount } from '@/types';

interface RetirementState {
  accounts: RetirementAccount[];
  loading: boolean;
  error: string | null;
  fetchAccounts: (userId: string) => Promise<void>;
  addAccount: (account: Omit<RetirementAccount, 'id' | 'createdAt'>) => Promise<void>;
  updateAccount: (id: string, data: Partial<Omit<RetirementAccount, 'id' | 'userId'>>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
}

export const useRetirementStore = create<RetirementState>((set, get) => ({
  accounts: [],
  loading: false,
  error: null,

  fetchAccounts: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const accounts = await retirementService.getAll(userId);
      set({ accounts, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch retirement accounts', loading: false });
    }
  },

  addAccount: async (account) => {
    set({ loading: true, error: null });
    try {
      const newAccount = await retirementService.create(account);
      set((state) => ({
        accounts: [...state.accounts, newAccount],
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to add retirement account', loading: false });
      throw err;
    }
  },

  updateAccount: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedAccount = await retirementService.update(id, data);
      set((state) => ({
        accounts: state.accounts.map((acc) => (acc.id === id ? updatedAccount : acc)),
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to update retirement account', loading: false });
      throw err;
    }
  },

  deleteAccount: async (id) => {
    set({ loading: true, error: null });
    try {
      await retirementService.delete(id);
      set((state) => ({
        accounts: state.accounts.filter((acc) => acc.id !== id),
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete retirement account', loading: false });
      throw err;
    }
  },
}));
