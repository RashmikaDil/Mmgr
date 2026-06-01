"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Edit, Trash, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBudgetStore } from "@/store/budgetStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useCurrency } from "@/context/CurrencyContext";
import { Budget } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BudgetModal } from "@/components/forms/BudgetModal";
import { Progress } from "@/components/ui/progress";

const CATEGORY_NAMES: Record<string, string> = {
  'cat-exp-1': 'Food', 'cat-exp-2': 'Transport', 'cat-exp-3': 'Utilities', 
  'cat-exp-4': 'Shopping', 'cat-exp-5': 'Education', 'cat-exp-6': 'Medical', 
  'cat-exp-7': 'Entertainment', 'cat-exp-8': 'Fuel', 'cat-exp-9': 'Other'
};

export default function BudgetsPage() {
  const { user } = useAuth();
  const { budgets, loading, fetchBudgets, removeBudget } = useBudgetStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { formatPrice } = useCurrency();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);

  useEffect(() => {
    if (user) {
      fetchBudgets(user.uid);
      if (transactions.length === 0) {
        fetchTransactions(user.uid);
      }
    }
  }, [user, fetchBudgets, fetchTransactions, transactions.length]);

  const handleEdit = (budget: Budget) => {
    setBudgetToEdit(budget);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setBudgetToEdit(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this budget?")) {
      await removeBudget(id);
    }
  };

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const budgetsWithProgress = useMemo(() => {
    return budgets
      .filter(b => b.month === currentMonth && b.year === currentYear)
      .map(budget => {
        // Calculate spent amount for this category in the current month
        const spent = transactions
          .filter(t => t.type === 'expense' && t.categoryId === budget.categoryId)
          .filter(t => {
            const date = new Date(t.date);
            return date.getMonth() + 1 === budget.month && date.getFullYear() === budget.year;
          })
          .reduce((acc, t) => acc + t.amount, 0);

        const progress = Math.min((spent / budget.amount) * 100, 100);
        const isOverBudget = spent > budget.amount;

        return {
          ...budget,
          spent,
          progress,
          isOverBudget
        };
      });
  }, [budgets, transactions, currentMonth, currentYear]);

  const { totalPlanned, totalSpent, totalLeft } = useMemo(() => {
    const totalPlanned = budgetsWithProgress.reduce((acc, b) => acc + b.amount, 0);
    const totalSpent = budgetsWithProgress.reduce((acc, b) => acc + b.spent, 0);
    const totalLeft = totalPlanned - totalSpent;
    return { totalPlanned, totalSpent, totalLeft };
  }, [budgetsWithProgress]);

  if (loading && budgets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Monthly Budgets
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Set spending limits and track your progress.
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Budget
        </Button>
      </div>

      {/* Budget Summary Cards */}
      {budgetsWithProgress.length > 0 && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Budget Planned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatPrice(totalPlanned)}</div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">across {budgetsWithProgress.length} categories</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatPrice(totalSpent)}</div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                {((totalSpent / (totalPlanned || 1)) * 100).toFixed(0)}% of total plan
              </p>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${totalLeft >= 0 ? "from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 border-green-200 dark:border-green-800" : "from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 border-red-200 dark:border-red-800"} col-span-2 lg:col-span-1`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium ${totalLeft >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                {totalLeft >= 0 ? "Total Left" : "Total Overspent"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalLeft >= 0 ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"}`}>
                {formatPrice(Math.abs(totalLeft))}
              </div>
              <p className={`text-xs mt-1 ${totalLeft >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {totalLeft >= 0 ? "remaining to spend" : "exceeded budget limit"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {budgetsWithProgress.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 mb-4 bg-gray-100 rounded-full dark:bg-zinc-800 flex items-center justify-center">
              <Target className="w-6 h-6 text-gray-500" />
            </div>
            <CardTitle className="mb-2">No budgets set for this month</CardTitle>
            <CardDescription className="mb-6">
              Create a budget to start managing your expenses better.
            </CardDescription>
            <Button onClick={handleAddNew}>Create First Budget</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgetsWithProgress.map((budget) => (
            <Card key={budget.id} className="relative overflow-hidden group">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">{CATEGORY_NAMES[budget.categoryId] || 'Unknown'}</CardTitle>
                  <CardDescription>
                    {formatPrice(budget.spent)} / {formatPrice(budget.amount)}
                  </CardDescription>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEdit(budget)}
                    className="p-1.5 text-gray-500 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(budget.id)}
                    className="p-1.5 text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <Progress 
                  value={budget.progress} 
                  className={`h-2 ${budget.isOverBudget ? '[&>div]:bg-red-500' : '[&>div]:bg-blue-600'}`} 
                />
                {budget.isOverBudget && (
                  <p className="text-xs text-red-500 mt-2 font-medium">
                    Over budget by {formatPrice(budget.spent - budget.amount)}
                  </p>
                )}
                {!budget.isOverBudget && (
                  <p className="text-xs text-green-600 mt-2 font-medium">
                    {formatPrice(budget.amount - budget.spent)} left
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BudgetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        budgetToEdit={budgetToEdit} 
      />
    </div>
  );
}
