"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLoanStore } from "@/store/loanStore";
import { Loan } from "@/types";
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
  PlusCircle, CreditCard, Pencil, Trash2, Calendar, AlertCircle,
  CheckCircle2, TrendingDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import { format, addMonths, differenceInMonths } from "date-fns";

// ── helpers ────────────────────────────────────────────────────────────────────

/** Calculate monthly EMI using standard formula */
function calcEMI(principal: number, annualRate: number, termMonths: number): number {
  if (annualRate === 0) return principal / termMonths;
  const r = annualRate / 100 / 12;
  return (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

/** Generate first N months of amortization schedule for charting */
function buildAmortizationChart(
  principal: number,
  annualRate: number,
  termMonths: number,
  maxMonths = 24
) {
  const emi = calcEMI(principal, annualRate, termMonths);
  const r = annualRate / 100 / 12;
  let balance = principal;
  const data: { month: string; principal: number; interest: number }[] = [];
  const months = Math.min(termMonths, maxMonths);

  for (let i = 0; i < months; i++) {
    const interestPart = balance * r;
    const principalPart = emi - interestPart;
    balance = Math.max(0, balance - principalPart);
    data.push({
      month: `M${i + 1}`,
      principal: parseFloat(principalPart.toFixed(2)),
      interest: parseFloat(interestPart.toFixed(2)),
    });
  }
  return data;
}

const LOAN_TYPES = ["Personal", "Mortgage", "Student", "Auto", "Other"] as const;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  defaulted: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const EMPTY_FORM = {
  name: "",
  type: "Personal" as Loan["type"],
  principal: "",
  interestRate: "",
  termMonths: "",
  startDate: "",
  dueDate: "",
  remainingBalance: "",
  status: "active" as Loan["status"],
};

// ── main component ─────────────────────────────────────────────────────────────

export default function LoansPage() {
  const { user } = useAuth();
  const { loans, loading, fetchLoans, addLoan, updateLoan, deleteLoan } = useLoanStore();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  useEffect(() => {
    if (user?.uid) fetchLoans(user.uid);
  }, [user, fetchLoans]);

  // ── derived stats ─────────────────────────────────────────────────────────────

  const activeLoans      = loans.filter((l) => l.status === "active");
  const totalDebt        = activeLoans.reduce((s, l) => s + l.remainingBalance, 0);
  const totalPrincipal   = loans.reduce((s, l) => s + l.principal, 0);
  const totalMonthlyEMI  = activeLoans.reduce((s, l) => s + l.monthlyPayment, 0);
  const totalInterestCost = loans.reduce((l, loan) => {
    const emi = calcEMI(loan.principal, loan.interestRate, loan.termMonths);
    return l + (emi * loan.termMonths - loan.principal);
  }, 0);

  // Amortization chart for the selected loan (or first active loan)
  const chartLoan = selectedLoan ?? activeLoans[0] ?? null;
  const chartData = chartLoan
    ? buildAmortizationChart(chartLoan.principal, chartLoan.interestRate, chartLoan.termMonths)
    : [];

  // ── handlers ─────────────────────────────────────────────────────────────────

  function openAdd() {
    setEditing(null); setForm(EMPTY_FORM); setOpen(true);
  }

  function openEdit(l: Loan) {
    setEditing(l);
    setForm({
      name: l.name,
      type: l.type,
      principal: String(l.principal),
      interestRate: String(l.interestRate),
      termMonths: String(l.termMonths),
      startDate: l.startDate,
      dueDate: l.dueDate,
      remainingBalance: String(l.remainingBalance),
      status: l.status,
    });
    setOpen(true);
  }

  async function handleSubmit() {
    if (!user?.uid) return;
    setSaving(true);
    const principal = parseFloat(form.principal) || 0;
    const rate = parseFloat(form.interestRate) || 0;
    const term = parseInt(form.termMonths) || 0;
    const emi = calcEMI(principal, rate, term);

    const data: Omit<Loan, "id" | "createdAt"> = {
      userId: user.uid,
      name: form.name.trim(),
      type: form.type,
      principal,
      interestRate: rate,
      termMonths: term,
      monthlyPayment: parseFloat(emi.toFixed(2)),
      remainingBalance: form.remainingBalance ? parseFloat(form.remainingBalance) : principal,
      startDate: form.startDate,
      dueDate: form.dueDate,
      status: form.status,
    };

    if (editing) {
      await updateLoan(editing.id, data);
    } else {
      await addLoan(data);
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleDelete(id: string) {
    if (confirm("Delete this loan?")) await deleteLoan(id);
  }

  // Preview EMI
  const previewEMI = form.principal && form.interestRate && form.termMonths
    ? calcEMI(parseFloat(form.principal) || 0, parseFloat(form.interestRate) || 0, parseInt(form.termMonths) || 0)
    : null;

  const previewTotalCost = previewEMI && form.termMonths
    ? previewEMI * (parseInt(form.termMonths) || 0)
    : null;

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loans</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track EMIs, remaining balances, amortization, and total interest costs.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 self-start sm:self-auto">
          <PlusCircle className="w-4 h-4" /> Add Loan
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 border-red-200 dark:border-red-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Total Debt</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900 dark:text-red-100">₹{totalDebt.toLocaleString()}</div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">remaining balance</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Monthly EMI</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">₹{Math.round(totalMonthlyEMI).toLocaleString()}</div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">across active loans</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">Total Interest Cost</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">₹{Math.round(totalInterestCost).toLocaleString()}</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">over full terms</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/20 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Loans</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeLoans.length}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">of {loans.length} total</p>
          </CardContent>
        </Card>
      </div>

      {loans.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-gray-400">
            <CreditCard className="w-12 h-12 opacity-30" />
            <p className="text-lg font-medium">No loans tracked yet</p>
            <p className="text-sm">Add a loan to track EMIs, remaining balance, and amortization.</p>
            <Button variant="outline" onClick={openAdd} className="mt-2 gap-2">
              <PlusCircle className="w-4 h-4" /> Add Loan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Loan cards */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {loans.map((loan) => {
              const paidPct = loan.principal > 0
                ? Math.min(((loan.principal - loan.remainingBalance) / loan.principal) * 100, 100)
                : 0;
              const daysUntilDue = differenceInMonths(new Date(loan.dueDate), new Date());
              const isOverdue = daysUntilDue < 0 && loan.status === "active";

              return (
                <Card
                  key={loan.id}
                  className={`relative overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer ${selectedLoan?.id === loan.id ? "ring-2 ring-blue-500" : ""}`}
                  onClick={() => setSelectedLoan(selectedLoan?.id === loan.id ? null : loan)}
                >
                  {/* Status badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[loan.status]}`}>
                      {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                    </span>
                  </div>

                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        loan.status === "paid" ? "bg-green-100 dark:bg-green-900/40" : "bg-red-100 dark:bg-red-900/40"
                      }`}>
                        {loan.status === "paid"
                          ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                          : <CreditCard className="w-4 h-4 text-red-500" />}
                      </div>
                      <div>
                        <CardTitle className="text-base leading-tight">{loan.name}</CardTitle>
                        <CardDescription className="text-xs">{loan.type} Loan</CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Principal / Remaining */}
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Principal</p>
                        <p className="font-semibold">₹{loan.principal.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
                        <p className={`font-semibold ${loan.remainingBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                          ₹{loan.remainingBalance.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Repayment progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{paidPct.toFixed(1)}% repaid</span>
                        <span>EMI: ₹{Math.round(loan.monthlyPayment).toLocaleString()}/mo</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${paidPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        {loan.interestRate}% p.a.
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {loan.termMonths} months
                      </Badge>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(loan.startDate), "dd MMM yyyy")}
                      </span>
                      <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : ""}`}>
                        {isOverdue && <AlertCircle className="w-3 h-3" />}
                        Due {format(new Date(loan.dueDate), "dd MMM yyyy")}
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => openEdit(loan)}>
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" className="gap-1 flex-1" onClick={() => handleDelete(loan.id)}>
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Amortization chart for selected / first loan */}
          {chartLoan && chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Amortization Schedule — {chartLoan.name}
                </CardTitle>
                <CardDescription>
                  Principal vs interest split per month (first {chartData.length} months)
                  {loans.length > 1 && " · click a card above to switch"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `₹${value.toLocaleString()}`,
                        name === "principal" ? "Principal" : "Interest",
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="principal" name="Principal" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="interest" name="Interest" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Loan" : "Add Loan"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update loan details. EMI is auto-calculated." : "Track a new loan. EMI will be calculated automatically."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="loan-name">Loan Name *</Label>
                <Input id="loan-name" placeholder="e.g. Home Loan" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Loan["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOAN_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="loan-principal">Loan Amount (₹) *</Label>
                <Input id="loan-principal" type="number" min="0" placeholder="500000" value={form.principal}
                  onChange={(e) => setForm({ ...form, principal: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loan-remaining">Remaining Balance (₹)</Label>
                <Input id="loan-remaining" type="number" min="0" placeholder="auto-filled" value={form.remainingBalance}
                  onChange={(e) => setForm({ ...form, remainingBalance: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="loan-rate">Annual Interest Rate (%) *</Label>
                <Input id="loan-rate" type="number" min="0" step="0.01" placeholder="8.5" value={form.interestRate}
                  onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loan-term">Loan Term (months) *</Label>
                <Input id="loan-term" type="number" min="1" placeholder="240" value={form.termMonths}
                  onChange={(e) => setForm({ ...form, termMonths: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="loan-start">Start Date *</Label>
                <Input id="loan-start" type="date" value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loan-due">Due / End Date *</Label>
                <Input id="loan-due" type="date" value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Loan["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Live EMI preview */}
            {previewEMI !== null && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-md px-4 py-3 space-y-1">
                <p className="text-xs font-medium text-red-700 dark:text-red-300">EMI Preview</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Monthly EMI</span>
                  <span className="font-bold text-red-700 dark:text-red-300">₹{Math.round(previewEMI!).toLocaleString()}</span>
                </div>
                {previewTotalCost && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total Payment</span>
                      <span className="font-medium">₹{Math.round(previewTotalCost).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total Interest</span>
                      <span className="font-medium text-orange-600">
                        ₹{Math.round(previewTotalCost - (parseFloat(form.principal) || 0)).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.name || !form.principal || !form.interestRate || !form.termMonths || !form.startDate || !form.dueDate}
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Loan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
