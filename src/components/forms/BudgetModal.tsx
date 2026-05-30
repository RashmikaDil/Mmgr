"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Budget } from "@/types";
import { useBudgetStore } from "@/store/budgetStore";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const budgetSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetToEdit?: Budget | null;
}

const CATEGORIES = [
  { id: 'cat-exp-1', name: 'Food' },
  { id: 'cat-exp-2', name: 'Transport' },
  { id: 'cat-exp-3', name: 'Utilities' },
  { id: 'cat-exp-4', name: 'Shopping' },
  { id: 'cat-exp-5', name: 'Education' },
  { id: 'cat-exp-6', name: 'Medical' },
  { id: 'cat-exp-7', name: 'Entertainment' },
  { id: 'cat-exp-8', name: 'Fuel' },
  { id: 'cat-exp-9', name: 'Other' },
];

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export function BudgetModal({ isOpen, onClose, budgetToEdit }: BudgetModalProps) {
  const { user } = useAuth();
  const { addBudget, editBudget } = useBudgetStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema) as any,
    defaultValues: {
      categoryId: CATEGORIES[0].id,
      amount: 0,
      month: currentMonth,
      year: currentYear,
    }
  });

  useEffect(() => {
    if (budgetToEdit) {
      reset({
        categoryId: budgetToEdit.categoryId,
        amount: budgetToEdit.amount,
        month: budgetToEdit.month,
        year: budgetToEdit.year,
      });
    } else {
      reset({
        categoryId: CATEGORIES[0].id,
        amount: 0,
        month: currentMonth,
        year: currentYear,
      });
    }
  }, [budgetToEdit, reset, currentMonth, currentYear]);

  const onSubmit = async (data: BudgetFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (budgetToEdit) {
        await editBudget(budgetToEdit.id, data);
      } else {
        await addBudget({
          ...data,
          userId: user.uid,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save budget");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{budgetToEdit ? "Edit Budget" : "Add New Budget"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
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
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Budget Amount</Label>
            <Input id="amount" type="number" step="0.01" {...register("amount")} />
            {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select 
                onValueChange={(value) => setValue("month", parseInt(value || "0"))} 
                value={watch("month").toString()}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.month && <p className="text-sm text-red-500">{errors.month.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input id="year" type="number" {...register("year")} />
              {errors.year && <p className="text-sm text-red-500">{errors.year.message}</p>}
            </div>
          </div>
          
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
