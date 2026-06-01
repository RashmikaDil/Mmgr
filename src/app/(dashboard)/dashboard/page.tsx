"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTransactionStore } from "@/store/transactionStore";
import { useWalletStore } from "@/store/walletStore";
import { useCurrency } from "@/context/CurrencyContext";
import { ArrowDownIcon, ArrowUpIcon, DollarSign, Wallet } from "lucide-react";
import { useEffect, useMemo } from "react";
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
  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (user) {
      fetchTransactions(user.uid);
      fetchWallets(user.uid);
    }
  }, [user, fetchTransactions, fetchWallets]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
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
