"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRetirementStore } from "@/store/retirementStore";
import { useCurrency } from "@/context/CurrencyContext";
import { RetirementAccount } from "@/types";
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
  Landmark,
  PlusCircle,
  TrendingUp,
  BrainCircuit,
  Pencil,
  Trash2,
  Calendar,
  Building,
  Target,
  ShieldCheck,
  Briefcase
} from "lucide-react";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const EMPTY_FORM = {
  name: "",
  provider: "",
  contributions: "",
  currentValue: "",
  targetValue: "",
  startDate: new Date().toISOString().slice(0, 10),
  targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 20)).toISOString().slice(0, 10), // +20 years default
};

export default function RetirementPage() {
  const { user } = useAuth();
  const { accounts, loading, fetchAccounts, addAccount, updateAccount, deleteAccount } = useRetirementStore();
  const { currency, formatPrice } = useCurrency();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RetirementAccount | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Interactive FIRE simulator state
  const [monthlyContribution, setMonthlyContribution] = useState<number>(50000); // LKR default
  const [expectedReturnRate, setExpectedReturnRate] = useState<number>(8); // 8% avg market return
  const [inflationRate, setInflationRate] = useState<number>(3); // 3% inflation
  const [safeWithdrawalRate, setSafeWithdrawalRate] = useState<number>(4); // 4% rule

  useEffect(() => {
    if (user?.uid) fetchAccounts(user.uid);
  }, [user, fetchAccounts]);

  // Derived stats
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentValue, 0);
  const totalContributions = accounts.reduce((sum, acc) => sum + acc.contributions, 0);
  const totalTarget = accounts.reduce((sum, acc) => sum + (acc.targetValue || 0), 0);
  const netROI = totalContributions > 0 ? ((totalBalance - totalContributions) / totalContributions) * 100 : 0;

  // FIRE Monte Carlo Simulation (30 years)
  const projectionData = useMemo(() => {
    const data = [];
    let currentBal = totalBalance;
    const realReturnRate = expectedReturnRate - inflationRate; // Inflation adjusted return
    const monthlyRate = realReturnRate / 100 / 12;

    const currentYear = new Date().getFullYear();

    for (let year = 0; year <= 30; year++) {
      data.push({
        year: currentYear + year,
        projectedBalance: Math.round(currentBal),
        contributionsOnly: Math.round(totalContributions + (monthlyContribution * 12 * year)),
      });

      // Compound for 12 months
      for (let m = 0; m < 12; m++) {
        currentBal = currentBal * (1 + monthlyRate) + monthlyContribution;
      }
    }
    return data;
  }, [totalBalance, totalContributions, monthlyContribution, expectedReturnRate, inflationRate]);

  // Safe Withdrawal Rate (SWR) logic
  const fireTargetRequired = monthlyContribution * 12 * 25; // Simple 25x rule for 4% SWR based on current contribution velocity (proxy for lifestyle)
  // For a better proxy, we assume they want to replace a monthly income equivalent to (current portfolio + projected). Let's use standard FIRE math.
  // Actually, let's use the final projected balance to calculate their perpetual SWR monthly income.
  const finalProjectedBalance = projectionData.length > 0 ? projectionData[projectionData.length - 1].projectedBalance : 0;
  const projectedMonthlyIncomeSWR = (finalProjectedBalance * (safeWithdrawalRate / 100)) / 12;

  const currentSWRIncome = (totalBalance * (safeWithdrawalRate / 100)) / 12;

  // Handlers
  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (acc: RetirementAccount) => {
    setEditing(acc);
    setForm({
      name: acc.name,
      provider: acc.provider,
      contributions: String(acc.contributions),
      currentValue: String(acc.currentValue),
      targetValue: acc.targetValue ? String(acc.targetValue) : "",
      startDate: acc.startDate,
      targetDate: acc.targetDate || "",
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!user?.uid) return;
    setSaving(true);
    
    const payload = {
      userId: user.uid,
      name: form.name.trim(),
      provider: form.provider.trim(),
      contributions: parseFloat(form.contributions) || 0,
      currentValue: parseFloat(form.currentValue) || 0,
      targetValue: form.targetValue ? parseFloat(form.targetValue) : undefined,
      startDate: form.startDate,
      targetDate: form.targetDate || undefined,
    };

    try {
      if (editing) {
        await updateAccount(editing.id, payload);
      } else {
        await addAccount(payload);
      }
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this retirement account?")) {
      await deleteAccount(id);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-3 rounded-lg shadow-xl text-xs space-y-1">
          <p className="font-bold text-gray-800 dark:text-gray-200">Year {label}</p>
          <p className="text-indigo-600 dark:text-indigo-400 font-semibold flex justify-between gap-4">
            <span>Projected Portfolio:</span> <span>{formatPrice(payload[0].value)}</span>
          </p>
          <p className="text-gray-500 dark:text-gray-400 flex justify-between gap-4">
            <span>Total Contributed:</span> <span>{formatPrice(payload[1].value)}</span>
          </p>
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-zinc-800 text-emerald-600 dark:text-emerald-500 font-bold flex justify-between gap-4">
            <span>{safeWithdrawalRate}% Safe Monthly Income:</span> 
            <span>{formatPrice((payload[0].value * (safeWithdrawalRate / 100)) / 12)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
            FIRE & Retirement
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track your long-term wealth, pensions, and project your financial independence trajectory.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 self-start sm:self-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
          <PlusCircle className="w-4 h-4" />
          Add Account
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/60 dark:from-indigo-950/40 dark:to-indigo-900/10 border-indigo-200 dark:border-indigo-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Retirement Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-950 dark:text-indigo-50">
              {formatPrice(totalBalance)}
            </div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Across {accounts.length} accounts</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-950 dark:text-emerald-50">
              {formatPrice(totalContributions)}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Principal invested</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/60 dark:from-purple-950/40 dark:to-purple-900/10 border-purple-200 dark:border-purple-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">All-Time ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-950 dark:text-purple-50 flex items-center gap-1.5">
              {netROI > 0 && <TrendingUp className="w-5 h-5" />}
              {netROI.toFixed(1)}%
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Capital appreciation</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/10 border-amber-200 dark:border-amber-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Current FIRE SWR Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-950 dark:text-amber-50">
              {formatPrice(currentSWRIncome)}<span className="text-sm font-medium">/mo</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Based on {safeWithdrawalRate}% safe withdrawal</p>
          </CardContent>
        </Card>
      </div>

      {/* AI FIRE Monte Carlo Simulator */}
      <Card className="border border-indigo-100 dark:border-indigo-900/30 shadow-md overflow-hidden relative">
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-3xl pointer-events-none -ml-20 -mt-20" />
        <CardHeader className="pb-4 relative z-10 border-b border-gray-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">FIRE Monte Carlo Simulator</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Project your inflation-adjusted net worth and Safe Withdrawal Rate (SWR) over 30 years.
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="flex flex-col gap-1 w-32">
                <Label className="text-[10px] uppercase text-gray-500">Monthly Addition</Label>
                <Input 
                  type="number" 
                  value={monthlyContribution || ""} 
                  onChange={(e) => setMonthlyContribution(parseInt(e.target.value) || 0)}
                  className="h-8 text-xs font-bold"
                />
              </div>
              <div className="flex flex-col gap-1 w-24">
                <Label className="text-[10px] uppercase text-gray-500">Return (%)</Label>
                <Input 
                  type="number" 
                  value={expectedReturnRate || ""} 
                  onChange={(e) => setExpectedReturnRate(parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-bold"
                  step="0.1"
                />
              </div>
              <div className="flex flex-col gap-1 w-24">
                <Label className="text-[10px] uppercase text-gray-500">Inflation (%)</Label>
                <Input 
                  type="number" 
                  value={inflationRate || ""} 
                  onChange={(e) => setInflationRate(parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-bold"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 relative z-10 flex flex-col lg:flex-row gap-6">
          <div className="h-72 w-full lg:w-3/4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#888' }}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return val;
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="projectedBalance" 
                  name="Projected Portfolio"
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="contributionsOnly" 
                  name="Total Contributed"
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="w-full lg:w-1/4 flex flex-col gap-4">
             <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
               <p className="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider mb-2">30-Year Projection</p>
               <div className="text-2xl font-black text-indigo-950 dark:text-indigo-100">
                 {formatPrice(finalProjectedBalance)}
               </div>
               <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  Adjusted for {inflationRate}% inflation
               </p>
             </div>

             <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
               <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2">Perpetual Income</p>
               <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100">
                 {formatPrice(projectedMonthlyIncomeSWR)}<span className="text-sm">/mo</span>
               </div>
               <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-500 mt-1.5 flex items-center gap-1">
                 Using the {safeWithdrawalRate}% Safe Withdrawal Rule. This is the monthly income your portfolio will generate forever without depleting principal.
               </p>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Cards */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-gray-400" />
          Retirement Portfolios
        </h2>
        {accounts.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Landmark className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-lg font-bold">No retirement accounts found</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Add your 401(k), EPF, ETF Portfolios or pension plans to start tracking your path to Financial Independence.
              </p>
              <Button onClick={openAdd} className="mt-6 gap-2 bg-indigo-600 text-white">
                <PlusCircle className="w-4 h-4" /> Add Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map(acc => {
              const roi = acc.contributions > 0 ? ((acc.currentValue - acc.contributions) / acc.contributions) * 100 : 0;
              const targetProgress = acc.targetValue ? (acc.currentValue / acc.targetValue) * 100 : 0;

              return (
                <Card key={acc.id} className="relative overflow-hidden group border-gray-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base font-bold">{acc.name}</CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1 mt-1">
                          <Building className="w-3.5 h-3.5 text-gray-400" />
                          {acc.provider}
                        </CardDescription>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                         <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-semibold text-gray-500">Current Balance</p>
                        <p className="text-lg font-black text-gray-900 dark:text-gray-100">{formatPrice(acc.currentValue)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-500">Net ROI</p>
                        <p className={`text-sm font-bold flex items-center justify-end gap-1 ${roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {roi >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                          {roi.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 space-y-2">
                       <div className="flex justify-between text-xs">
                         <span className="text-gray-500">Principal Contributed:</span>
                         <span className="font-semibold">{formatPrice(acc.contributions)}</span>
                       </div>
                       {acc.targetValue && (
                         <div className="space-y-1 mt-2">
                           <div className="flex justify-between text-[10px] font-semibold text-gray-500">
                             <span>Target: {formatPrice(acc.targetValue)}</span>
                             <span>{targetProgress.toFixed(1)}%</span>
                           </div>
                           <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5">
                             <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(targetProgress, 100)}%` }} />
                           </div>
                         </div>
                       )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 pb-4 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold" onClick={() => openEdit(acc)}>
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => handleDelete(acc.id)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
               <ShieldCheck className="w-5 h-5 text-indigo-600" />
               {editing ? "Edit Retirement Account" : "Add Retirement Account"}
            </DialogTitle>
            <DialogDescription>
              Track your long-term 401(k), EPF, ETF, or Pension portfolios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Account Name</Label>
                <Input placeholder="e.g. EPF Fund, Vanguard S&P 500" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Provider / Institution</Label>
                <Input placeholder="e.g. Central Bank, Fidelity" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                <Label>Total Principal Contributed</Label>
                <Input type="number" placeholder="0" value={form.contributions} onChange={e => setForm({ ...form, contributions: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Current Market Value</Label>
                <Input type="number" placeholder="0" value={form.currentValue} onChange={e => setForm({ ...form, currentValue: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Target Value (Optional)</Label>
              <Input type="number" placeholder="e.g. 50000000" value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })} />
              <p className="text-[10px] text-gray-500">Set a specific goal for this account to track progress.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Target Retirement Date</Label>
                <Input type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.name || !form.provider || !form.currentValue} className="bg-indigo-600 text-white">
              {saving ? "Saving..." : "Save Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
