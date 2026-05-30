import { collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TaxRecord } from "@/types";

const COLL = "taxRecords";

export async function fetchTaxRecords(userId: string): Promise<TaxRecord[]> {
  const q = query(collection(db, COLL), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TaxRecord));
}

export async function addTaxRecord(data: Omit<TaxRecord, "id" | "createdAt">): Promise<TaxRecord> {
  const ref = await addDoc(collection(db, COLL), {
    ...data,
    createdAt: Timestamp.now().toDate().toISOString(),
  });
  return { id: ref.id, ...data, createdAt: new Date().toISOString() } as TaxRecord;
}

export async function updateTaxRecord(id: string, data: Partial<TaxRecord>) {
  await updateDoc(doc(db, COLL, id), data);
}

export async function deleteTaxRecord(id: string) {
  await deleteDoc(doc(db, COLL, id));
}
