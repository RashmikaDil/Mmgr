import { create } from 'zustand';
import { SavingsGoal } from '@/types';
import { savingsService } from '@/services/savingsService';

interface SavingsState {
  goals: SavingsGoal[];
  loading: boolean;
  error: string | null;
  fetchGoals: (userId: string) => Promise<void>;
  addGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => Promise<void>;
  editGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
}

export const useSavingsStore = create<SavingsState>((set) => ({
  goals: [],
  loading: false,
  error: null,
  
  fetchGoals: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const goals = await savingsService.getSavingsGoalsByUser(userId);
      set({ goals, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  addGoal: async (goalData) => {
    set({ loading: true, error: null });
    try {
      const newGoal = await savingsService.createSavingsGoal(goalData);
      set((state) => ({ 
        goals: [...state.goals, newGoal].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()),
        loading: false 
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  editGoal: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await savingsService.updateSavingsGoal(id, updates);
      set((state) => ({
        goals: state.goals.map((g) => g.id === id ? { ...g, ...updates } : g).sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  removeGoal: async (id) => {
    set({ loading: true, error: null });
    try {
      await savingsService.deleteSavingsGoal(id);
      set((state) => ({
        goals: state.goals.filter((g) => g.id !== id),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  }
}));
