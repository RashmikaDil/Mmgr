"use client";

import { useEffect, useState } from "react";
import { Plus, ArrowDown, ArrowUp, MoreVertical, Edit, Trash, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTransactionStore } from "@/store/transactionStore";
import { useCurrency } from "@/context/CurrencyContext";
import { Transaction, TransactionType } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TransactionModal } from "@/components/forms/TransactionModal";
import { format } from "date-fns";

// Hardcoded for display purposes as requested in Phase 3
const CATEGORY_NAMES: Record<string, string> = {
  'cat-inc-1': 'Salary', 'cat-inc-2': 'Freelancing', 'cat-inc-3': 'Business', 
  'cat-inc-4': 'Rental Income', 'cat-inc-5': 'Interest Income', 'cat-inc-6': 'Dividends', 'cat-inc-7': 'Other',
  'cat-exp-1': 'Food', 'cat-exp-2': 'Transport', 'cat-exp-3': 'Utilities', 
  'cat-exp-4': 'Shopping', 'cat-exp-5': 'Education', 'cat-exp-6': 'Medical', 
  'cat-exp-7': 'Entertainment', 'cat-exp-8': 'Fuel', 'cat-exp-9': 'Other'
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const { transactions, loading, fetchTransactions, removeTransaction } = useTransactionStore();
  const { formatPrice } = useCurrency();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [defaultType, setDefaultType] = useState<TransactionType>('expense');

  useEffect(() => {
    if (user) {
      fetchTransactions(user.uid);
    }
  }, [user, fetchTransactions]);

  const handleEdit = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setIsModalOpen(true);
  };

  const handleAddNew = (type: TransactionType) => {
    setTransactionToEdit(null);
    setDefaultType(type);
    setIsModalOpen(true);
  };

  const handleDelete = async (transaction: Transaction) => {
    if (window.confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
      await removeTransaction(transaction);
    }
  };

  if (loading && transactions.length === 0) {
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
            Transactions
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track your income and expenses.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleAddNew('expense')} variant="destructive" className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
          <Button onClick={() => handleAddNew('income')} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Income
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <CardTitle>Recent Transactions</CardTitle>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No transactions found. Add some to get started!
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      t.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/20' : 'bg-red-100 text-red-600 dark:bg-red-900/20'
                    }`}>
                      {t.type === 'income' ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{t.title}</p>
                      <p className="text-sm text-gray-500">{CATEGORY_NAMES[t.categoryId] || 'Unknown'} • {format(new Date(t.date), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-semibold ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatPrice(t.amount)}
                    </span>
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(t)} className="p-2 text-gray-500 hover:text-blue-600 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(t)} className="p-2 text-gray-500 hover:text-red-600 transition-colors">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        transactionToEdit={transactionToEdit} 
        defaultType={defaultType}
      />
    </div>
  );
}
