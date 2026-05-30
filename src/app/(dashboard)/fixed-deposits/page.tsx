"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFixedDepositStore } from "@/store/fixedDepositStore";
import { FixedDeposit, InterestTier } from "@/types";
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
  PlusCircle, Landmark, Pencil, Trash2, TrendingUp,
  Calendar, Layers, X, Plus,
} from "lucide-react";
import { format, differenceInDays, differenceInMonths } from "date-fns";

// ── helpers ────────────────────────────────────────────────────────────────────

/** Get the applicable interest rate for a given principal using tiered rules */
function getEffectiveRate(principal: number, baseRate: number, tiers?: InterestTier[]): number {
  if (!tiers || tiers.length === 0) return baseRate;
  // Find the highest threshold that the principal exceeds
  const applicable = [...tiers]
    .sort((a, b) => b.aboveAmount - a.aboveAmount)
    .find((t) => principal > t.aboveAmount);
  return applicable ? applicable.rate : baseRate;
}

/** Convert rate to annual equivalent */
function toAnnualRate(rate: number, freq: FixedDeposit["rateFrequency"]): number {
  if (freq === "monthly") return rate * 12;
  if (freq === "quarterly") return rate * 4;
  return rate; // already annual
}

/** Calculate maturity value */
function calcMaturity(fd: FixedDeposit): number {
  const effectiveRate = getEffectiveRate(fd.principal, fd.interestRate, fd.interestTiers);
  const annualRate = toAnnualRate(effectiveRate, fd.rateFrequency) / 100;
  const months = differenceInMonths(new Date(fd.maturityDate), new Date(fd.startDate));
  const years = months / 12;

  if (fd.interestType === "simple") {
    return fd.principal * (1 + annualRate * years);
  } else {
    // Compound: n = compounding periods per year
    const n = fd.rateFrequency === "monthly" ? 12 : fd.rateFrequency === "quarterly" ? 4 : 1;
    return fd.principal * Math.pow(1 + annualRate / n, n * years);
  }
}

const FREQ_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  matured: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const EMPTY_FORM = {
  name: "",
  bankName: "",
  principal: "",
  minimumDeposit: "",
  interestRate: "",
  rateFrequency: "annual" as FixedDeposit["rateFrequency"],
  interestType: "compound" as FixedDeposit["interestType"],
  startDate: "",
  maturityDate: "",
  status: "active" as FixedDeposit["status"],
};

// ── main component ─────────────────────────────────────────────────────────────

