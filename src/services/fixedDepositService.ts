import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import { FixedDeposit } from "@/types";

const COLLECTION_NAME = "fixedDeposits";

export const fixedDepositService = {
  async createFixedDeposit(data: Omit<FixedDeposit, 'id' | 'createdAt'>): Promise<FixedDeposit> {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const newDeposit: FixedDeposit = {
      ...data,
      id: docRef.id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, newDeposit);
    return newDeposit;
  },

  async getDepositsByUser(userId: string, familyId?: string): Promise<FixedDeposit[]> {
    const q = familyId
      ? query(collection(db, COLLECTION_NAME), where('familyId', '==', familyId))
      : query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const snap = await getDocs(q);
    const deposits: FixedDeposit[] = [];
    snap.forEach((d) => deposits.push(d.data() as FixedDeposit));
    return deposits;
  },

  async updateFixedDeposit(id: string, updates: Partial<FixedDeposit>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updates);
  },

  async deleteFixedDeposit(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};
