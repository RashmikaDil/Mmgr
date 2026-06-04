"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLoanStore } from "@/store/loanStore";
import { useCurrency } from "@/context/CurrencyContext";
import { Loan } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  TrendingDown,
  Pencil,
  Trash2,
  Calendar,
  Building,
  Target,
  BadgePercent,
  BrainCircuit,
  CreditCard,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";

const EMPTY_FORM: Omit<Loan, 'id' | 'userId' | 'createdAt'> = {
  name: "",
  type: "Personal",
  principal: 0,
  interestRate: 0,
  termMonths: 12,
  monthlyPayment: 0,
  remainingBalance: 0,
  startDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
  status: "active",
};

export default function LoansPage() {
  const { user } = useAuth();
  const { loans, loading, fetchLoans, addLoan, updateLoan, deleteLoan } = useLoanStore();
  const { currency, formatPrice } = useCurrency();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [form, setForm] = useState<Omit<Loan, 'id' | 'userId' | 'createdAt'>>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Strategy Widget state
  const [extraPayment, setExtraPayment] = useState<number>(0);

  useEffect(() => {
    if (user?.uid) fetchLoans(user.uid);
  }, [user, fetchLoans]);

  const activeLoans = loans.filter((l) => l.status === "active");
  const totalDebt = activeLoans.reduce((sum, l) => sum + l.remainingBalance, 0);
  const totalMonthlyMinimums = activeLoans.reduce((sum, l) => sum + l.monthlyPayment, 0);

  // Calculate weighted average interest rate
  const avgInterestRate = totalDebt > 0 
    ? activeLoans.reduce((sum, l) => sum + (l.interestRate * (l.remainingBalance / totalDebt)), 0) 
    : 0;

  // -- AI Strategy Calculations --
  // Helper to simulate payoff timeline
  const simulatePayoff = (method: 'avalanche' | 'snowball') => {
    let simulatedLoans = activeLoans.map(l => ({ ...l }));
    let totalMonths = 0;
    let totalInterestPaid = 0;

    // Sort strategy
    if (method === 'avalanche') {
      simulatedLoans.sort((a, b) => b.interestRate - a.interestRate);
    } else {
      simulatedLoans.sort((a, b) => a.remainingBalance - b.remainingBalance);
    }

    // Rough approximation simulation loop (assuming simple monthly amortization for speed)
    let safeGuard = 0;
    while (simulatedLoans.length > 0 && safeGuard < 1200) { // Max 100 years
      safeGuard++;
      let extraAvailable = extraPayment;
      
      // Pay minimums on all first
      for (let i = 0; i < simulatedLoans.length; i++) {
        let loan = simulatedLoans[i];
        let interestThisMonth = loan.remainingBalance * (loan.interestRate / 100 / 12);
        totalInterestPaid += interestThisMonth;
        
        let minPayment = Math.max(interestThisMonth + 1, loan.monthlyPayment);
        
        if (loan.remainingBalance + interestThisMonth <= minPayment) {
           // Loan paid off by minimum payment!
           extraAvailable += (minPayment - (loan.remainingBalance + interestThisMonth)); // Roll over remainder
           loan.remainingBalance = 0;
        } else {
           loan.remainingBalance = loan.remainingBalance + interestThisMonth - minPayment;
        }
      }

      // Filter out paid off loans
      simulatedLoans = simulatedLoans.filter(l => l.remainingBalance > 0);

      // Apply extra snowball/avalanche money to the highest priority loan
      if (simulatedLoans.length > 0 && extraAvailable > 0) {
        let targetLoan = simulatedLoans[0];
        if (targetLoan.remainingBalance <= extraAvailable) {
          extraAvailable -= targetLoan.remainingBalance;
          targetLoan.remainingBalance = 0;
        } else {
          targetLoan.remainingBalance -= extraAvailable;
        }
      }
      
      simulatedLoans = simulatedLoans.filter(l => l.remainingBalance > 0);
      totalMonths++;
    }

    return { totalMonths, totalInterestPaid };
  };

  const avalancheData = useMemo(() => simulatePayoff('avalanche'), [activeLoans, extraPayment]);
  const snowballData = useMemo(() => simulatePayoff('snowball'), [activeLoans, extraPayment]);

  // Determine winner
  const avalancheWins = avalancheData.totalInterestPaid < snowballData.totalInterestPaid;
  const bestStrategy = avalancheWins ? 'Avalanche' : 'Snowball';
  const interestSaved = Math.abs(avalancheData.totalInterestPaid - snowballData.totalInterestPaid);

  // Handlers
  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setOpen(true);
  };

  const openEdit = (loan: Loan) => {
    setEditing(loan);
    setForm({
      name: loan.name,
      type: loan.type,
      principal: loan.principal,
      interestRate: loan.interestRate,
      termMonths: loan.termMonths,
      monthlyPayment: loan.monthlyPayment,
      remainingBalance: loan.remainingBalance,
      startDate: loan.startDate,
      dueDate: loan.dueDate,
      status: loan.status,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      if (editing) {
        await updateLoan(editing.id, form);
      } else {
        await addLoan({ ...form, userId: user.uid });
      }
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this loan record? This action cannot be undone.")) {
      await deleteLoan(id);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingDown className="w-8 h-8 text-rose-600" />
            Debt & Loans
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track liabilities, manage repayments, and let AI optimize your debt freedom timeline.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 self-start sm:self-auto bg-rose-600 hover:bg-rose-700 text-white shadow-md">
          <PlusCircle className="w-4 h-4" />
          Add Liability
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100/60 dark:from-rose-950/40 dark:to-rose-900/10 border-rose-200 dark:border-rose-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Total Outstanding Debt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-950 dark:text-rose-50">
              {formatPrice(totalDebt)}
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">Across {activeLoans.length} active loans</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/60 dark:from-orange-950/40 dark:to-orange-900/10 border-orange-200 dark:border-orange-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">Avg Interest Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-950 dark:text-orange-50 flex items-center gap-1.5">
              <BadgePercent className="w-5 h-5" />
              {avgInterestRate.toFixed(2)}%
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Weighted APR</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/10 border-amber-200 dark:border-amber-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Minimum Monthly Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-950 dark:text-amber-50">
              {formatPrice(totalMonthlyMinimums)}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Required outflow</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Extra Payment Allocation</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-2 mt-1">
               <span className="text-sm font-bold text-emerald-900 dark:text-emerald-50">{currency}</span>
               <Input 
                 type="number"
                 className="h-8 font-bold text-emerald-900 dark:text-emerald-100 bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 w-full"
                 value={extraPayment || ""}
                 onChange={(e) => setExtraPayment(parseFloat(e.target.value) || 0)}
                 placeholder="0"
               />
             </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2">Any extra funds to accelerate payoff</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Avalanche vs Snowball Optimizer */}
      {activeLoans.length > 1 && (
        <Card className="border border-indigo-100 dark:border-indigo-900/30 shadow-md relative overflow-hidden bg-gradient-to-br from-indigo-50/30 via-white to-white dark:from-indigo-950/20 dark:via-zinc-950 dark:to-zinc-900">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />
          <CardHeader className="pb-4 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  AI Repayment Optimizer
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-extrabold uppercase px-2 py-0.5 rounded-full">
                    Recommended: {bestStrategy}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Simulating the fastest and cheapest path to become 100% debt-free.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            
            {/* Avalanche */}
            <div className={`p-5 rounded-2xl border ${bestStrategy === 'Avalanche' ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500 shadow-sm' : 'bg-gray-50/50 dark:bg-zinc-900/30 border-gray-100 dark:border-zinc-800'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">Avalanche Method</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Focus extra payments on highest interest first.</p>
                </div>
                {bestStrategy === 'Avalanche' && <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">Winner</span>}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Debt Free Timeline:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{Math.floor(avalancheData.totalMonths / 12)}y {avalancheData.totalMonths % 12}m</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-gray-100 dark:border-zinc-800 pt-3">
                  <span className="text-gray-500">Total Interest Paid:</span>
                  <span className={`font-black ${bestStrategy === 'Avalanche' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {formatPrice(avalancheData.totalInterestPaid)}
                  </span>
                </div>
              </div>
            </div>

            {/* Snowball */}
            <div className={`p-5 rounded-2xl border ${bestStrategy === 'Snowball' ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500 shadow-sm' : 'bg-gray-50/50 dark:bg-zinc-900/30 border-gray-100 dark:border-zinc-800'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">Snowball Method</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Focus extra payments on smallest balance first.</p>
                </div>
                {bestStrategy === 'Snowball' && <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">Winner</span>}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Debt Free Timeline:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{Math.floor(snowballData.totalMonths / 12)}y {snowballData.totalMonths % 12}m</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-gray-100 dark:border-zinc-800 pt-3">
                  <span className="text-gray-500">Total Interest Paid:</span>
                  <span className={`font-black ${bestStrategy === 'Snowball' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {formatPrice(snowballData.totalInterestPaid)}
                  </span>
                </div>
              </div>
            </div>

          </CardContent>
          <CardFooter className="bg-gray-50/50 dark:bg-zinc-900/30 border-t border-gray-100 dark:border-zinc-800 p-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 w-full text-center flex items-center justify-center gap-2">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">Insight:</span> 
              You save <span className="font-bold text-emerald-600 dark:text-emerald-400 px-1 bg-emerald-100 dark:bg-emerald-900/30 rounded">{formatPrice(interestSaved)}</span> in interest by following the {bestStrategy} method!
            </p>
          </CardFooter>
        </Card>
      )}

      {/* Loan List */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {loans.map(loan => {
          const isPaid = loan.status === 'paid';
          const progress = loan.principal > 0 ? ((loan.principal - loan.remainingBalance) / loan.principal) * 100 : 0;

          return (
            <Card key={loan.id} className={`relative overflow-hidden group border-gray-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-700 transition-all shadow-sm ${isPaid ? 'opacity-60' : ''}`}>
              <div className={`absolute top-0 left-0 w-full h-1 ${isPaid ? 'bg-emerald-500' : 'bg-gradient-to-r from-rose-500 to-orange-500'}`} />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base font-bold line-clamp-1">{loan.name}</CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1 mt-1">
                      <Building className="w-3.5 h-3.5 text-gray-400" />
                      {loan.type} Loan
                    </CardDescription>
                  </div>
                  <div className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shadow-sm ${isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'}`}>
                     {loan.status}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs font-semibold text-gray-500">Remaining Balance</p>
                    <p className={`text-lg font-black ${isPaid ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                      {formatPrice(loan.remainingBalance)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-500">Interest</p>
                    <p className="text-sm font-bold flex items-center justify-end gap-1 text-orange-600 dark:text-orange-400">
                      <BadgePercent className="w-3.5 h-3.5" />
                      {loan.interestRate}%
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 space-y-2">
                   <div className="flex justify-between text-xs">
                     <span className="text-gray-500">Original Principal:</span>
                     <span className="font-semibold text-gray-700 dark:text-gray-300">{formatPrice(loan.principal)}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                     <span className="text-gray-500">Monthly Payment:</span>
                     <span className="font-semibold text-gray-700 dark:text-gray-300">{formatPrice(loan.monthlyPayment)}</span>
                   </div>
                   
                   <div className="space-y-1 mt-3">
                     <div className="flex justify-between text-[10px] font-semibold text-gray-500">
                       <span>Payoff Progress</span>
                       <span>{progress.toFixed(1)}%</span>
                     </div>
                     <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                       <div className={`${isPaid ? 'bg-emerald-500' : 'bg-rose-500'} h-1.5 transition-all`} style={{ width: `${Math.min(progress, 100)}%` }} />
                     </div>
                   </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold" onClick={() => openEdit(loan)}>
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => handleDelete(loan.id)}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {loans.length === 0 && (
          <Card className="border-dashed border-2 bg-transparent py-12 md:col-span-2 lg:col-span-3">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-lg font-bold">No loans tracked yet</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Add your mortgages, car loans, and credit cards to unlock AI repayment optimization.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
               <TrendingDown className="w-5 h-5 text-rose-600" />
               {editing ? "Edit Loan / Liability" : "Add Loan / Liability"}
            </DialogTitle>
            <DialogDescription>
              Enter the exact details of your liability to ensure accurate AI calculations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Loan Name / Description</Label>
                <Input placeholder="e.g. Visa Credit Card, Car Loan" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Loan Type</Label>
                <Select value={form.type} onValueChange={(val: any) => setForm({ ...form, type: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Personal">Personal Loan</SelectItem>
                    <SelectItem value="Mortgage">Mortgage</SelectItem>
                    <SelectItem value="Student">Student Loan</SelectItem>
                    <SelectItem value="Auto">Auto Loan</SelectItem>
                    <SelectItem value="Other">Other / Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                <Label>Original Principal Amount</Label>
                <Input type="number" value={form.principal} onChange={e => setForm({ ...form, principal: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Current Remaining Balance</Label>
                <Input type="number" value={form.remainingBalance} onChange={e => setForm({ ...form, remainingBalance: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                <Label>Interest Rate (APR %)</Label>
                <Input type="number" step="0.1" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Minimum Monthly Payment</Label>
                <Input type="number" value={form.monthlyPayment} onChange={e => setForm({ ...form, monthlyPayment: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Loan Status</Label>
              <Select value={form.status} onValueChange={(val: any) => setForm({ ...form, status: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paid">Paid Off 🎉</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.name} className="bg-rose-600 hover:bg-rose-700 text-white">
              {saving ? "Saving..." : "Save Liability"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
