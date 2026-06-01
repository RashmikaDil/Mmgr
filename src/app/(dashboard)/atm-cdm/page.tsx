"use client";

import { useState, useEffect } from "react";
import {
  Banknote,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { transferMoney } from "@/services/transferService";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ─────────────────────────────────────────────────────────────────────

type AccountKind = "wallet" | "savingsAccount";

interface AccountOption {
  id: string;
  name: string;
  balance: number;
  /** Wallet sub-type (Cash, Bank Account, etc.) or "Savings Account" for SA */
  subtype: string;
  /** Which Firestore collection this account lives in */
  kind: AccountKind;
}

type Mode = "atm" | "cdm";

// ─── Helper ─────────────────────────────────────────────────────────────────────

function groupLabel(a: AccountOption) {
  return a.kind === "savingsAccount"
    ? `Savings Account (${a.name})`
    : `${a.subtype} (${a.name})`;
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function AtmCdmPage() {
  const { user } = useAuth();

  const [allAccounts, setAllAccounts] = useState<AccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [mode, setMode] = useState<Mode>("atm");
  const [cashId, setCashId] = useState("");
  const [bankId, setBankId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Derived lists
  const cashAccounts = allAccounts.filter((a) => a.kind === "wallet" && a.subtype === "Cash");
  const EXCLUDED_WALLET_SUBTYPES = new Set(["Cash", "Savings Account", "Fixed Deposit"]);
  const bankAccounts = allAccounts.filter(
    (a) => !(a.kind === "wallet" && EXCLUDED_WALLET_SUBTYPES.has(a.subtype))
  );

  // ── Load all accounts ────────────────────────────────────────────────────────
  const loadAccounts = async (uid: string) => {
    setLoadingAccounts(true);
    try {
      // 1. Regular wallets
      const walletSnap = await getDocs(
        query(collection(db, "wallets"), where("userId", "==", uid))
      );
      const wallets: AccountOption[] = walletSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name as string,
          balance: data.balance as number,
          subtype: data.type as string,
          kind: "wallet",
        };
      });

      // 2. Savings accounts (separate collection)
      const saSnap = await getDocs(
        query(collection(db, "savingsAccounts"), where("userId", "==", uid))
      );
      const savingsAccounts: AccountOption[] = saSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name as string,
          balance: data.balance as number,
          subtype: "Savings Account",
          kind: "savingsAccount",
        };
      });

      setAllAccounts([...wallets, ...savingsAccounts]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    if (user?.uid) loadAccounts(user.uid);
  }, [user]);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setStatus({ type: "error", text: "Please enter a valid positive amount." });
      return;
    }
    if (!cashId || !bankId) {
      setStatus({ type: "error", text: "Please select both accounts." });
      return;
    }
    if (cashId === bankId) {
      setStatus({ type: "error", text: "Source and destination must be different." });
      return;
    }

    const cashAccount = allAccounts.find((a) => a.id === cashId)!;
    const bankAccount = allAccounts.find((a) => a.id === bankId)!;

    setIsSubmitting(true);
    try {
      if (mode === "atm") {
        // ATM: bank → cash
        await transferMoney(
          { type: bankAccount.kind, id: bankId },
          { type: cashAccount.kind, id: cashId },
          amt
        );
        setStatus({ type: "success", text: `ATM withdrawal of ₹${amt.toLocaleString()} successful!` });
      } else {
        // CDM: cash → bank
        await transferMoney(
          { type: cashAccount.kind, id: cashId },
          { type: bankAccount.kind, id: bankId },
          amt
        );
        setStatus({ type: "success", text: `CDM deposit of ₹${amt.toLocaleString()} successful!` });
      }
      setAmount("");
      setNotes("");
      // Refresh balances
      if (user?.uid) await loadAccounts(user.uid);
    } catch (err) {
      setStatus({ type: "error", text: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCash = allAccounts.find((a) => a.id === cashId);
  const selectedBank = allAccounts.find((a) => a.id === bankId);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          ATM / CDM
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Withdraw cash from your bank (ATM) or deposit cash into your bank (CDM).
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-3">
        <button
          type="button"
          id="atm-mode-btn"
          onClick={() => { setMode("atm"); setStatus(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl border-2 font-semibold text-sm transition-all ${
            mode === "atm"
              ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300"
              : "border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-zinc-600"
          }`}
        >
          <ArrowDownToLine className="w-5 h-5" />
          ATM Withdrawal
        </button>
        <button
          type="button"
          id="cdm-mode-btn"
          onClick={() => { setMode("cdm"); setStatus(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl border-2 font-semibold text-sm transition-all ${
            mode === "cdm"
              ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-500 dark:text-emerald-300"
              : "border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-zinc-600"
          }`}
        >
          <ArrowUpFromLine className="w-5 h-5" />
          CDM Deposit
        </button>
      </div>

      {/* Info banner */}
      <div
        className={`flex items-start gap-3 p-4 rounded-lg text-sm ${
          mode === "atm"
            ? "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
            : "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
        }`}
      >
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        {mode === "atm"
          ? "ATM: Moves money from your bank or savings account into your cash wallet."
          : "CDM: Moves money from your cash wallet into your bank or savings account."}
      </div>

      {/* Form card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5" />
            {mode === "atm" ? "Withdraw Cash" : "Deposit Cash"}
          </CardTitle>
          <CardDescription>
            {mode === "atm"
              ? "Select a bank / savings account to withdraw from and a cash wallet to receive the funds."
              : "Select a cash wallet to draw from and a bank / savings account to deposit into."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAccounts ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading accounts…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Flow visual */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm">
                <div
                  className={`flex-1 text-center p-3 rounded-lg font-medium ${
                    mode === "atm"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  }`}
                >
                  {mode === "atm" ? "🏦 Bank / Savings" : "💵 Cash Wallet"}
                  {mode === "atm" && selectedBank && (
                    <div className="text-xs mt-1 opacity-70">
                      ₹{selectedBank.balance.toLocaleString()}
                    </div>
                  )}
                  {mode === "cdm" && selectedCash && (
                    <div className="text-xs mt-1 opacity-70">
                      ₹{selectedCash.balance.toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="text-gray-400 font-bold text-lg">→</div>
                <div
                  className={`flex-1 text-center p-3 rounded-lg font-medium ${
                    mode === "atm"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                  }`}
                >
                  {mode === "atm" ? "💵 Cash Wallet" : "🏦 Bank / Savings"}
                  {mode === "atm" && selectedCash && (
                    <div className="text-xs mt-1 opacity-70">
                      ₹{selectedCash.balance.toLocaleString()}
                    </div>
                  )}
                  {mode === "cdm" && selectedBank && (
                    <div className="text-xs mt-1 opacity-70">
                      ₹{selectedBank.balance.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Bank / Savings Account selector */}
              <div className="space-y-2">
                <Label htmlFor="bank-account-select">
                  {mode === "atm"
                    ? "Bank / Savings Account (Source)"
                    : "Bank / Savings Account (Destination)"}
                </Label>
                <Select value={bankId} onValueChange={(v) => setBankId(v || "")}>
                  <SelectTrigger id="bank-account-select">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-400">
                        No bank or savings accounts found
                      </div>
                    ) : (
                      bankAccounts.map((a) => (
                        <SelectItem key={`${a.kind}-${a.id}`} value={a.id}>
                          {a.name} — ₹{a.balance.toLocaleString()} ({a.subtype})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Cash wallet selector */}
              <div className="space-y-2">
                <Label htmlFor="cash-wallet-select">
                  {mode === "atm" ? "Cash Wallet (Destination)" : "Cash Wallet (Source)"}
                </Label>
                <Select value={cashId} onValueChange={(v) => setCashId(v || "")}>
                  <SelectTrigger id="cash-wallet-select">
                    <SelectValue placeholder="Select cash wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {cashAccounts.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-400">
                        No cash wallets found — create a wallet of type &quot;Cash&quot; first.
                      </div>
                    ) : (
                      cashAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} — ₹{a.balance.toLocaleString()}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="atm-cdm-amount">Amount (₹)</Label>
                <Input
                  id="atm-cdm-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="atm-cdm-notes">Notes (Optional)</Label>
                <Input
                  id="atm-cdm-notes"
                  type="text"
                  placeholder="e.g. Grocery cash, salary withdrawal…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Status */}
              {status && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
                    status.type === "success"
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  }`}
                >
                  {status.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  {status.text}
                </div>
              )}

              <Button
                id="atm-cdm-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className={`w-full ${
                  mode === "atm"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing…
                  </>
                ) : mode === "atm" ? (
                  <>
                    <ArrowDownToLine className="w-4 h-4 mr-2" />
                    Withdraw Cash
                  </>
                ) : (
                  <>
                    <ArrowUpFromLine className="w-4 h-4 mr-2" />
                    Deposit Cash
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
