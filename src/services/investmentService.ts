import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Investment } from '@/types';

type CreatePayload = Omit<Investment, 'id' | 'createdAt'>;

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export const investmentService = {
  async create(investment: CreatePayload): Promise<Investment> {
    const payload = {
      ...stripUndefined(investment),
      createdAt: new Date().toISOString(),
    };

    console.log('[investmentService] Creating doc with payload:', payload);

    const docRef = await addDoc(collection(db, 'investments'), payload);

    console.log('[investmentService] Created doc ID:', docRef.id);

    return {
      id: docRef.id,
      ...payload,
    } as Investment;
  },

  async getAll(userId: string, familyId?: string): Promise<Investment[]> {
    console.log('[investmentService] Fetching investments for userId:', userId);
    const q = query(collection(db, 'investments'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const list: Investment[] = [];
    snap.forEach((d) => {
      const data = d.data() as Investment;
      if (!familyId || data.familyId === familyId) {
        list.push({ ...data, id: d.id });
      }
    });
    console.log('[investmentService] Fetched', list.length, 'investments');
    return list;
  },

  async update(id: string, updates: Partial<Investment>): Promise<void> {
    const docRef = doc(db, 'investments', id);
    const clean = stripUndefined(updates);
    console.log('[investmentService] Updating', id, 'with:', clean);
    await updateDoc(docRef, clean as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    console.log('[investmentService] Deleting', id);
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
