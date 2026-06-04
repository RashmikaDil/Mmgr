"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTransactionStore } from "@/store/transactionStore";
import { useWalletStore } from "@/store/walletStore";
import { useFixedDepositStore } from "@/store/fixedDepositStore";
import { useBudgetStore } from "@/store/budgetStore";
import { useCurrency } from "@/context/CurrencyContext";
import { aiService } from "@/services/aiService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { BrainCircuit, TrendingUp, TrendingDown, Minus, Sparkles, BarChart3 } from "lucide-react";

const CONFIDENCE_COLORS = {
  high: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400",
  medium: "text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400",
  low: "text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400",
};

export default function ReportsPage() {
  const { user } = useAuth();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { wallets, fetchWallets } = useWalletStore();
  const { deposits, fetchDeposits } = useFixedDepositStore();
  const { budgets, fetchBudgets } = useBudgetStore();
  const { formatPrice } = useCurrency();

  const [activeTab, setActiveTab] = useState<"forecast" | "budget" | "breakdown">("forecast");

  useEffect(() => {
    if (user) {
      fetchTransactions(user.uid);
      fetchWallets(user.uid);
      fetchDeposits(user.uid);
      fetchBudgets(user.uid);
    }
  }, [user, fetchTransactions, fetchWallets, fetchDeposits, fetchBudgets]);

  // Monthly income for budget planner
  const currentMonthIncome = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === "income" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const monthlySavingsRate = useMemo(() => {
    const now = new Date();
    const income = transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === "income" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === "expense" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, t) => s + t.amount, 0);
    return income > 0 ? ((income - expense) / income) * 100 : 0;
  }, [transactions]);

  const forecast = useMemo(() => aiService.forecastNextMonth(transactions), [transactions]);
  const budgetPlan = useMemo(() => aiService.generateBudgetPlan(transactions, currentMonthIncome), [transactions, currentMonthIncome]);
  const notifications = useMemo(() =>
    aiService.generateSmartNotifications(transactions, deposits, budgets, monthlySavingsRate, formatPrice),
    [transactions, deposits, budgets, monthlySavingsRate, formatPrice]
  );

  // Category breakdown for current month
  const categoryBreakdown = useMemo(() => {
    const now = new Date();
    const catTotals: Record<string, number> = {};
    transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === "expense" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .forEach(t => { catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount; });

    const catNames: Record<string, string> = {
      'cat-exp-1': 'Food', 'cat-exp-2': 'Transport', 'cat-exp-3': 'Utilities',
      'cat-exp-4': 'Shopping', 'cat-exp-5': 'Education', 'cat-exp-6': 'Medical',
      'cat-exp-7': 'Entertainment', 'cat-exp-8': 'Fuel', 'cat-exp-9': 'Other'
    };

    return Object.entries(catTotals)
      .map(([id, amount]) => ({ name: catNames[id] || id, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [transactions]);

  const TABS = [
    { id: "forecast", label: "📈 AI Forecast", icon: TrendingUp },
    { id: "budget", label: "🎯 AI Budget Plan", icon: BarChart3 },
    { id: "breakdown", label: "📊 Spend Breakdown", icon: Sparkles },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
          AI Financial Reports
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200">
            Powered by AI
          </span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Moving-average forecasts, intelligent budget plans, and AI-generated monthly narratives.
        </p>
      </div>

      {/* Smart Notifications */}
      <div className="space-y-2">
        {notifications.map(n => (
          <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl border text-sm font-medium ${
            n.type === 'danger' ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-300' :
            n.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-300' :
            n.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
            'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-300'
          }`}>
            <span className="text-lg">{n.icon}</span>
            <div>
              <div className="font-bold">{n.title}</div>
              <div className="text-xs font-normal opacity-80 mt-0.5">{n.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab.id
                ? "bg-white dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Forecast */}
      {activeTab === "forecast" && (
        <div className="space-y-4">
          {/* Forecast KPI row */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-1"><CardTitle className="text-xs font-semibold text-blue-700 dark:text-blue-300">Forecast Income</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-blue-900 dark:text-blue-100">{formatPrice(forecast.forecastedIncome)}</div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">next month estimate</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800">
              <CardHeader className="pb-1"><CardTitle className="text-xs font-semibold text-red-700 dark:text-red-300">Forecast Expenses</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-red-900 dark:text-red-100">{formatPrice(forecast.forecastedExpense)}</div>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">next month estimate</p>
              </CardContent>
            </Card>
            <Card className={`bg-gradient-to-br border ${forecast.forecastedSavings >= 0 ? "from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800" : "from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800"}`}>
              <CardHeader className="pb-1"><CardTitle className={`text-xs font-semibold ${forecast.forecastedSavings >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>Forecast Savings</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-2xl font-extrabold ${forecast.forecastedSavings >= 0 ? "text-emerald-900 dark:text-emerald-100" : "text-red-900 dark:text-red-100"}`}>
                  {formatPrice(Math.abs(forecast.forecastedSavings))}
                </div>
                <p className={`text-xs mt-0.5 ${forecast.forecastedSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {forecast.forecastedSavings >= 0 ? "surplus projected" : "shortfall projected"}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
              <CardHeader className="pb-1"><CardTitle className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Model Confidence</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-xs font-extrabold px-2 py-1 rounded-full w-fit mt-1 ${CONFIDENCE_COLORS[forecast.confidence]}`}>
                  {forecast.confidence.toUpperCase()}
                </div>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">3-month moving avg</p>
              </CardContent>
            </Card>
          </div>

          {/* Forecast chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-indigo-500" />
                Income vs Expenses + AI Forecast
              </CardTitle>
              <CardDescription className="text-xs">
                Shaded column represents the AI-predicted next month. Historical data drives the 3-month moving average model.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {forecast.monthlyData.length < 2 ? (
                <div className="h-48 flex items-center justify-center text-sm text-gray-400">
                  Add more transactions to generate a multi-month forecast chart.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={forecast.monthlyData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-zinc-800" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatPrice(v).replace(/\s/g, '')} />
                    <Tooltip
                      formatter={(val: any, name: any) => [formatPrice(Number(val) || 0), String(name)]}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                      labelFormatter={(label, payload) => {
                        const isPredicted = payload?.[0]?.payload?.predicted;
                        return isPredicted ? `${label} 🤖 (AI Forecast)` : label;
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="income" name="Income" stroke="#6366f1" fill="url(#incomeGrad)" strokeWidth={2} dot={{ r: 3 }} />
                    <Area type="monotone" dataKey="expense" name="Expenses" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Budget Plan */}
      {activeTab === "budget" && (
        <div className="space-y-4">
          {/* Health Score */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/25 dark:to-purple-950/15 border-indigo-150 dark:border-indigo-900/50 md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4" /> Budget Health Score
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3 pt-2">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-24 h-24 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
                  <div className="absolute w-24 h-24 rounded-full border-4 border-transparent border-t-indigo-600 border-r-indigo-500 animate-[spin_6s_linear_infinite]" />
                  <div className="w-20 h-20 rounded-full bg-white dark:bg-zinc-900 flex flex-col items-center justify-center shadow-inner relative z-10">
                    <span className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">{budgetPlan.healthScore}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">/ 100</span>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  budgetPlan.healthScore >= 80 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" :
                  budgetPlan.healthScore >= 60 ? "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300" :
                  budgetPlan.healthScore >= 40 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300" :
                  "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                }`}>{budgetPlan.healthLabel}</span>
                <div className="space-y-1.5 w-full">
                  <div className="flex justify-between text-xs bg-white dark:bg-zinc-900 px-3 py-2 rounded-lg border border-gray-100 dark:border-zinc-800">
                    <span className="text-gray-600 dark:text-gray-300">Savings Target</span>
                    <span className="font-bold text-emerald-600">{formatPrice(budgetPlan.savingsTarget)}</span>
                  </div>
                  <div className="flex justify-between text-xs bg-white dark:bg-zinc-900 px-3 py-2 rounded-lg border border-gray-100 dark:border-zinc-800">
                    <span className="text-gray-600 dark:text-gray-300">Emergency Fund</span>
                    <span className="font-bold text-blue-600">{formatPrice(budgetPlan.emergencyContribution)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">{budgetPlan.summary}</p>
              </CardContent>
            </Card>

            {/* Allocation Table */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                  AI Budget Allocation (50/30/20 Rule)
                </CardTitle>
                <CardDescription className="text-xs">
                  Recommended limits vs. your current month actual spending.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {budgetPlan.allocations.map(a => (
                    <div key={a.categoryId} className="flex items-center gap-3">
                      <span className="text-xs font-semibold w-20 shrink-0 text-gray-600 dark:text-gray-300">{a.name}</span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            a.status === 'over' ? 'bg-red-500' :
                            a.status === 'under' ? 'bg-amber-400' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${Math.min(100, a.recommended > 0 ? (a.current / a.recommended) * 100 : 0)}%` }}
                        />
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-bold ${
                          a.status === 'over' ? 'text-red-600 dark:text-red-400' :
                          a.status === 'under' && a.current > 0 ? 'text-amber-600 dark:text-amber-400' :
                          'text-indigo-600 dark:text-indigo-400'
                        }`}>{formatPrice(a.current)}</span>
                        <span className="text-[10px] text-gray-400 block">/ {formatPrice(a.recommended)}</span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
                        a.status === 'over' ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300' :
                        a.status === 'under' && a.current > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                      }`}>
                        {a.status === 'over' ? 'OVER' : a.status === 'under' && a.current > 0 ? 'UNDER' : 'OK'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Spend Breakdown */}
      {activeTab === "breakdown" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              Current Month — Expense Breakdown by Category
            </CardTitle>
            <CardDescription className="text-xs">
              Visual breakdown of where your money went this month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">
                No expenses recorded this month yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={categoryBreakdown} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-zinc-800" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatPrice(v).replace(/\s/g, '')} />
                  <Tooltip
                    formatter={(val: any) => [formatPrice(Number(val) || 0), "Spent"]}
                    contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                  />
                  <Bar dataKey="amount" name="Amount Spent" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
