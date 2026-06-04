"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/context/CurrencyContext";
import { SavingsAccount, InterestTier, FixedDeposit } from "@/types";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle, Banknote, Pencil, Trash2, TrendingUp, Layers, X, Plus,
  Sparkles, BrainCircuit, ChevronRight, Loader2,
} from "lucide-react";
import { useWalletStore } from "@/store/walletStore";
import { useTransactionStore } from "@/store/transactionStore";
import {
  collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── helpers ────────────────────────────────────────────────────────────────────

function getEffectiveRate(balance: number, baseRate: number, tiers?: InterestTier[]): number {
  if (!tiers || tiers.length === 0) return baseRate;
  const applicable = [...tiers]
    .sort((a, b) => b.aboveAmount - a.aboveAmount)
    .find((t) => balance > t.aboveAmount);
  return applicable ? applicable.rate : baseRate;
}

function toAnnualRate(rate: number, freq: SavingsAccount["rateFrequency"]): number {
  if (freq === "monthly") return rate * 12;
  if (freq === "quarterly") return rate * 4;
  return rate ?? 0;
}

/** Calculate projected annual interest for a savings account */
function calcAnnualInterest(acct: SavingsAccount): number {
  if (!acct.interestRate) return 0;
  const eff = getEffectiveRate(acct.balance, acct.interestRate, acct.interestTiers);
  const ann = toAnnualRate(eff, acct.rateFrequency ?? "annual");
  return acct.balance * (ann / 100);
}

const FREQ_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

const EMPTY_FORM = {
  name: "",
  bankName: "",
  balance: "",
  minimumDeposit: "",
  interestRate: "",
  rateFrequency: "annual" as SavingsAccount["rateFrequency"],
};

// ── Firestore helpers (inline for simplicity) ──────────────────────────────────

const COLL = "savingsAccounts";

async function fetchAll(userId: string): Promise<SavingsAccount[]> {
  const q = query(collection(db, COLL), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavingsAccount));
}

async function createAcct(data: Omit<SavingsAccount, "id" | "createdAt">): Promise<SavingsAccount> {
  const ref = await addDoc(collection(db, COLL), {
    ...data,
    createdAt: Timestamp.now().toDate().toISOString(),
  });
  return { id: ref.id, ...data, createdAt: new Date().toISOString() };
}

async function updateAcct(id: string, data: Partial<SavingsAccount>) {
  await updateDoc(doc(db, COLL, id), data);
}

async function deleteAcct(id: string) {
  await deleteDoc(doc(db, COLL, id));
}

// ── main component ─────────────────────────────────────────────────────────────

