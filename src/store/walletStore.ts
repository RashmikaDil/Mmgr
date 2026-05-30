import { create } from 'zustand';
import { Wallet } from '@/types';
import { walletService } from '@/services/walletService';

interface WalletState {
  wallets: Wallet[];
  loading: boolean;
  error: string | null;
  fetchWallets: (userId: string) => Promise<void>;
  addWallet: (wallet: Omit<Wallet, 'id' | 'createdAt'>) => Promise<void>;
  editWallet: (id: string, updates: Partial<Wallet>) => Promise<void>;
  removeWallet: (id: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  loading: false,
  error: null,
  
  fetchWallets: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const wallets = await walletService.getWalletsByUser(userId);
      set({ wallets, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  addWallet: async (walletData) => {
    set({ loading: true, error: null });
    try {
      const newWallet = await walletService.createWallet(walletData);
      set((state) => ({ 
        wallets: [newWallet, ...state.wallets],
        loading: false 
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  editWallet: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await walletService.updateWallet(id, updates);
      set((state) => ({
        wallets: state.wallets.map((w) => w.id === id ? { ...w, ...updates } : w),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  removeWallet: async (id) => {
    set({ loading: true, error: null });
    try {
      await walletService.deleteWallet(id);
      set((state) => ({
        wallets: state.wallets.filter((w) => w.id !== id),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  }
}));
