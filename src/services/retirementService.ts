import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { RetirementAccount } from '@/types';

export const retirementService = {
  async create(account: Omit<RetirementAccount, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'retirementAccounts'), {
      ...account,
      createdAt: new Date().toISOString(),
    });
    return { id: docRef.id, ...account, createdAt: new Date().toISOString() } as RetirementAccount;
  },
  async getAll(userId: string) {
    const q = query(collection(db, 'retirementAccounts'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RetirementAccount));
  },
  async get(id: string) {
    const docSnap = await getDoc(doc(db, 'retirementAccounts', id));
    if (!docSnap.exists()) throw new Error('Retirement account not found');
    return { id: docSnap.id, ...docSnap.data() } as RetirementAccount;
  },
  async update(id: string, data: Partial<Omit<RetirementAccount, 'id' | 'userId'>> ) {
    const docRef = doc(db, 'retirementAccounts', id);
    await updateDoc(docRef, data);
    const updated = await getDoc(docRef);
    return { id: updated.id, ...updated.data() } as RetirementAccount;
  },
  async delete(id: string) {
    await deleteDoc(doc(db, 'retirementAccounts', id));
    return true;
  },
};
