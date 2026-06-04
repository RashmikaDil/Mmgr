import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, query, where, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { Wallet } from "@/types";

const COLLECTION_NAME = "wallets";

export const walletService = {
  async createWallet(walletData: Omit<Wallet, 'id' | 'createdAt'>): Promise<Wallet> {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const newWallet: Wallet = {
      ...walletData,
      id: docRef.id,
      createdAt: new Date().toISOString(),
    };
    
    await setDoc(docRef, newWallet);
    return newWallet;
  },

  async getWalletsByUser(userId: string): Promise<Wallet[]> {
    const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const wallets: Wallet[] = [];
    querySnapshot.forEach((doc) => {
      wallets.push(doc.data() as Wallet);
    });
    
    return wallets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async updateWallet(id: string, updates: Partial<Wallet>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updates);
  },

  async deleteWallet(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  async updateWalletBalance(id: string, amountChange: number): Promise<void> {
    if (id.startsWith("sa_")) {
      const rawId = id.substring(3);
      const docRef = doc(db, "savingsAccounts", rawId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentBalance = docSnap.data().balance || 0;
        await updateDoc(docRef, {
          balance: currentBalance + amountChange
        });
      }
    } else if (id.startsWith("fd_")) {
      const rawId = id.substring(3);
      const docRef = doc(db, "fixedDeposits", rawId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentPrincipal = docSnap.data().principal || 0;
        await updateDoc(docRef, {
          principal: currentPrincipal + amountChange
        });
      }
    } else {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentBalance = docSnap.data().balance;
        await updateDoc(docRef, {
          balance: currentBalance + amountChange
        });
      }
    }
  }
};
