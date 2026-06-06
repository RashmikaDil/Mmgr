import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import { PropertyAsset } from "@/types";

const COLLECTION_NAME = "properties";

export const propertyService = {
  async createProperty(propertyData: Omit<PropertyAsset, 'id' | 'createdAt'>): Promise<PropertyAsset> {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const newProperty: PropertyAsset = {
      ...propertyData,
      id: docRef.id,
      createdAt: new Date().toISOString(),
    };
    
    await setDoc(docRef, newProperty);
    return newProperty;
  },

  async getPropertiesByUser(userId: string): Promise<PropertyAsset[]> {
    const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const properties: PropertyAsset[] = [];
    querySnapshot.forEach((doc) => {
      properties.push(doc.data() as PropertyAsset);
    });
    
    return properties.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async updateProperty(id: string, updates: Partial<PropertyAsset>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updates);
  },

  async deleteProperty(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};
