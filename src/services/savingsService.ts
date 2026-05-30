import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import { SavingsGoal } from "@/types";

const COLLECTION_NAME = "savingsGoals";

export const savingsService = {
  async createSavingsGoal(goalData: Omit<SavingsGoal, 'id' | 'createdAt'>): Promise<SavingsGoal> {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const newGoal: SavingsGoal = {
      ...goalData,
      id: docRef.id,
      createdAt: new Date().toISOString(),
    };
    
    await setDoc(docRef, newGoal);
    return newGoal;
  },

  async getSavingsGoalsByUser(userId: string): Promise<SavingsGoal[]> {
    const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const goals: SavingsGoal[] = [];
    querySnapshot.forEach((doc) => {
      goals.push(doc.data() as SavingsGoal);
    });
    
    return goals.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  },

  async updateSavingsGoal(id: string, updates: Partial<SavingsGoal>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updates);
  },

  async deleteSavingsGoal(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};
