import { collection, addDoc, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Investment } from '@/types';

export const investmentService = {
  async create(investment: Omit<Investment, 'id' | 'createdAt'>): Promise<Investment> {
    const docRef = await addDoc(collection(db, 'investments'), {
      ...investment,
      createdAt: Timestamp.now().toDate().toISOString(),
    });
    return { id: docRef.id, ...investment, createdAt: new Date().toISOString() } as Investment;
  },

  async getAll(userId: string, familyId?: string): Promise<Investment[]> {
    const base = query(collection(db, 'investments'), where('userId', '==', userId));
    const snap = await getDocs(base);
    const list: Investment[] = [];
    snap.forEach(d => {
      const data = d.data() as Investment;
      if (!familyId || data.familyId === familyId) {
        list.push({ id: d.id, ...data });
      }
    });
    return list;
  },

  async update(id: string, updates: Partial<Investment>) {
    const docRef = doc(db, 'investments', id);
    await updateDoc(docRef, updates);
  },

  async delete(id: string) {
    const docRef = doc(db, 'investments', id);
    await deleteDoc(docRef);
  },

  async get(id: string): Promise<Investment> {
    const docRef = doc(db, 'investments', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Investment not found');
    return { id: snap.id, ...snap.data() } as Investment;
  },
};
