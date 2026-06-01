"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTransactionStore } from "@/store/transactionStore";
import { useWalletStore } from "@/store/walletStore";
import { useFixedDepositStore } from "@/store/fixedDepositStore";
import { useCurrency } from "@/context/CurrencyContext";
import { aiService } from "@/services/aiService";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SavingsAccount } from "@/types";
import { ArrowDownIcon, ArrowUpIcon, DollarSign, Wallet, BrainCircuit, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { IncomeExpenseChart } from "@/components/charts/IncomeExpenseChart";
import { CategoryPieChart } from "@/components/charts/CategoryPieChart";
import { format } from "date-fns";

const CATEGORY_NAMES: Record<string, string> = {
  'cat-inc-1': 'Salary', 'cat-inc-2': 'Freelancing', 'cat-inc-3': 'Business', 
  'cat-inc-4': 'Rental', 'cat-inc-5': 'Interest', 'cat-inc-6': 'Dividends', 'cat-inc-7': 'Other',
  'cat-exp-1': 'Food', 'cat-exp-2': 'Transport', 'cat-exp-3': 'Utilities', 
  'cat-exp-4': 'Shopping', 'cat-exp-5': 'Education', 'cat-exp-6': 'Medical', 
  'cat-exp-7': 'Entertainment', 'cat-exp-8': 'Fuel', 'cat-exp-9': 'Other'
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { wallets, fetchWallets } = useWalletStore();
  const { deposits, fetchDeposits } = useFixedDepositStore();
  const { formatPrice } = useCurrency();
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);

  useEffect(() => {
    if (user) {
      fetchTransactions(user.uid);
      fetchWallets(user.uid);
      fetchDeposits(user.uid);
      
      getDocs(query(collection(db, "savingsAccounts"), where("userId", "==", user.uid)))
        .then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavingsAccount)))
        .then((accts) => setSavingsAccounts(accts))
        .catch(() => []);
    }
  }, [user, fetchTransactions, fetchWallets, fetchDeposits]);

  const { totalBalance, totalIncome, totalExpense, netSavings } = useMemo(() => {
    const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);
    
    // For simplicity, calculating totals over all time, in a real app this would be filtered by month
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else totalExpense += t.amount;
    });

    return {
      totalBalance,
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense
    };
  }, [transactions, wallets]);

  const healthData = useMemo(() => {
    return aiService.analyzeFinancialHealth(wallets, savingsAccounts, deposits, transactions);
  }, [wallets, savingsAccounts, deposits, transactions]);

  const insights = useMemo(() => {
    return aiService.generateSpendingInsights(transactions, formatPrice);
  }, [transactions, formatPrice]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 animate-fade-in">
          Welcome back, {user?.displayName?.split(" ")[0] || "User"}!
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Here is your financial overview.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalBalance)}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Across all wallets
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpIcon className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalIncome)}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              All time income
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownIcon className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalExpense)}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              All time expenses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
            <Wallet className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(netSavings)}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Overall savings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Financial Health & Insights Section */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Health Score Card */}
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/25 dark:to-purple-950/15 border-indigo-150 dark:border-indigo-900/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
              <BrainCircuit className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              AI Financial Health Index
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-2">
            <div className="relative flex items-center justify-center">
              {/* Outer Glow Ring */}
              <div className="absolute w-24 h-24 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
              <div className="absolute w-24 h-24 rounded-full border-4 border-transparent border-t-indigo-600 border-r-indigo-500 animate-[spin_6s_linear_infinite]" />
              
              <div className="w-20 h-20 rounded-full bg-white dark:bg-zinc-900 flex flex-col items-center justify-center shadow-inner relative z-10">
                <span className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                  {healthData.score}
                </span>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Score</span>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                healthData.score >= 80 ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300" :
                healthData.score >= 50 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300" :
                "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300"
              }`}>
                {healthData.score >= 80 ? "Excellent" : healthData.score >= 50 ? "Healthy" : "Needs Review"}
              </span>
            </div>

            <ul className="mt-4 space-y-1.5 w-full text-xs text-gray-600 dark:text-gray-300">
              {healthData.recommendations.slice(0, 2).map((rec, i) => (
                <li key={i} className="flex items-start gap-1.5 bg-white/50 dark:bg-zinc-900/40 p-2 rounded-lg border border-indigo-50 dark:border-indigo-950/20">
                  <span className="text-indigo-500 select-none font-bold">💡</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* AI Insights & Alerts Card */}
        <Card className="md:col-span-2 border-indigo-150 dark:border-indigo-900/50 shadow-sm bg-white dark:bg-zinc-950 relative overflow-hidden flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-705 dark:text-gray-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
              Active AI Spend Audits & Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between gap-4">
            {insights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-gray-500">
                <p className="text-sm font-medium">AI Coach is auditing your transaction records...</p>
                <p className="text-xs text-gray-400 mt-0.5">Insights will display as you build transaction histories.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {insights.slice(0, 2).map((insight, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gradient-to-br from-gray-50/50 to-white dark:from-zinc-900/50 dark:to-zinc-900 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {insight.title}
                        </span>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ${
                          insight.color === 'red' ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' :
                          insight.color === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' :
                          'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                        }`}>
                          {insight.impact}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-zinc-350 leading-relaxed">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="border-t border-gray-100 dark:border-zinc-850 pt-3 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live RAG context synced
              </span>
              <a href="/ai-coach" className="hover:underline flex items-center gap-1">
                Open Conversational Coach &rarr;
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <IncomeExpenseChart transactions={transactions} />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
             <CategoryPieChart transactions={transactions} type="expense" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
               <div className="text-center text-gray-500 py-8">No transactions found.</div>
            ) : (
              <div className="space-y-6">
                {transactions.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        t.type === 'income' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-red-100 dark:bg-red-900/20 text-red-600'
                      }`}>
                      {t.type === 'income' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                    </div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{t.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {CATEGORY_NAMES[t.categoryId] || 'Unknown'} • {format(new Date(t.date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className={`ml-auto font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatPrice(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