export default function FixedDepositsPage() {
  const { user } = useAuth();
  const { deposits, loading, fetchDeposits, addDeposit, updateDeposit, deleteDeposit } =
    useFixedDepositStore();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FixedDeposit | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tiers, setTiers] = useState<InterestTier[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.uid) fetchDeposits(user.uid);
  }, [user, fetchDeposits]);

  // ── derived stats ─────────────────────────────────────────────────────────────
  const totalPrincipal = deposits.reduce((s, d) => s + d.principal, 0);
  const totalMaturity  = deposits.reduce((s, d) => s + calcMaturity(d), 0);
  const totalInterest  = totalMaturity - totalPrincipal;
  const activeCount    = deposits.filter((d) => d.status === "active").length;

  // ── handlers ─────────────────────────────────────────────────────────────────

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setTiers([]);
    setOpen(true);
  }

  function openEdit(fd: FixedDeposit) {
    setEditing(fd);
    setForm({
      name: fd.name,
      bankName: fd.bankName ?? "",
      principal: String(fd.principal),
      minimumDeposit: fd.minimumDeposit != null ? String(fd.minimumDeposit) : "",
      interestRate: String(fd.interestRate),
      rateFrequency: fd.rateFrequency,
      interestType: fd.interestType,
      startDate: fd.startDate,
      maturityDate: fd.maturityDate,
      status: fd.status,
    });
    setTiers(fd.interestTiers ?? []);
    setOpen(true);
  }

  function addTier() {
    setTiers([...tiers, { aboveAmount: 0, rate: 0 }]);
  }

  function removeTier(idx: number) {
    setTiers(tiers.filter((_, i) => i !== idx));
  }

  function updateTier(idx: number, field: keyof InterestTier, val: string) {
    setTiers(tiers.map((t, i) => i === idx ? { ...t, [field]: parseFloat(val) || 0 } : t));
  }

  async function handleSubmit() {
    if (!user?.uid) return;
    setSaving(true);
    const data: Omit<FixedDeposit, "id" | "createdAt"> = {
      userId: user.uid,
      name: form.name.trim(),
      bankName: form.bankName.trim() || undefined,
      principal: parseFloat(form.principal) || 0,
      minimumDeposit: form.minimumDeposit ? parseFloat(form.minimumDeposit) : undefined,
      interestRate: parseFloat(form.interestRate) || 0,
      rateFrequency: form.rateFrequency,
      interestType: form.interestType,
      interestTiers: tiers.length > 0 ? tiers : undefined,
      startDate: form.startDate,
      maturityDate: form.maturityDate,
      status: form.status,
    };
    if (editing) {
      await updateDeposit(editing.id, data);
    } else {
      await addDeposit(data);
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleDelete(id: string) {
    if (confirm("Delete this fixed deposit?")) await deleteDeposit(id);
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fixed Deposits</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track FDs with tiered interest rates, maturity values, and growth projections.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 self-start sm:self-auto">
          <PlusCircle className="w-4 h-4" /> Add Fixed Deposit
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Total Principal</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">₹{totalPrincipal.toLocaleString()}</div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">{deposits.length} deposits</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Maturity Value</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">₹{Math.round(totalMaturity).toLocaleString()}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">projected at maturity</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Interest</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">₹{Math.round(totalInterest).toLocaleString()}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">projected earnings</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">Active FDs</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{activeCount}</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">currently running</p>
          </CardContent>
        </Card>
      </div>

      {/* FD Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-56"><CardContent /></Card>)}
        </div>
      ) : deposits.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-gray-400">
            <Landmark className="w-12 h-12 opacity-30" />
            <p className="text-lg font-medium">No fixed deposits yet</p>
            <p className="text-sm">Add your first FD to track maturity value and interest earnings.</p>
            <Button variant="outline" onClick={openAdd} className="mt-2 gap-2">
              <PlusCircle className="w-4 h-4" /> Add Fixed Deposit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {deposits.map((fd) => {
            const maturity = calcMaturity(fd);
            const interest = maturity - fd.principal;
            const effectiveRate = getEffectiveRate(fd.principal, fd.interestRate, fd.interestTiers);
            const annualRate = toAnnualRate(effectiveRate, fd.rateFrequency);
            const daysLeft = differenceInDays(new Date(fd.maturityDate), new Date());

            return (
              <Card key={fd.id} className="relative overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                {/* Status ribbon */}
                <div className="absolute top-3 right-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[fd.status]}`}>
                    {fd.status.charAt(0).toUpperCase() + fd.status.slice(1)}
                  </span>
                </div>

                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                      <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base leading-tight">{fd.name}</CardTitle>
                      {fd.bankName && <CardDescription className="text-xs">{fd.bankName}</CardDescription>}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Principal / Maturity */}
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Principal</p>
                      <p className="font-semibold">₹{fd.principal.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Maturity Value</p>
                      <p className="font-semibold text-green-600">₹{Math.round(maturity).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Interest info */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {annualRate.toFixed(2)}% p.a. ({FREQ_LABELS[fd.rateFrequency]})
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {fd.interestType === "compound" ? "Compound" : "Simple"}
                    </Badge>
                    {fd.interestTiers && fd.interestTiers.length > 0 && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Layers className="w-3 h-3" /> {fd.interestTiers.length} tier{fd.interestTiers.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>

                  {/* Interest earned */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-md px-3 py-2 flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Interest Earned</span>
                    <span className="font-medium text-green-700 dark:text-green-300">+₹{Math.round(interest).toLocaleString()}</span>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(fd.startDate), "dd MMM yyyy")}
                    </span>
                    <span>→</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(fd.maturityDate), "dd MMM yyyy")}
                    </span>
                  </div>

                  {fd.status === "active" && (
                    <p className={`text-xs ${daysLeft < 30 ? "text-amber-600 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                      {daysLeft > 0 ? `${daysLeft} days until maturity` : "Matured"}
                    </p>
                  )}

                  {fd.minimumDeposit && (
                    <p className="text-xs text-gray-400">Min. deposit: ₹{fd.minimumDeposit.toLocaleString()}</p>
                  )}
                </CardContent>

                <CardFooter className="pt-0 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => openEdit(fd)}>
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1 flex-1" onClick={() => handleDelete(fd.id)}>
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
            <DialogTitle>{editing ? "Edit Fixed Deposit" : "Add Fixed Deposit"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update FD details." : "Track a new fixed deposit with interest and maturity info."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name + Bank */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fd-name">FD Name *</Label>
                <Input id="fd-name" placeholder="e.g. SBI FD 2025" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fd-bank">Bank Name</Label>
                <Input id="fd-bank" placeholder="e.g. SBI, HDFC" value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              </div>
            </div>

            {/* Principal + Min Deposit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fd-principal">Principal (₹) *</Label>
                <Input id="fd-principal" type="number" min="0" placeholder="50000" value={form.principal}
                  onChange={(e) => setForm({ ...form, principal: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fd-mindeposit">Min. Deposit (₹)</Label>
                <Input id="fd-mindeposit" type="number" min="0" placeholder="1000" value={form.minimumDeposit}
                  onChange={(e) => setForm({ ...form, minimumDeposit: e.target.value })} />
              </div>
            </div>

            {/* Interest Rate + Frequency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fd-rate">Base Interest Rate (%) *</Label>
                <Input id="fd-rate" type="number" min="0" step="0.01" placeholder="6.5" value={form.interestRate}
                  onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Rate Frequency *</Label>
                <Select value={form.rateFrequency} onValueChange={(v) => setForm({ ...form, rateFrequency: v as FixedDeposit["rateFrequency"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Interest Type + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Interest Type</Label>
                <Select value={form.interestType} onValueChange={(v) => setForm({ ...form, interestType: v as FixedDeposit["interestType"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compound">Compound</SelectItem>
                    <SelectItem value="simple">Simple</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as FixedDeposit["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="matured">Matured</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start + Maturity Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fd-start">Start Date *</Label>
                <Input id="fd-start" type="date" value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fd-maturity">Maturity Date *</Label>
                <Input id="fd-maturity" type="date" value={form.maturityDate}
                  onChange={(e) => setForm({ ...form, maturityDate: e.target.value })} />
              </div>
            </div>

            {/* Tiered interest rates */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Bonus Tier Interest Rates</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTier} className="gap-1 text-xs h-7">
                  <Plus className="w-3 h-3" /> Add Tier
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Override rate when principal exceeds a threshold (e.g. above ₹10,000 → 1% monthly).
              </p>
              {tiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-md border bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Above (₹)</Label>
                    <Input type="number" min="0" placeholder="10000" value={tier.aboveAmount || ""}
                      onChange={(e) => updateTier(idx, "aboveAmount", e.target.value)}
                      className="h-8 text-sm" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Rate (%)</Label>
                    <Input type="number" min="0" step="0.01" placeholder="1.0" value={tier.rate || ""}
                      onChange={(e) => updateTier(idx, "rate", e.target.value)}
                      className="h-8 text-sm" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 mt-4 text-red-500 hover:bg-red-50"
                    onClick={() => removeTier(idx)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Live maturity preview */}
            {form.principal && form.interestRate && form.startDate && form.maturityDate && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-md px-4 py-3 space-y-1">
                <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Maturity Preview</p>
                {(() => {
                  const preview: FixedDeposit = {
                    id: "", userId: "", name: "", createdAt: "",
                    principal: parseFloat(form.principal) || 0,
                    interestRate: parseFloat(form.interestRate) || 0,
                    rateFrequency: form.rateFrequency,
                    interestType: form.interestType,
                    interestTiers: tiers.length > 0 ? tiers : undefined,
                    startDate: form.startDate,
                    maturityDate: form.maturityDate,
                    status: form.status,
                  };
                  const mat = calcMaturity(preview);
                  const eff = getEffectiveRate(preview.principal, preview.interestRate, preview.interestTiers);
                  const ann = toAnnualRate(eff, preview.rateFrequency);
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Effective Rate</span>
                        <span className="font-medium">{ann.toFixed(2)}% p.a.</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Maturity Value</span>
                        <span className="font-semibold text-green-700 dark:text-green-300">₹{Math.round(mat).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Interest Earned</span>
                        <span className="font-medium text-green-600">+₹{Math.round(mat - (parseFloat(form.principal) || 0)).toLocaleString()}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.name || !form.principal || !form.interestRate || !form.startDate || !form.maturityDate}
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Add FD"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
