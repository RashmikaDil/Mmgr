import { create } from 'zustand';
import { Transaction } from '@/types';
import { transactionService } from '@/services/transactionService';
import { useWalletStore } from './walletStore';

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  fetchTransactions: (userId: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  editTransaction: (id: string, updates: Partial<Transaction>, oldTransaction: Transaction) => Promise<void>;
  removeTransaction: (transaction: Transaction) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  loading: false,
  error: null,
  
  fetchTransactions: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const transactions = await transactionService.getTransactionsByUser(userId);
      set({ transactions, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  addTransaction: async (transactionData) => {
    set({ loading: true, error: null });
    try {
      const newTransaction = await transactionService.createTransaction(transactionData);
      set((state) => ({ 
        transactions: [newTransaction, ...state.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        loading: false 
      }));
      // We must refetch wallets to get updated balances
      useWalletStore.getState().fetchWallets(transactionData.userId);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  editTransaction: async (id, updates, oldTransaction) => {
    set({ loading: true, error: null });
    try {
      await transactionService.updateTransaction(id, updates, oldTransaction);
      set((state) => ({
        transactions: state.transactions.map((t) => t.id === id ? { ...t, ...updates } : t).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        loading: false
      }));
      // We must refetch wallets to get updated balances
      useWalletStore.getState().fetchWallets(oldTransaction.userId);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  removeTransaction: async (transaction) => {
    set({ loading: true, error: null });
    try {
      await transactionService.deleteTransaction(transaction);
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== transaction.id),
        loading: false
      }));
      // We must refetch wallets to get updated balances
      useWalletStore.getState().fetchWallets(transaction.userId);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  }
}));
