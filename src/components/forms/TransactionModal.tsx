"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Transaction, TransactionType } from "@/types";
import { useTransactionStore } from "@/store/transactionStore";
import { useWalletStore } from "@/store/walletStore";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const transactionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  type: z.enum(['income', 'expense']),
  walletId: z.string().min(1, "Wallet is required"),
  categoryId: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  isRecurring: z.boolean().default(false),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
  defaultType?: TransactionType;
}

const CATEGORIES = {
  income: [
    { id: 'cat-inc-1', name: 'Salary' },
    { id: 'cat-inc-2', name: 'Freelancing' },
    { id: 'cat-inc-3', name: 'Business' },
    { id: 'cat-inc-4', name: 'Rental Income' },
    { id: 'cat-inc-5', name: 'Interest Income' },
    { id: 'cat-inc-6', name: 'Dividends' },
    { id: 'cat-inc-7', name: 'Other' },
  ],
  expense: [
    { id: 'cat-exp-1', name: 'Food' },
    { id: 'cat-exp-2', name: 'Transport' },
    { id: 'cat-exp-3', name: 'Utilities' },
    { id: 'cat-exp-4', name: 'Shopping' },
    { id: 'cat-exp-5', name: 'Education' },
    { id: 'cat-exp-6', name: 'Medical' },
    { id: 'cat-exp-7', name: 'Entertainment' },
    { id: 'cat-exp-8', name: 'Fuel' },
    { id: 'cat-exp-9', name: 'Other' },
  ]
};

export function TransactionModal({ isOpen, onClose, transactionToEdit, defaultType = 'expense' }: TransactionModalProps) {
  const { user } = useAuth();
  const { addTransaction, editTransaction } = useTransactionStore();
  const { wallets, fetchWallets } = useWalletStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      type: defaultType,
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
    }
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (user && wallets.length === 0) {
      fetchWallets(user.uid);
    }
  }, [user, wallets.length, fetchWallets]);

  useEffect(() => {
    if (transactionToEdit) {
      reset({
        title: transactionToEdit.title,
        amount: transactionToEdit.amount,
        type: transactionToEdit.type,
        walletId: transactionToEdit.walletId,
        categoryId: transactionToEdit.categoryId,
        date: transactionToEdit.date,
        notes: transactionToEdit.notes || "",
        isRecurring: transactionToEdit.isRecurring,
      });
    } else {
      reset({
        title: "",
        amount: 0,
        type: defaultType,
        walletId: wallets.length > 0 ? wallets[0].id : "",
        categoryId: CATEGORIES[defaultType][0].id,
        date: new Date().toISOString().split('T')[0],
        notes: "",
        isRecurring: false,
      });
    }
  }, [transactionToEdit, reset, defaultType, wallets]);

  const onSubmit = async (data: TransactionFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (transactionToEdit) {
        await editTransaction(transactionToEdit.id, data, transactionToEdit);
      } else {
        await addTransaction({
          ...data,
          userId: user.uid,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-screen">
        <DialogHeader>
          <DialogTitle>{transactionToEdit ? "Edit Transaction" : `Add New ${selectedType === 'income' ? 'Income' : 'Expense'}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          <div className="flex gap-4 mb-4">
            <Button 
              type="button" 
              variant={selectedType === 'expense' ? 'default' : 'outline'}
              className={`flex-1 ${selectedType === 'expense' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
              onClick={() => {
                setValue('type', 'expense');
                setValue('categoryId', CATEGORIES.expense[0].id);
              }}
            >
              Expense
            </Button>
            <Button 
              type="button" 
              variant={selectedType === 'income' ? 'default' : 'outline'}
              className={`flex-1 ${selectedType === 'income' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
              onClick={() => {
                setValue('type', 'income');
                setValue('categoryId', CATEGORIES.income[0].id);
              }}
            >
              Income
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="e.g. Groceries" {...register("title")} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount")} />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="walletId">Wallet</Label>
            <Select 
              onValueChange={(value) => setValue("walletId", value || "")} 
              value={watch("walletId")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name} ({w.balance})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.walletId && <p className="text-sm text-red-500">{errors.walletId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <Select 
              onValueChange={(value) => setValue("categoryId", value || "")} 
              value={watch("categoryId")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES[selectedType].map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea id="notes" placeholder="Any details..." {...register("notes")} />
          </div>

          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="isRecurring" 
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              {...register("isRecurring")} 
            />
            <Label htmlFor="isRecurring" className="font-normal cursor-pointer">
              Recurring Transaction
            </Label>
          </div>
          
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
