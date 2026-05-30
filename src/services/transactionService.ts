import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, query, where, orderBy, deleteDoc, updateDoc } from "firebase/firestore";
import { Transaction, TransactionType } from "@/types";
import { walletService } from "./walletService";

const COLLECTION_NAME = "transactions";

export const transactionService = {
  async createTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const newTransaction: Transaction = {
      ...transactionData,
      id: docRef.id,
      createdAt: new Date().toISOString(),
    };
    
    await setDoc(docRef, newTransaction);

    // Update wallet balance
    const amountChange = transactionData.type === 'income' ? transactionData.amount : -transactionData.amount;
    await walletService.updateWalletBalance(transactionData.walletId, amountChange);

    return newTransaction;
  },

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    const transactions: Transaction[] = [];
    
    querySnapshot.forEach((doc) => {
      transactions.push(doc.data() as Transaction);
    });
    
    // Sort client-side if compound indexes aren't created yet in Firebase
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async updateTransaction(id: string, updates: Partial<Transaction>, oldTransaction: Transaction): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updates);

    // If amount or type changed, we need to adjust the wallet balance
    if (updates.amount !== undefined || updates.type !== undefined || updates.walletId !== undefined) {
      // Revert old transaction effect
      const oldAmountChange = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
      await walletService.updateWalletBalance(oldTransaction.walletId, oldAmountChange);

      // Apply new transaction effect
      const newType = updates.type || oldTransaction.type;
      const newAmount = updates.amount !== undefined ? updates.amount : oldTransaction.amount;
      const newWalletId = updates.walletId || oldTransaction.walletId;
      
      const newAmountChange = newType === 'income' ? newAmount : -newAmount;
      await walletService.updateWalletBalance(newWalletId, newAmountChange);
    }
  },

  async deleteTransaction(transaction: Transaction): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, transaction.id);
    await deleteDoc(docRef);

    // Revert wallet balance
    const amountChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
    await walletService.updateWalletBalance(transaction.walletId, amountChange);
  }
};
