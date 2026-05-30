import { collection, addDoc, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Loan } from '@/types';

export const loanService = {
  async create(loan: Omit<Loan, 'id' | 'createdAt'>): Promise<Loan> {
    const docRef = await addDoc(collection(db, 'loans'), {
      ...loan,
      createdAt: Timestamp.now().toDate().toISOString(),
    });
    return { id: docRef.id, ...loan, createdAt: new Date().toISOString() } as Loan;
  },

  async getAll(userId: string, familyId?: string): Promise<Loan[]> {
    const baseQuery = query(collection(db, 'loans'), where('userId', '==', userId));
    const snapshot = await getDocs(baseQuery);
    const loans: Loan[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Loan;
      if (!familyId || data.familyId === familyId) {
        loans.push({ ...data, id: docSnap.id });
      }
    });
    return loans;
  },

  async update(id: string, updates: Partial<Loan>) {
    const docRef = doc(db, 'loans', id);
    await updateDoc(docRef, updates);
  },

  async delete(id: string) {
    const docRef = doc(db, 'loans', id);
    await deleteDoc(docRef);
  },

  async get(id: string): Promise<Loan> {
    const docRef = doc(db, 'loans', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Loan not found');
    return { id: snap.id, ...snap.data() } as Loan;
  }
};
