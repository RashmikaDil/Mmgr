"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSavingsGoalStore } from "@/store/savingsGoalStore";
import { useCurrency } from "@/context/CurrencyContext";
import { SavingsGoal } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  Target,
  Pencil,
  Trash2,
  TrendingUp,
  CheckCircle2,
  Clock,
  BrainCircuit,
  Sparkles,
  Plus,
  Minus,
  Sliders,
  Search,
  ArrowUpDown,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { aiService } from "@/services/aiService";
import { format, differenceInDays } from "date-fns";

// ── helpers ────────────────────────────────────────────────────────────────────

function getProgressColor(pct: number) {
  if (pct >= 100) return "bg-gradient-to-r from-emerald-500 to-green-600";
  if (pct >= 60) return "bg-gradient-to-r from-blue-500 to-indigo-600";
  if (pct >= 30) return "bg-gradient-to-r from-amber-500 to-orange-500";
  return "bg-gradient-to-r from-rose-500 to-red-500";
}

function getDaysLeft(targetDate: string) {
  return differenceInDays(new Date(targetDate), new Date());
}

const EMPTY_FORM = {
  name: "",
  targetAmount: "",
  currentAmount: "",
  targetDate: "",
};

export default function SavingsPage() {
  const { user } = useAuth();
  const { goals, loading, fetchGoals, addGoal, updateGoal, deleteGoal } =
    useSavingsGoalStore();
  const { currency, formatPrice } = useCurrency();

  const [open, setOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Filters & Sorting state
  const [filterTab, setFilterTab] = useState<"all" | "active" | "completed">("all");
  const [sortBy, setSortBy] = useState<"date" | "progress" | "amount" | "name">("date");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Action states
  const [quickDialogOpen, setQuickDialogOpen] = useState(false);
  const [quickGoal, setQuickGoal] = useState<SavingsGoal | null>(null);
  const [quickType, setQuickType] = useState<"deposit" | "withdraw">("deposit");
  const [quickAmount, setQuickAmount] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);

  // Interactive AI Simulator states
  const [monthlySavingsRate, setMonthlySavingsRate] = useState<number>(15000); // default contribution speed

  useEffect(() => {
    if (user?.uid) fetchGoals(user.uid);
  }, [user, fetchGoals]);

  // ── derived stats ────────────────────────────────────────────────────────────

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const completedGoals = goals.filter((g) => g.currentAmount >= g.targetAmount).length;
  const overallPct = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;

  // Active / Incomplete goals
  const activeIncompleteGoals = goals.filter((g) => g.currentAmount < g.targetAmount);
  const activeCount = activeIncompleteGoals.length;
  
  // Calculate allocated monthly share per goal (equal split simulation)
  const monthlyShare = activeCount > 0 ? monthlySavingsRate / activeCount : 0;

  // ── handlers ─────────────────────────────────────────────────────────────────

  function openAdd() {
    setEditingGoal(null);
    setForm({
      name: "",
      targetAmount: "",
      currentAmount: "0",
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days out default
    });
    setOpen(true);
  }

  function openEdit(g: SavingsGoal) {
    setEditingGoal(g);
    setForm({
      name: g.name,
      targetAmount: String(g.targetAmount),
      currentAmount: String(g.currentAmount),
      targetDate: g.targetDate,
    });
    setOpen(true);
  }

  async function handleSubmit() {
    if (!user?.uid) return;
    setSaving(true);
    const data = {
      userId: user.uid,
      name: form.name.trim(),
      targetAmount: parseFloat(form.targetAmount) || 0,
      currentAmount: parseFloat(form.currentAmount) || 0,
      targetDate: form.targetDate,
    };
    if (editingGoal) {
      await updateGoal(editingGoal.id, data);
    } else {
      await addGoal(data);
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleDelete(id: string) {
    if (window.confirm("Delete this savings goal? This action cannot be undone.")) {
      await deleteGoal(id);
    }
  }

  function openQuickAction(goal: SavingsGoal, type: "deposit" | "withdraw") {
    setQuickGoal(goal);
    setQuickType(type);
    setQuickAmount("");
    setQuickError(null);
    setQuickDialogOpen(true);
  }

  async function handleQuickSubmit() {
    if (!quickGoal || !user?.uid) return;
    const amount = parseFloat(quickAmount);
    if (isNaN(amount) || amount <= 0) {
      setQuickError("Please enter a valid positive amount.");
      return;
    }

    let newAmount = quickGoal.currentAmount;
    if (quickType === "deposit") {
      newAmount += amount;
    } else {
      if (amount > quickGoal.currentAmount) {
        setQuickError(`Cannot withdraw more than current savings (${formatPrice(quickGoal.currentAmount)}).`);
        return;
      }
      newAmount = Math.max(0, newAmount - amount);
    }

    setSaving(true);
    try {
      await updateGoal(quickGoal.id, {
        ...quickGoal,
        currentAmount: newAmount,
      });
      setQuickDialogOpen(false);
    } catch (err: any) {
      setQuickError(err.message || "Failed to update savings goal balance.");
    } finally {
      setSaving(false);
    }
  }

  // ── filter & sort logic ──────────────────────────────────────────────────────

  const filteredGoals = goals.filter((g) => {
    const isComplete = g.currentAmount >= g.targetAmount;
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filterTab === "active") return !isComplete;
    if (filterTab === "completed") return isComplete;
    return true;
  });

  const sortedGoals = [...filteredGoals].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    }
    if (sortBy === "progress") {
      const pctA = a.targetAmount > 0 ? a.currentAmount / a.targetAmount : 0;
      const pctB = b.targetAmount > 0 ? b.currentAmount / b.targetAmount : 0;
      return pctB - pctA;
    }
    if (sortBy === "amount") {
      return b.targetAmount - a.targetAmount;
    }
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  // Calculate recommended global rate to meet all goals
  const totalRecommendedMonthly = activeIncompleteGoals.reduce((sum, g) => {
    const days = getDaysLeft(g.targetDate);
    const monthsLeft = Math.max(0.5, days / 30.44);
    const needed = Math.max(0, g.targetAmount - g.currentAmount);
    return sum + needed / monthsLeft;
  }, 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Target className="w-8 h-8 text-blue-600" />
            Savings & Goals
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track and simulate your progress toward every financial milestone.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 self-start sm:self-auto shadow-md">
          <PlusCircle className="w-4 h-4" />
          Add Savings Goal
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/60 dark:from-blue-950/40 dark:to-blue-900/10 border-blue-200 dark:border-blue-900/30 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-950 dark:text-blue-50">
              {formatPrice(totalSaved)}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">across all goals</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/60 dark:from-purple-950/40 dark:to-purple-900/10 border-purple-200 dark:border-purple-900/30 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">Total Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-950 dark:text-purple-50">
              {formatPrice(totalTarget)}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">combined target</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-900/30 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-950 dark:text-emerald-50 flex items-baseline gap-1">
              <span>{completedGoals}</span>
              <span className="text-sm font-medium text-gray-500">/ {goals.length} reached</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">milestones completed</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/60 dark:from-orange-950/40 dark:to-orange-900/10 border-orange-200 dark:border-orange-900/30 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold text-orange-950 dark:text-orange-50">
              {overallPct.toFixed(1)}%
            </div>
            <Progress value={overallPct} className="h-1.5 bg-orange-200/50 dark:bg-orange-950/30" />
          </CardContent>
        </Card>
      </div>

      {/* Interactive AI Savings Simulator */}
      {goals.length > 0 && activeCount > 0 && (
        <Card className="border border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/50 via-white to-white dark:from-indigo-950/30 dark:via-zinc-900 dark:to-zinc-950 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  Interactive AI Goal Simulator
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-extrabold uppercase px-1.5 py-0.5 rounded-full">
                    Real-time
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Simulate your target monthly contribution to instantly preview success rates and timeline projections.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3 items-center">
            {/* Left: Interactive Input & Slider */}
            <div className="md:col-span-2 space-y-4 pr-0 md:pr-6 md:border-r border-gray-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <Label htmlFor="simulator-rate" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-500" />
                  Projected Monthly Contribution:
                </Label>
                <div className="flex items-center gap-1.5 w-36">
                  <span className="text-xs text-gray-500 font-bold">{currency}</span>
                  <Input
                    id="simulator-rate"
                    type="number"
                    value={monthlySavingsRate || ""}
                    onChange={(e) => setMonthlySavingsRate(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-8 font-bold text-right text-indigo-600 dark:text-indigo-400 border-indigo-200 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <input
                  type="range"
                  min="1000"
                  max="150000"
                  step="1000"
                  value={monthlySavingsRate}
                  onChange={(e) => setMonthlySavingsRate(parseInt(e.target.value))}
                  className="w-full h-2 bg-indigo-100 dark:bg-indigo-950/60 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-600 font-mono">
                  <span>{formatPrice(1000)}/mo</span>
                  <span>{formatPrice(75000)}/mo</span>
                  <span>{formatPrice(150000)}/mo</span>
                </div>
              </div>
            </div>

            {/* Right: Simulated Health Summary */}
            <div className="space-y-3 bg-indigo-50/20 dark:bg-indigo-950/10 p-4 rounded-xl border border-indigo-50 dark:border-indigo-950/20">
              <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-400">Simulation Projections</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Allocated Monthly Rate:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {formatPrice(monthlyShare)} <span className="text-[10px] text-gray-400">/ goal</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Recommended Global Rate:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {formatPrice(Math.round(totalRecommendedMonthly))}/mo
                  </span>
                </div>
                <div className="pt-2 border-t border-indigo-100/50 dark:border-indigo-950/30 flex items-center justify-between gap-2">
                  <span className="text-gray-500">Milestones Standing:</span>
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    {monthlySavingsRate >= totalRecommendedMonthly ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> All Targets Met
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Action Recommended
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls: Search, Filters, and Sorting */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-zinc-950 p-4 rounded-xl border shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg w-full md:w-auto">
          <button
            onClick={() => setFilterTab("all")}
            className={`flex-1 md:flex-initial text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
              filterTab === "all"
                ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterTab("active")}
            className={`flex-1 md:flex-initial text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
              filterTab === "active"
                ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilterTab("completed")}
            className={`flex-1 md:flex-initial text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
              filterTab === "completed"
                ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Completed
          </button>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Label htmlFor="sort-dropdown" className="text-xs font-semibold text-gray-500 shrink-0 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort by:
          </Label>
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as any)}
          >
            <SelectTrigger id="sort-dropdown" className="h-9 w-full md:w-44 text-xs font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Target Date (Soonest)</SelectItem>
              <SelectItem value="progress">Progress % (Highest)</SelectItem>
              <SelectItem value="amount">Target Amount (Largest)</SelectItem>
              <SelectItem value="name">Goal Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-64 border-zinc-200 dark:border-zinc-800">
              <CardContent className="h-full bg-gray-50/50 dark:bg-zinc-900/50 rounded-xl" />
            </Card>
          ))}
        </div>
      ) : sortedGoals.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent py-16">
          <CardContent className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-gray-500">
              <Target className="w-6 h-6 opacity-65" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">No savings goals match the filters</CardTitle>
              <CardDescription className="max-w-xs mt-1">
                Try updating your search query or creating a new savings goal to get started.
              </CardDescription>
            </div>
            <Button onClick={openAdd} variant="outline" className="mt-2 gap-2">
              <PlusCircle className="w-4 h-4" /> Create Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedGoals.map((goal) => {
            const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const daysLeft = getDaysLeft(goal.targetDate);
            const isComplete = goal.currentAmount >= goal.targetAmount;
            const remaining = goal.targetAmount - goal.currentAmount;

            // Generate AI prediction based on slider monthly savings rate
            const aiPrediction = !isComplete ? aiService.predictGoal(goal, monthlyShare) : null;

            return (
              <Card
                key={goal.id}
                className={`relative overflow-hidden shadow-sm hover:shadow-lg dark:hover:shadow-indigo-950/20 hover:scale-[1.01] transition-all duration-300 group flex flex-col justify-between border ${
                  isComplete
                    ? "border-emerald-200 dark:border-emerald-950 bg-emerald-50/10 dark:bg-emerald-950/5"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {/* Glowing glow effect on complete/active */}
                <div className={`absolute top-0 left-0 w-full h-1 ${
                  isComplete ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : pct >= 30 ? "bg-amber-500" : "bg-rose-500"
                }`} />

                <div>
                  <CardHeader className="pb-3 flex-row items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isComplete
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                          : "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                      }`}>
                        {isComplete ? <Sparkles className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                      </div>
                      <div>
                        <CardTitle className="text-base leading-tight font-bold">{goal.name}</CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          Target: {format(new Date(goal.targetDate), "dd MMM yyyy")}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pb-2">
                    {/* Saved / Target Details */}
                    <div className="flex justify-between text-xs">
                      <div>
                        <div className="text-gray-400 font-medium">Saved</div>
                        <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{formatPrice(goal.currentAmount)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-400 font-medium">Target</div>
                        <div className="font-bold text-sm text-gray-800 dark:text-gray-100">{formatPrice(goal.targetAmount)}</div>
                      </div>
                    </div>

                    {/* Progress Slider Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-gray-500">
                        <span>{pct.toFixed(1)}% complete</span>
                        {!isComplete && <span className="font-mono text-gray-400">{formatPrice(remaining)} left</span>}
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Countdown / Days left pill */}
                    <div className="flex items-center gap-2">
                      <div className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-bold ${
                        isComplete
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/20"
                          : daysLeft < 0
                          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-950/20"
                          : daysLeft <= 30
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-950/20"
                          : "bg-gray-50 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 border"
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        {isComplete
                          ? "Milestone Achieved! 🎉"
                          : daysLeft < 0
                          ? `Overdue by ${Math.abs(daysLeft)} days`
                          : `${daysLeft} days remaining`}
                      </div>
                    </div>

                    {/* Interactive Projections (AI predictions) */}
                    {aiPrediction && (
                      <div className={`p-3 rounded-xl text-xs border transition-all duration-300 ${
                        aiPrediction.status === 'on-track'
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-950/20'
                          : aiPrediction.status === 'lagging'
                          ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-100 dark:border-amber-950/20'
                          : 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-100 dark:border-rose-950/20'
                      }`}>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-2">
                          <BrainCircuit className="w-3.5 h-3.5 text-indigo-500" />
                          Simulated Timeline:
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            aiPrediction.status === 'on-track' ? 'bg-emerald-500 text-white' :
                            aiPrediction.status === 'lagging' ? 'bg-amber-500 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                            {aiPrediction.status === 'on-track' ? 'On Track' : aiPrediction.status === 'lagging' ? 'Lagging' : 'At Risk'}
                          </span>
                        </div>
                        <div className="space-y-1 text-gray-500 dark:text-gray-400 font-medium">
                          <div className="flex justify-between">
                            <span>Estimated Finish:</span>
                            <span className="font-bold text-gray-700 dark:text-gray-300">{aiPrediction.completionDate}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Success Probability:</span>
                            <span className="font-bold text-gray-700 dark:text-gray-300">{aiPrediction.probability}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Target Rate Required:</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(aiPrediction.recommendedMonthlyRate)}/mo</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </div>

                <CardFooter className="pt-2 pb-4 gap-2 flex-col">
                  {/* Quick-deposit & Quick-withdraw Actions */}
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30 font-semibold"
                      onClick={() => openQuickAction(goal, "deposit")}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Deposit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 border-rose-200 dark:border-rose-900/30 font-semibold"
                      onClick={() => openQuickAction(goal, "withdraw")}
                      disabled={goal.currentAmount <= 0}
                    >
                      <Minus className="w-3.5 h-3.5 mr-1" /> Withdraw
                    </Button>
                  </div>

                  {/* Standard Edit & Delete Footer (Smooth opacity transition) */}
                  <div className="flex gap-2 w-full opacity-60 group-hover:opacity-100 transition-opacity pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 flex-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-100 text-xs font-semibold"
                      onClick={() => openEdit(goal)}
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Edit details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/10 text-xs font-semibold"
                      onClick={() => handleDelete(goal.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Main Add/Edit Goal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-1.5">
              <Target className="w-5 h-5 text-blue-600" />
              {editingGoal ? "Edit Savings Goal" : "Create New Goal"}
            </DialogTitle>
            <DialogDescription>
              {editingGoal
                ? "Update the configuration parameters of your savings goal."
                : "Define a savings milestone target and a deadline to begin tracking."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">Goal Name *</Label>
              <Input
                id="goal-name"
                placeholder="e.g. Dream Car, Emergency Fund, Flight ticket..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="target-amount">Target Amount ({currency}) *</Label>
                <Input
                  id="target-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="50000"
                  value={form.targetAmount}
                  onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="current-amount">Current Savings ({currency})</Label>
                <Input
                  id="current-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.currentAmount}
                  onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target-date">Target Deadline Date *</Label>
              <Input
                id="target-date"
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.name.trim() || !form.targetAmount || !form.targetDate}
            >
              {saving ? "Saving…" : editingGoal ? "Save Changes" : "Create Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Quick Action Deposit/Withdraw Dialog */}
      <Dialog open={quickDialogOpen} onOpenChange={setQuickDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-1.5">
              {quickType === "deposit" ? (
                <>
                  <PlusCircle className="w-5 h-5 text-emerald-600" />
                  Deposit Funds
                </>
              ) : (
                <>
                  <Minus className="w-5 h-5 text-rose-600" />
                  Withdraw Funds
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Goal: <span className="font-semibold text-gray-800 dark:text-gray-200">{quickGoal?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-gray-50 dark:bg-zinc-900 p-3 rounded-xl text-xs space-y-1 border">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Balance:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{formatPrice(quickGoal?.currentAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Target Milestone:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{formatPrice(quickGoal?.targetAmount || 0)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-amount">Amount to {quickType === "deposit" ? "Add" : "Subtract"} ({currency})</Label>
              <Input
                id="quick-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="1000"
                autoFocus
                value={quickAmount}
                onChange={(e) => {
                  setQuickAmount(e.target.value);
                  setQuickError(null);
                }}
              />
              {quickError && <p className="text-xs text-red-500 font-semibold">{quickError}</p>}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setQuickDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleQuickSubmit}
              disabled={saving || !quickAmount || parseFloat(quickAmount) <= 0}
              className={quickType === "deposit" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}
            >
              {saving ? "Saving…" : quickType === "deposit" ? "Confirm Deposit" : "Confirm Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
