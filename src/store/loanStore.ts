import { create } from 'zustand';
import { loanService } from '@/services/loanService';
import type { Loan } from '@/types';

interface LoanState {
  loans: Loan[];
  loading: boolean;
  error: string | null;
  fetchLoans: (userId: string) => Promise<void>;
  addLoan: (loan: Omit<Loan, 'id' | 'createdAt'>) => Promise<void>;
  updateLoan: (id: string, data: Partial<Omit<Loan, 'id' | 'userId'>>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
}

export const useLoanStore = create<LoanState>((set, get) => ({
  loans: [],
  loading: false,
  error: null,

  fetchLoans: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const loans = await loanService.getAll(userId);
      set({ loans, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch loans', loading: false });
    }
  },

  addLoan: async (loan) => {
    set({ loading: true, error: null });
    try {
      const newLoan = await loanService.create(loan);
      set((state) => ({
        loans: [...state.loans, newLoan],
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to add loan', loading: false });
      throw err;
    }
  },

  updateLoan: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await loanService.update(id, data);
      set((state) => ({
        loans: state.loans.map((l) => (l.id === id ? { ...l, ...data } : l)),
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to update loan', loading: false });
      throw err;
    }
  },

  deleteLoan: async (id) => {
    set({ loading: true, error: null });
    try {
      await loanService.delete(id);
      set((state) => ({
        loans: state.loans.filter((l) => l.id !== id),
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete loan', loading: false });
      throw err;
    }
  },
}));
