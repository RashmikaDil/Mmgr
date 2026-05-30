import { create } from 'zustand';
import { SavingsGoal } from '@/types';
import { savingsGoalService } from '@/services/savingsGoalService';

interface SavingsGoalState {
  goals: SavingsGoal[];
  loading: boolean;
  error: string | null;
  fetchGoals: (userId: string, familyId?: string) => Promise<void>;
  addGoal: (data: Omit<SavingsGoal, 'id' | 'createdAt'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const useSavingsGoalStore = create<SavingsGoalState>((set) => ({
  goals: [],
  loading: false,
  error: null,
  fetchGoals: async (userId, familyId) => {
    set({ loading: true, error: null });
    try {
      const goals = await savingsGoalService.getAll(userId, familyId);
      set({ goals, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  addGoal: async (data) => {
    set({ loading: true, error: null });
    try {
      const newGoal = await savingsGoalService.create(data);
      set((state) => ({ goals: [...state.goals, newGoal], loading: false }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  updateGoal: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await savingsGoalService.update(id, updates);
      set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        loading: false,
      }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  deleteGoal: async (id) => {
    set({ loading: true, error: null });
    try {
      await savingsGoalService.delete(id);
      set((state) => ({ goals: state.goals.filter((g) => g.id !== id), loading: false }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
}));
