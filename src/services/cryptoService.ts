import {
  collection, addDoc, doc, getDocs,
  query, where, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CryptoHolding } from '@/types';

const COLLECTION = 'cryptoHoldings';

export const cryptoService = {
  async create(data: Omit<CryptoHolding, 'id' | 'createdAt'>): Promise<CryptoHolding> {
    const payload = { ...data, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, COLLECTION), payload);
    return { id: docRef.id, ...payload };
  },

  async getAll(userId: string): Promise<CryptoHolding[]> {
    const q = query(collection(db, COLLECTION), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CryptoHolding));
  },

  async update(id: string, updates: Partial<CryptoHolding>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), updates as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  },
};

export interface CoinPrice {
  usd: number;
  usd_24h_change: number;
}

/** Batch-fetch USD prices + 24h change from CoinGecko (free, no key). */
export async function fetchCryptoPricesUSD(
  coinIds: string[],
): Promise<Record<string, CoinPrice>> {
  if (!coinIds.length) return {};
  const ids = [...new Set(coinIds)].join(',');
  const url =
    `https://api.coingecko.com/api/v3/simple/price` +
    `?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko error ${res.status}`);
  return res.json();
}
