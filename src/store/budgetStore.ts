import { create } from 'zustand';
import { Budget } from '@/types';
import { budgetService } from '@/services/budgetService';

interface BudgetState {
  budgets: Budget[];
  loading: boolean;
  error: string | null;
  fetchBudgets: (userId: string) => Promise<void>;
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => Promise<void>;
  editBudget: (id: string, updates: Partial<Budget>) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  budgets: [],
  loading: false,
  error: null,
  
  fetchBudgets: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const budgets = await budgetService.getBudgetsByUser(userId);
      set({ budgets, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  addBudget: async (budgetData) => {
    set({ loading: true, error: null });
    try {
      const newBudget = await budgetService.createBudget(budgetData);
      set((state) => ({ 
        budgets: [...state.budgets, newBudget],
        loading: false 
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  editBudget: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await budgetService.updateBudget(id, updates);
      set((state) => ({
        budgets: state.budgets.map((b) => b.id === id ? { ...b, ...updates } : b),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  removeBudget: async (id) => {
    set({ loading: true, error: null });
    try {
      await budgetService.deleteBudget(id);
      set((state) => ({
        budgets: state.budgets.filter((b) => b.id !== id),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  }
}));
