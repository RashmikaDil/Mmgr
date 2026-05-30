"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useInvestmentStore } from "@/store/investmentStore";
import type { Investment } from "@/types";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle, TrendingUp, TrendingDown, Pencil, Trash2,
  BarChart3, Briefcase, AlertCircle, RefreshCw,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format } from "date-fns";

// ── constants ──────────────────────────────────────────────────────────────────

const INVESTMENT_TYPES = ["Stocks", "Mutual Funds", "Crypto", "Gold", "Other"] as const;

const TYPE_COLORS: Record<string, string> = {
  Stocks: "#6366f1",
  "Mutual Funds": "#22c55e",
  Crypto: "#f59e0b",
  Gold: "#eab308",
  Other: "#94a3b8",
};

interface FormState {
  name: string;
  symbol: string;
  type: Investment["type"];
  amountInvested: string;
  currentValue: string;
  purchaseDate: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  symbol: "",
  type: "Stocks",
  amountInvested: "",
  currentValue: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
};

// ── main component ─────────────────────────────────────────────────────────────

export default function InvestmentsPage() {
  const { user } = useAuth();
  const {
    investments,
    loading,
    error: storeError,
    fetchInvestments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    refresh,
  } = useInvestmentStore();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load investments on mount / when user changes
  useEffect(() => {
    if (user?.uid) {
      fetchInvestments(user.uid);
    }
  }, [user?.uid, fetchInvestments]);

  // ── derived stats ─────────────────────────────────────────────────────────────

  const totalInvested = investments.reduce((s, i) => s + (i.amountInvested || 0), 0);
  const totalCurrent  = investments.reduce((s, i) => s + (i.currentValue || 0), 0);
  const totalROI      = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;
  const totalGainLoss = totalCurrent - totalInvested;

  const allocationData = INVESTMENT_TYPES
    .map((type) => ({
      name: type,
      value: investments
        .filter((i) => i.type === type)
        .reduce((s, i) => s + (i.currentValue || 0), 0),
    }))
    .filter((d) => d.value > 0);

  // ── validation ────────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!form.name.trim()) return "Investment name is required.";
    if (!form.purchaseDate) return "Purchase date is required.";
    const invested = parseFloat(form.amountInvested);
    if (isNaN(invested) || invested <= 0) return "Amount invested must be a positive number.";
    const current = parseFloat(form.currentValue);
    if (isNaN(current) || current < 0) return "Current value must be 0 or more.";
    return null;
  }

  // ── handlers ─────────────────────────────────────────────────────────────────

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(inv: Investment) {
    setEditing(inv);
    setForm({
      name: inv.name,
      symbol: inv.symbol || "",
      type: inv.type,
      amountInvested: String(inv.amountInvested),
      currentValue: String(inv.currentValue),
      purchaseDate: inv.purchaseDate,
    });
    setFormError(null);
    setOpen(true);
  }

  const handleSubmit = async () => {
    if (!user?.uid) {
      setFormError("You must be signed in to save investments.");
      return;
    }

    const err = validate();
    if (err) { setFormError(err); return; }

    setSaving(true);
    setFormError(null);

    const payload = {
      userId: user.uid,
      name: form.name.trim(),
      symbol: form.type === "Crypto" ? form.symbol.trim().toUpperCase() : undefined,
      type: form.type,
      amountInvested: parseFloat(form.amountInvested),
      currentValue: parseFloat(form.currentValue),
      purchaseDate: form.purchaseDate,
    };

    try {
      if (editing) {
        await updateInvestment(editing.id, payload);
        setSuccessMsg("Investment updated!");
      } else {
        await addInvestment(payload);
        setSuccessMsg("Investment saved!");
      }
      // Always re-fetch from Firestore to confirm persistence
      await refresh(user.uid);
      setOpen(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error("[InvestmentsPage] Save error:", err);
      setFormError(err?.message ?? "Failed to save investment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  async function handleDelete(id: string) {
    if (!confirm("Delete this investment? This cannot be undone.")) return;
    try {
      await deleteInvestment(id);
      if (user?.uid) await refresh(user.uid);
    } catch (err: any) {
      console.error("[InvestmentsPage] Delete error:", err);
    }
  }

  const handleRefresh = useCallback(async () => {
    if (user?.uid) await refresh(user.uid);
  }, [user?.uid, refresh]);

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investments</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track your portfolio value, ROI, and asset allocation.
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openAdd} className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Add Investment
          </Button>
        </div>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          {successMsg}
        </div>
      )}

      {/* Store error banner */}
      {storeError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {storeError}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">₹{totalInvested.toLocaleString()}</div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">{investments.length} holdings</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">₹{totalCurrent.toLocaleString()}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">portfolio value</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br border ${totalGainLoss >= 0
          ? "from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-800"
          : "from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 border-red-200 dark:border-red-800"}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${totalGainLoss >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
              Gain / Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-1 ${totalGainLoss >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
              {totalGainLoss >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              ₹{Math.abs(totalGainLoss).toLocaleString()}
            </div>
            <p className={`text-xs mt-1 ${totalGainLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              overall {totalGainLoss >= 0 ? "profit" : "loss"}
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br border ${totalROI >= 0
          ? "from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800"
          : "from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/20 border-rose-200 dark:border-rose-800"}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${totalROI >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
              ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalROI >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
              {totalROI >= 0 ? "+" : ""}{totalROI.toFixed(2)}%
            </div>
            <p className={`text-xs mt-1 ${totalROI >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              return on investment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loading skeleton */}
      {loading && investments.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && investments.length === 0 && (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-gray-400">
            <Briefcase className="w-12 h-12 opacity-30" />
            <p className="text-lg font-medium">No investments yet</p>
            <p className="text-sm">Add your first investment to start tracking your portfolio.</p>
            <Button variant="outline" onClick={openAdd} className="mt-2 gap-2">
              <PlusCircle className="w-4 h-4" /> Add Investment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Charts + Holdings */}
      {investments.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Allocation Pie */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-4 h-4" /> Asset Allocation
              </CardTitle>
              <CardDescription>Portfolio by investment type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={600}
                  >
                    {allocationData.map((entry) => (
                      <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Holdings table */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Holdings</CardTitle>
              <CardDescription>Individual investment performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {investments.map((inv) => {
                const roi = inv.amountInvested > 0
                  ? ((inv.currentValue - inv.amountInvested) / inv.amountInvested) * 100
                  : 0;
                const gainLoss = inv.currentValue - inv.amountInvested;
                const isUp = gainLoss >= 0;

                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: TYPE_COLORS[inv.type] }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{inv.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {inv.type}{inv.symbol ? ` (${inv.symbol})` : ""} • {inv.purchaseDate ? format(new Date(inv.purchaseDate), "dd MMM yyyy") : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-sm">₹{(inv.currentValue || 0).toLocaleString()}</p>
                        <p className={`text-xs flex items-center justify-end gap-0.5 ${isUp ? "text-green-600" : "text-red-500"}`}>
                          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {roi.toFixed(1)}%
                        </p>
                      </div>
                      <div className="hidden group-hover:flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(inv)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(inv.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFormError(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Investment" : "Add Investment"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update your investment details." : "Track a new investment in your portfolio."}
            </DialogDescription>
          </DialogHeader>

          {/* Inline form error */}
          {formError && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {formError}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">Investment Name</Label>
              <Input
                id="inv-name"
                placeholder="e.g. Reliance Industries, Bitcoin…"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as Investment["type"] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {INVESTMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.type === "Crypto" && (
              <div className="space-y-1.5">
                <Label htmlFor="inv-symbol">Crypto Ticker Symbol</Label>
                <Input
                  id="inv-symbol"
                  placeholder="e.g. BTC, ETH, SOL…"
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-invested">Amount Invested (₹)</Label>
                <Input
                  id="inv-invested"
                  type="number"
                  min="0"
                  placeholder="10000"
                  value={form.amountInvested}
                  onChange={(e) => setForm({ ...form, amountInvested: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-current">Current Value (₹)</Label>
                <Input
                  id="inv-current"
                  type="number"
                  min="0"
                  placeholder="12000"
                  value={form.currentValue}
                  onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-date">Purchase Date</Label>
              <Input
                id="inv-date"
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.name.trim() || !form.amountInvested || !form.purchaseDate}
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Investment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