export default function SavingsAccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [fixedDeposits, setFixedDeposits] = useState<FixedDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const { currency, formatPrice } = useCurrency();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsAccount | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tiers, setTiers] = useState<InterestTier[]>([]);
  const [saving, setSaving] = useState(false);

  // AI Optimizer State
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<any[]>([]);

  // Load other stores for AI insights
  const { wallets, fetchWallets } = useWalletStore();
  const { transactions, fetchTransactions } = useTransactionStore();

  useEffect(() => {
    if (user?.uid) {
      fetchWallets(user.uid);
      fetchTransactions(user.uid);
    }
  }, [user?.uid, fetchWallets, fetchTransactions]);

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [acctsData, fdsSnap] = await Promise.all([
        fetchAll(user.uid),
        getDocs(query(collection(db, "fixedDeposits"), where("userId", "==", user.uid)))
      ]);
      const fdsData = fdsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FixedDeposit));
      setAccounts(acctsData);
      setFixedDeposits(fdsData);
    } catch (e) {
      console.error("Error fetching savings page data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  // ── derived stats ─────────────────────────────────────────────────────────────

  const savingsBalance     = accounts.reduce((s, a) => s + a.balance, 0);
  const fdBalance          = fixedDeposits.reduce((s, fd) => s + fd.principal, 0);
  const totalBalance       = savingsBalance + fdBalance;
  const totalAnnualInterest = accounts.reduce((s, a) => s + calcAnnualInterest(a), 0);
  const avgRate = accounts.length > 0
    ? accounts.reduce((s, a) => s + (a.interestRate ?? 0), 0) / accounts.length
    : 0;

  // ── AI Savings Optimizer Heuristics ──────────────────────────────────────────
  const generateAIInsights = () => {
    setAiLoading(true);
    setShowAI(true);
    
    setTimeout(() => {
      const insights = [];
      
      // 1. Idle Checking Cash Optimization
      const idleCash = wallets
        .filter((w) => w.type !== "Fixed Deposit" && w.type !== "Savings Account")
        .reduce((s, w) => s + w.balance, 0);
      const highestAcct = [...accounts].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))[0];
      if (idleCash > 500 && highestAcct) {
        const rate = highestAcct.interestRate || 0;
        const potentialInterest = idleCash * (rate / 100);
        insights.push({
          type: "yield",
          title: "Maximize Idle Checking Cash",
          description: `You have ${formatPrice(idleCash)} sitting in wallets earning 0% interest. Moving this to your highest-yielding savings account (${highestAcct.name} at ${rate}%) could earn you an extra ${formatPrice(potentialInterest)} in annual interest!`,
          impact: `+${formatPrice(potentialInterest)}/yr`,
          color: "indigo"
        });
      }

      // 2. Emergency Fund analysis
      let avgExpenses = 0;
      if (transactions.length > 0) {
        const expenses = transactions.filter(t => t.type === 'expense');
        const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
        avgExpenses = totalExp > 0 ? (totalExp / 3) : 0;
      }
      
      if (avgExpenses > 0) {
        const recommendedBuffer = avgExpenses * 6;
        const shortfall = recommendedBuffer - totalBalance;
        const isFunded = shortfall <= 0;
        insights.push({
          type: "emergency",
          title: "6-Month Emergency Buffer Analysis",
          description: isFunded 
            ? `Fantastic work! Your total savings of ${formatPrice(totalBalance)} fully secures a 6-month emergency buffer (${formatPrice(recommendedBuffer)} based on average monthly expenses of ${formatPrice(avgExpenses)}).`
            : `Your estimated monthly expenses are ${formatPrice(avgExpenses)}. A recommended 6-month emergency buffer is ${formatPrice(recommendedBuffer)}. You currently have a shortfall of ${formatPrice(shortfall)}. Consider allocating checking surpluses here.`,
          impact: isFunded ? "Fully Secured" : `${formatPrice(shortfall)} Gap`,
          color: isFunded ? "emerald" : "amber"
        });
      } else {
        const recommendedBuffer = 5000;
        const shortfall = recommendedBuffer - totalBalance;
        const isFunded = shortfall <= 0;
        insights.push({
          type: "emergency",
          title: "Emergency Fund Buffer Planning",
          description: isFunded
            ? `Your total savings of ${formatPrice(totalBalance)} is above the standard $5,000 emergency buffer recommendation. Keep it up!`
            : `We recommend building an emergency fund of at least $5,000. You are currently ${formatPrice(shortfall)} away from this baseline goal.`,
          impact: isFunded ? "Healthy" : `${formatPrice(shortfall)} Gap`,
          color: isFunded ? "emerald" : "amber"
        });
      }

      // 3. Fixed Deposit yield optimizations
      const fdRate = fixedDeposits.length > 0 
        ? fixedDeposits.reduce((s, fd) => s + fd.interestRate, 0) / fixedDeposits.length
        : 6.5;
      
      if (fixedDeposits.length === 0 && savingsBalance > 1000) {
        const potentialFD = savingsBalance * 0.3;
        const fdYield = potentialFD * (fdRate / 100);
        insights.push({
          type: "fd",
          title: "FD Yield Optimizer",
          description: `You currently have no active Fixed Deposits. Since standard FDs are yielding around ${fdRate}%, locking in 30% of your savings (${formatPrice(potentialFD)}) into a Fixed Deposit could guarantee you a secure ${formatPrice(fdYield)} annual interest yield.`,
          impact: "Rate Lock",
          color: "purple"
        });
      } else if (fixedDeposits.length > 0 && highestAcct) {
        const highestSavingsRate = highestAcct.interestRate || 0;
        if (fdRate > highestSavingsRate && savingsBalance > 2000) {
          const surplusSavings = savingsBalance * 0.2;
          const extraYield = surplusSavings * ((fdRate - highestSavingsRate) / 100);
          insights.push({
            type: "fd",
            title: "Interest Yield Arbitrage",
            description: `Your active Fixed Deposits yield an average rate of ${fdRate.toFixed(2)}%, which is higher than your highest savings account rate of ${highestSavingsRate.toFixed(2)}%. Shifting a surplus of ${formatPrice(surplusSavings)} into a new Fixed Deposit would yield an extra ${formatPrice(extraYield)} per year.`,
            impact: `+${formatPrice(extraYield)}/yr`,
            color: "purple"
          });
        }
      }

      setAiInsights(insights);
      setAiLoading(false);
    }, 1500);
  };

  // ── handlers ─────────────────────────────────────────────────────────────────

  function openAdd() {
    setEditing(null); setForm(EMPTY_FORM); setTiers([]); setOpen(true);
  }

  function openEdit(a: SavingsAccount) {
    setEditing(a);
    setForm({
      name: a.name,
      bankName: a.bankName ?? "",
      balance: String(a.balance),
      minimumDeposit: a.minimumDeposit != null ? String(a.minimumDeposit) : "",
      interestRate: a.interestRate != null ? String(a.interestRate) : "",
      rateFrequency: a.rateFrequency ?? "annual",
    });
    setTiers(a.interestTiers ?? []);
    setOpen(true);
  }

  function addTier() { setTiers([...tiers, { aboveAmount: 0, rate: 0 }]); }
  function removeTier(i: number) { setTiers(tiers.filter((_, idx) => idx !== i)); }
  function updateTier(i: number, field: keyof InterestTier, val: string) {
    setTiers(tiers.map((t, idx) => idx === i ? { ...t, [field]: parseFloat(val) || 0 } : t));
  }

  async function handleSubmit() {
    if (!user?.uid) return;
    setSaving(true);
    const data: Omit<SavingsAccount, "id" | "createdAt"> = {
      userId: user.uid,
      name: form.name.trim(),
      bankName: form.bankName.trim() || undefined,
      balance: parseFloat(form.balance) || 0,
      minimumDeposit: form.minimumDeposit ? parseFloat(form.minimumDeposit) : undefined,
      interestRate: form.interestRate ? parseFloat(form.interestRate) : undefined,
      rateFrequency: form.rateFrequency,
      interestTiers: tiers.length > 0 ? tiers : undefined,
    };
    if (editing) {
      await updateAcct(editing.id, data);
      setAccounts((prev) => prev.map((a) => a.id === editing.id ? { ...a, ...data } : a));
    } else {
      const newAcct = await createAcct(data);
      setAccounts((prev) => [...prev, newAcct]);
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this savings account?")) return;
    await deleteAcct(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Savings Accounts</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track balances, tiered interest rates, and projected annual earnings.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 self-start sm:self-auto">
          <PlusCircle className="w-4 h-4" /> Add Account
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/20 border-cyan-200 dark:border-cyan-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Total Balance</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">{formatPrice(totalBalance)}</div>
            <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
              {formatPrice(savingsBalance)} savings + {formatPrice(fdBalance)} FDs
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Projected Annual Interest</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">{formatPrice(Math.round(totalAnnualInterest))}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">across all accounts</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 border-purple-200 dark:border-purple-800 col-span-2 lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Avg. Base Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{avgRate.toFixed(2)}%</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">average across accounts</p>
          </CardContent>
        </Card>
      </div>
      
      {/* AI Optimizer Panel */}
      <Card className="relative overflow-hidden border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 shadow-md">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 dark:bg-indigo-700/10 rounded-full blur-2xl -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-200/20 dark:bg-purple-700/10 rounded-full blur-2xl -ml-10 -mb-10" />
        
        <CardContent className="p-6 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-500 rounded-lg text-white shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  AI Savings & Yield Optimizer
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 animate-pulse">Smart Advisor</span>
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Analyze checking balances, FDs, and bank interest rates to maximize your passive yield.
                </p>
              </div>
            </div>
            
            {!showAI && (
              <Button onClick={generateAIInsights} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all gap-2 duration-300">
                <BrainCircuit className="w-4 h-4" />
                Analyze Savings
              </Button>
            )}
          </div>

          {showAI && (
            <div className="mt-6 border-t border-indigo-100 dark:border-indigo-900/50 pt-5 space-y-4">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
                    AI is auditing checking accounts, savings accounts, and fixed deposits...
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {aiInsights.map((insight, idx) => {
                    const colors: Record<string, { bg: string, border: string, text: string, iconBg: string }> = {
                      indigo: {
                        bg: "bg-indigo-50/50 dark:bg-indigo-950/10",
                        border: "border-indigo-100 dark:border-indigo-900/40",
                        text: "text-indigo-900 dark:text-indigo-100",
                        iconBg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                      },
                      emerald: {
                        bg: "bg-emerald-50/50 dark:bg-emerald-950/10",
                        border: "border-emerald-100 dark:border-emerald-900/40",
                        text: "text-emerald-900 dark:text-emerald-100",
                        iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-indigo-300"
                      },
                      amber: {
                        bg: "bg-amber-50/50 dark:bg-amber-950/10",
                        border: "border-amber-100 dark:border-amber-900/40",
                        text: "text-amber-900 dark:text-amber-100",
                        iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                      },
                      purple: {
                        bg: "bg-purple-50/50 dark:bg-purple-950/10",
                        border: "border-purple-100 dark:border-purple-900/40",
                        text: "text-purple-900 dark:text-purple-100",
                        iconBg: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                      }
                    };
                    const colorSet = colors[insight.color] || colors.indigo;
                    return (
                      <div key={idx} className={`p-4 rounded-xl border ${colorSet.bg} ${colorSet.border} flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-shadow`}>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${colorSet.iconBg}`}>
                              {insight.type === "yield" ? "Passive Yield" : insight.type === "emergency" ? "Security Buffer" : "FD lock"}
                            </span>
                            <span className="text-xs font-semibold text-gray-500">{insight.impact}</span>
                          </div>
                          <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{insight.title}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{insight.description}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline self-end">
                          Apply Optimization <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-48"><CardContent /></Card>)}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-gray-400">
            <Banknote className="w-12 h-12 opacity-30" />
            <p className="text-lg font-medium">No savings accounts yet</p>
            <p className="text-sm">Add a savings account to track balances and interest earnings.</p>
            <Button variant="outline" onClick={openAdd} className="mt-2 gap-2">
              <PlusCircle className="w-4 h-4" /> Add Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acct) => {
            const eff = acct.interestRate
              ? getEffectiveRate(acct.balance, acct.interestRate, acct.interestTiers)
              : null;
            const annualInterest = calcAnnualInterest(acct);
            const annualRate = eff && acct.rateFrequency
              ? toAnnualRate(eff, acct.rateFrequency)
              : null;

            return (
              <Card key={acct.id} className="relative overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center flex-shrink-0">
                      <Banknote className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base leading-tight">{acct.name}</CardTitle>
                      {acct.bankName && <CardDescription className="text-xs">{acct.bankName}</CardDescription>}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Balance */}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                      <p className="text-2xl font-bold">{formatPrice(acct.balance)}</p>
                    </div>
                    {annualInterest > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Est. Annual Interest</p>
                        <p className="font-semibold text-green-600">+{formatPrice(Math.round(annualInterest))}</p>
                      </div>
                    )}
                  </div>

                  {/* Rate badges */}
                  {acct.interestRate && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {annualRate?.toFixed(2)}% p.a. ({FREQ_LABELS[acct.rateFrequency ?? "annual"]})
                      </Badge>
                      {acct.interestTiers && acct.interestTiers.length > 0 && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Layers className="w-3 h-3" /> {acct.interestTiers.length} tier{acct.interestTiers.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Minimum deposit notice */}
                  {acct.minimumDeposit && acct.balance < acct.minimumDeposit && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-md px-3 py-2 text-xs">
                      ⚠️ Below minimum deposit ({formatPrice(acct.minimumDeposit)})
                    </div>
                  )}
                  {acct.minimumDeposit && acct.balance >= acct.minimumDeposit && (
                    <p className="text-xs text-gray-400">Min. balance: {formatPrice(acct.minimumDeposit)}</p>
                  )}

                  {/* Active tier highlight */}
                  {acct.interestTiers && acct.interestTiers.length > 0 && eff !== null && eff !== acct.interestRate && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-md px-3 py-2 text-xs text-green-700 dark:text-green-300">
                      🎉 Bonus tier active: {eff}% {FREQ_LABELS[acct.rateFrequency ?? "annual"].toLowerCase()}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-0 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => openEdit(acct)}>
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1 flex-1" onClick={() => handleDelete(acct.id)}>
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Savings Account" : "Add Savings Account"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update account details." : "Track a new savings account with interest and tier rules."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sa-name">Account Name *</Label>
                <Input id="sa-name" placeholder="e.g. HDFC Savings" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sa-bank">Bank Name</Label>
                <Input id="sa-bank" placeholder="e.g. HDFC, SBI" value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sa-balance">Current Balance ({currency}) *</Label>
                <Input id="sa-balance" type="number" min="0" placeholder="25000" value={form.balance}
                  onChange={(e) => setForm({ ...form, balance: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sa-min">Minimum Balance ({currency})</Label>
                <Input id="sa-min" type="number" min="0" placeholder="5000" value={form.minimumDeposit}
                  onChange={(e) => setForm({ ...form, minimumDeposit: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sa-rate">Base Interest Rate (%)</Label>
                <Input id="sa-rate" type="number" min="0" step="0.01" placeholder="3.5" value={form.interestRate}
                  onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Rate Frequency</Label>
                <Select value={form.rateFrequency ?? "annual"} onValueChange={(v) => setForm({ ...form, rateFrequency: v as SavingsAccount["rateFrequency"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tiered rates */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Bonus Tier Interest Rates</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTier} className="gap-1 text-xs h-7">
                  <Plus className="w-3 h-3" /> Add Tier
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Override rate when balance exceeds a threshold (e.g. above ₹10,000 → 1% monthly).
              </p>
              {tiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-md border bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Above Balance ({currency})</Label>
                    <Input type="number" min="0" placeholder="10000" value={tier.aboveAmount || ""}
                      onChange={(e) => updateTier(idx, "aboveAmount", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Rate (%)</Label>
                    <Input type="number" min="0" step="0.01" placeholder="1.0" value={tier.rate || ""}
                      onChange={(e) => updateTier(idx, "rate", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 mt-4 text-red-500 hover:bg-red-50"
                    onClick={() => removeTier(idx)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Live preview */}
            {form.balance && form.interestRate && (
              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-md px-4 py-3 space-y-1">
                <p className="text-xs font-medium text-cyan-700 dark:text-cyan-300">Interest Preview</p>
                {(() => {
                  const bal = parseFloat(form.balance) || 0;
                  const eff = getEffectiveRate(bal, parseFloat(form.interestRate) || 0, tiers.length > 0 ? tiers : undefined);
                  const ann = toAnnualRate(eff, form.rateFrequency ?? "annual");
                  const est = bal * (ann / 100);
                  const tierActive = tiers.length > 0 && eff !== (parseFloat(form.interestRate) || 0);
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Effective Rate {tierActive ? "(bonus tier)" : ""}
                        </span>
                        <span className="font-medium">{ann.toFixed(2)}% p.a.</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Est. Annual Interest</span>
                        <span className="font-semibold text-green-700 dark:text-green-300">+{formatPrice(Math.round(est))}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.name || !form.balance}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
