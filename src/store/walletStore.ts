import { create } from 'zustand';
import { Wallet, WalletType } from '@/types';
import { walletService } from '@/services/walletService';
import { savingsAccountService } from '@/services/savingsAccountService';
import { fixedDepositService } from '@/services/fixedDepositService';

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
      const [rawWallets, savingsAccounts, fixedDeposits] = await Promise.all([
        walletService.getWalletsByUser(userId),
        savingsAccountService.getAll(userId),
        fixedDepositService.getDepositsByUser(userId)
      ]);

      const saWallets = savingsAccounts.map((sa) => ({
        id: `sa_${sa.id}`,
        userId: sa.userId,
        familyId: sa.familyId,
        name: sa.name + (sa.bankName ? ` (${sa.bankName})` : ''),
        type: 'Savings Account' as WalletType,
        balance: sa.balance,
        currency: 'USD',
        createdAt: sa.createdAt || new Date().toISOString()
      }));

      const fdWallets = fixedDeposits.map((fd) => ({
        id: `fd_${fd.id}`,
        userId: fd.userId,
        familyId: fd.familyId,
        name: fd.name + (fd.bankName ? ` (${fd.bankName})` : ''),
        type: 'Fixed Deposit' as WalletType,
        balance: fd.principal,
        currency: 'USD',
        createdAt: fd.createdAt || new Date().toISOString()
      }));

      const allWallets = [...rawWallets, ...saWallets, ...fdWallets].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      set({ wallets: allWallets, loading: false });
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
      if (id.startsWith('sa_')) {
        const rawId = id.substring(3);
        await savingsAccountService.update(rawId, updates);
      } else if (id.startsWith('fd_')) {
        const rawId = id.substring(3);
        const fdUpdates: any = { ...updates };
        if (updates.balance !== undefined) {
          fdUpdates.principal = updates.balance;
          delete fdUpdates.balance;
        }
        await fixedDepositService.updateFixedDeposit(rawId, fdUpdates);
      } else {
        await walletService.updateWallet(id, updates);
      }
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
      if (id.startsWith('sa_')) {
        const rawId = id.substring(3);
        await savingsAccountService.delete(rawId);
      } else if (id.startsWith('fd_')) {
        const rawId = id.substring(3);
        await fixedDepositService.deleteFixedDeposit(rawId);
      } else {
        await walletService.deleteWallet(id);
      }
      set((state) => ({
        wallets: state.wallets.filter((w) => w.id !== id),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  }
}));
