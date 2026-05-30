import { collection, addDoc, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SavingsAccount } from '@/types';

export const savingsAccountService = {
  async create(account: Omit<SavingsAccount, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'savingsAccounts'), {
      ...account,
      createdAt: Timestamp.now().toDate().toISOString(),
    });
    return { id: docRef.id, ...account, createdAt: new Date().toISOString() } as SavingsAccount;
  },

  async getAll(userId: string, familyId?: string) {
    const q = query(
      collection(db, 'savingsAccounts'),
      where('userId', '==', userId)
    );
    // If familyId present, also include it
    const snapshot = await getDocs(q);
    const accounts: SavingsAccount[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as SavingsAccount;
      if (!familyId || data.familyId === familyId) {
        accounts.push({ ...data, id: docSnap.id });
      }
    });
    return accounts;
  },

  async update(id: string, updates: Partial<SavingsAccount>) {
    const docRef = doc(db, 'savingsAccounts', id);
    await updateDoc(docRef, updates);
  },

  async delete(id: string) {
    const docRef = doc(db, 'savingsAccounts', id);
    await deleteDoc(docRef);
  },

  async get(id: string) {
    const docRef = doc(db, 'savingsAccounts', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('SavingsAccount not found');
    return { id: snap.id, ...snap.data() } as SavingsAccount;
  },
};
