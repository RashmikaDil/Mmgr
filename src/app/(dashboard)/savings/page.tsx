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
import { PlusCircle, Target, Pencil, Trash2, TrendingUp, CheckCircle2, Clock, BrainCircuit } from "lucide-react";
import { aiService } from "@/services/aiService";
import { format, differenceInDays } from "date-fns";

// ── helpers ────────────────────────────────────────────────────────────────────

function getProgressColor(pct: number) {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 60) return "bg-blue-500";
  if (pct >= 30) return "bg-yellow-500";
  return "bg-red-400";
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

// ── main component ─────────────────────────────────────────────────────────────

export default function SavingsPage() {
  const { user } = useAuth();
  const { goals, loading, fetchGoals, addGoal, updateGoal, deleteGoal } =
    useSavingsGoalStore();
  const { currency, formatPrice } = useCurrency();

  const [open, setOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.uid) fetchGoals(user.uid);
  }, [user, fetchGoals]);

  // ── derived stats ────────────────────────────────────────────────────────────

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const completedGoals = goals.filter((g) => g.currentAmount >= g.targetAmount).length;
  const overallPct = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;

  // ── handlers ─────────────────────────────────────────────────────────────────

  function openAdd() {
    setEditingGoal(null);
    setForm(EMPTY_FORM);
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
    if (confirm("Delete this savings goal?")) await deleteGoal(id);
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Savings & Goals</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track your savings progress toward every financial milestone.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 self-start sm:self-auto">
          <PlusCircle className="w-4 h-4" />
          Add Goal
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {formatPrice(totalSaved)}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">across all goals</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {formatPrice(totalTarget)}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">combined target</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {completedGoals} / {goals.length}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">goals reached</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {overallPct.toFixed(1)}%
            </div>
            <Progress value={overallPct} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Goals grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-52">
              <CardContent />
            </Card>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-gray-400">
            <Target className="w-12 h-12 opacity-30" />
            <p className="text-lg font-medium">No savings goals yet</p>
            <p className="text-sm">Create your first goal to start tracking your savings journey.</p>
            <Button variant="outline" onClick={openAdd} className="mt-2 gap-2">
              <PlusCircle className="w-4 h-4" />
              Create Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const daysLeft = getDaysLeft(goal.targetDate);
            const isComplete = goal.currentAmount >= goal.targetAmount;
            const remaining = goal.targetAmount - goal.currentAmount;

            // AI prediction — use conservative 10% of target as assumed monthly rate if nothing known
            const estimatedMonthlyRate = goals.length > 0 ? (totalSaved / Math.max(goals.length, 1)) * 0.1 : 500;
            const aiPrediction = !isComplete ? aiService.predictGoal(goal, estimatedMonthlyRate) : null;

            return (
              <Card
                key={goal.id}
                className="relative overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 group"
              >
                {/* completion badge */}
                {isComplete && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                )}

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base leading-tight">{goal.name}</CardTitle>
                        <CardDescription className="text-xs">
                          Target by {format(new Date(goal.targetDate), "dd MMM yyyy")}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Saved</div>
                      <div className="font-semibold text-green-600">{formatPrice(goal.currentAmount)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Target</div>
                      <div className="font-semibold">{formatPrice(goal.targetAmount)}</div>
                    </div>
                  </div>

                  {/* coloured progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{pct.toFixed(1)}% complete</span>
                      {!isComplete && <span>{formatPrice(remaining)} left</span>}
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* days remaining */}
                  <div className={`flex items-center gap-1.5 text-xs ${daysLeft < 0 ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
                    <Clock className="w-3 h-3" />
                    {isComplete
                      ? "Goal achieved! 🎉"
                      : daysLeft < 0
                      ? `Overdue by ${Math.abs(daysLeft)} days`
                      : `${daysLeft} days remaining`}
                  </div>

                  {/* AI Prediction panel */}
                  {aiPrediction && (
                    <div className={`mt-3 p-3 rounded-xl text-xs border ${
                      aiPrediction.status === 'on-track'
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
                        : aiPrediction.status === 'lagging'
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30'
                        : 'bg-red-50/60 dark:bg-red-950/20 border-red-100 dark:border-red-900/30'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold mb-2 text-gray-700 dark:text-gray-300">
                        <BrainCircuit className="w-3.5 h-3.5 text-indigo-500" />
                        AI Prediction
                        <span className={`ml-auto px-1.5 py-0.5 rounded-full font-extrabold uppercase tracking-wide text-[9px] ${
                          aiPrediction.status === 'on-track' ? 'bg-emerald-500 text-white' :
                          aiPrediction.status === 'lagging' ? 'bg-amber-500 text-white' :
                          'bg-red-500 text-white'
                        }`}>
                          {aiPrediction.status === 'on-track' ? 'On Track' : aiPrediction.status === 'lagging' ? 'Lagging' : 'At Risk'}
                        </span>
                      </div>
                      <div className="space-y-1 text-gray-600 dark:text-gray-400">
                        <div className="flex justify-between">
                          <span>Success probability</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">{aiPrediction.probability}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Est. completion</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">{aiPrediction.completionDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Suggested monthly</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(aiPrediction.recommendedMonthlyRate)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-0 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 flex-1"
                    onClick={() => openEdit(goal)}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1 flex-1"
                    onClick={() => handleDelete(goal.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit Savings Goal" : "New Savings Goal"}</DialogTitle>
            <DialogDescription>
              {editingGoal
                ? "Update the details of your savings goal."
                : "Set a target and start tracking your savings journey."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">Goal Name</Label>
              <Input
                id="goal-name"
                placeholder="e.g. Emergency Fund, New Car…"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="target-amount">Target Amount ({currency})</Label>
                <Input
                  id="target-amount"
                  type="number"
                  min="0"
                  placeholder="50000"
                  value={form.targetAmount}
                  onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="current-amount">Saved So Far ({currency})</Label>
                <Input
                  id="current-amount"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.currentAmount}
                  onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target-date">Target Date</Label>
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
              disabled={saving || !form.name || !form.targetAmount || !form.targetDate}
            >
              {saving ? "Saving…" : editingGoal ? "Save Changes" : "Create Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
