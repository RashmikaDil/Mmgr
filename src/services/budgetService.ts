import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import { Budget } from "@/types";

const COLLECTION_NAME = "budgets";

export const budgetService = {
  async createBudget(budgetData: Omit<Budget, 'id' | 'createdAt'>): Promise<Budget> {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const newBudget: Budget = {
      ...budgetData,
      id: docRef.id,
      createdAt: new Date().toISOString(),
    };
    
    await setDoc(docRef, newBudget);
    return newBudget;
  },

  async getBudgetsByUser(userId: string): Promise<Budget[]> {
    const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const budgets: Budget[] = [];
    querySnapshot.forEach((doc) => {
      budgets.push(doc.data() as Budget);
    });
    
    return budgets;
  },

  async updateBudget(id: string, updates: Partial<Budget>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updates);
  },

  async deleteBudget(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};
