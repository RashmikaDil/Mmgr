import { collection, addDoc, doc, getDocs, query, where, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SavingsGoal } from '@/types';

export const savingsGoalService = {
  async create(goal: Omit<SavingsGoal, 'id' | 'createdAt'>): Promise<SavingsGoal> {
    const docRef = await addDoc(collection(db, 'savingsGoals'), {
      ...goal,
      createdAt: Timestamp.now().toDate().toISOString(),
    });
    return { id: docRef.id, ...goal, createdAt: new Date().toISOString() } as SavingsGoal;
  },

  async getAll(userId: string, familyId?: string): Promise<SavingsGoal[]> {
    const q = query(collection(db, 'savingsGoals'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const goals: SavingsGoal[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as SavingsGoal;
      if (!familyId || data.familyId === familyId) {
        goals.push({ id: docSnap.id, ...data });
      }
    });
    return goals;
  },

  async update(id: string, updates: Partial<SavingsGoal>) {
    const docRef = doc(db, 'savingsGoals', id);
    await updateDoc(docRef, updates);
  },

  async delete(id: string) {
    const docRef = doc(db, 'savingsGoals', id);
    await deleteDoc(docRef);
  },

  async get(id: string): Promise<SavingsGoal> {
    const docRef = doc(db, 'savingsGoals', id);
    const snap = await getDocs(docRef);
    if (!snap.exists()) throw new Error('SavingsGoal not found');
    return { id: snap.id, ...snap.data() } as SavingsGoal;
  },
};
