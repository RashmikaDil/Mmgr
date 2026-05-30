"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Title } from "@/components/ui/title";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Wallet { id: string; name: string; balance: number; }
interface FixedDeposit { id: string; name: string; principal: number; }
interface SavingsAccount { id: string; name: string; balance: number; }
interface Investment { id: string; name: string; amountInvested: number; }

export default function TransferPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [fixedDeposits, setFixedDeposits] = useState<FixedDeposit[]>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);

  const [sourceWalletId, setSourceWalletId] = useState<string>("");
  const [destType, setDestType] = useState<string>("wallet");
  const [destId, setDestId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  // Load data for the authenticated user
  useEffect(() => {
    if (!user?.uid) return;

    const walletQ = query(collection(db, "wallets"), where("userId", "==", user.uid));
    getDocs(walletQ).then((snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Wallet));
      setWallets(data);
    });

    const fdQ = query(collection(db, "fixedDeposits"), where("userId", "==", user.uid));
    getDocs(fdQ).then((snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FixedDeposit));
      setFixedDeposits(data);
    });

    const saQ = query(collection(db, "savingsAccounts"), where("userId", "==", user.uid));
    getDocs(saQ).then((snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SavingsAccount));
      setSavingsAccounts(data);
    });

    const invQ = query(collection(db, "investments"), where("userId", "==", user.uid));
    getDocs(invQ).then((snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Investment));
      setInvestments(data);
    });
  }, [user]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceWalletId || !destId || !amount) return;
    const amt = Number(amount);
    try {
      await transferMoney(
        { type: "wallet", id: sourceWalletId },
        { type: destType as any, id: destId },
        amt
      );
      alert("Transfer successful");
    } catch (err) {
      console.error(err);
      alert(`Transfer failed: ${(err as Error).message}`);
    }
    router.refresh();
  };

  const destinationOptions = () => {
    switch (destType) {
      case "fixedDeposit":
        return fixedDeposits.map((fd) => (
          <SelectItem key={fd.id} value={fd.id}>
            {fd.name} (₹{fd.principal})
          </SelectItem>
        ));
      case "savingsAccount":
        return savingsAccounts.map((sa) => (
          <SelectItem key={sa.id} value={sa.id}>
            {sa.name} (₹{sa.balance})
          </SelectItem>
        ));
      case "investment":
        return investments.map((inv) => (
          <SelectItem key={inv.id} value={inv.id}>
            {inv.name} (₹{inv.amountInvested})
          </SelectItem>
        ));
      default:
        return wallets.map((w) => (
          <SelectItem key={w.id} value={w.id}>
            {w.name} (₹{w.balance})
          </SelectItem>
        ));
    }
  };

  return (
    <main className="p-6 space-y-6">
      <Title>Transfer Income</Title>
      <Card>
        <CardHeader>
          <CardTitle>Allocate Income</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTransfer} className="grid gap-4">
            <Select value={sourceWalletId} onValueChange={setSourceWalletId} required>
              <SelectItem disabled value="">
                Select Source Wallet
              </SelectItem>
              {wallets.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name} (₹{w.balance})
                </SelectItem>
              ))}
            </Select>

            <Select value={destType} onValueChange={setDestType} required>
              <SelectItem value="wallet">Wallet</SelectItem>
              <SelectItem value="fixedDeposit">Fixed Deposit</SelectItem>
              <SelectItem value="savingsAccount">Savings Account</SelectItem>
              <SelectItem value="investment">Investment</SelectItem>
            </Select>

            <Select value={destId} onValueChange={setDestId} required>
              <SelectItem disabled value="">
                Select Destination
              </SelectItem>
              {destinationOptions()}
            </Select>

            <Input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <Button type="submit" className="self-end">
              Transfer
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
