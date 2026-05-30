import { create } from 'zustand';
import { Loan } from '@/types';
import { loanService } from '@/services/loanService';

interface LoanState {
  loans: Loan[];
  loading: boolean;
  error: string | null;
  fetchLoans: (userId: string, familyId?: string) => Promise<void>;
  addLoan: (data: Omit<Loan, 'id' | 'createdAt'>) => Promise<void>;
  updateLoan: (id: string, updates: Partial<Loan>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
}

export const useLoanStore = create<LoanState>((set) => ({
  loans: [],
  loading: false,
  error: null,
  fetchLoans: async (userId, familyId) => {
    set({ loading: true, error: null });
    try {
      const loans = await loanService.getAll(userId, familyId);
      set({ loans, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  addLoan: async (data) => {
    set({ loading: true, error: null });
    try {
      const newLoan = await loanService.create(data);
      set((state) => ({ loans: [...state.loans, newLoan], loading: false }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  updateLoan: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await loanService.update(id, updates);
      set((state) => ({
        loans: state.loans.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        loading: false,
      }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  deleteLoan: async (id) => {
    set({ loading: true, error: null });
    try {
      await loanService.delete(id);
      set((state) => ({ loans: state.loans.filter((l) => l.id !== id), loading: false }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
}));
