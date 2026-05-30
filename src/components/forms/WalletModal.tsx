"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wallet, WalletType } from "@/types";
import { useWalletStore } from "@/store/walletStore";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const walletSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(['Cash', 'Bank Account', 'Savings Account', 'Fixed Deposit', 'Digital Wallet', 'Investment Account', 'Other']),
  balance: z.coerce.number(),
  currency: z.string().min(1, "Currency is required"),
});

type WalletFormValues = z.infer<typeof walletSchema>;

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletToEdit?: Wallet | null;
}

const WALLET_TYPES: WalletType[] = ['Cash', 'Bank Account', 'Savings Account', 'Fixed Deposit', 'Digital Wallet', 'Investment Account', 'Other'];

export function WalletModal({ isOpen, onClose, walletToEdit }: WalletModalProps) {
  const { user } = useAuth();
  const { addWallet, editWallet } = useWalletStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<WalletFormValues>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      name: "",
      type: "Bank Account",
      balance: 0,
      currency: "USD",
    }
  });

  useEffect(() => {
    if (walletToEdit) {
      reset({
        name: walletToEdit.name,
        type: walletToEdit.type,
        balance: walletToEdit.balance,
        currency: walletToEdit.currency,
      });
    } else {
      reset({
        name: "",
        type: "Bank Account",
        balance: 0,
        currency: "USD",
      });
    }
  }, [walletToEdit, reset]);

  const onSubmit = async (data: WalletFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (walletToEdit) {
        await editWallet(walletToEdit.id, data);
      } else {
        await addWallet({
          ...data,
          userId: user.uid,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save wallet");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{walletToEdit ? "Edit Wallet" : "Add New Wallet"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Wallet Name</Label>
            <Input id="name" placeholder="e.g. Main Chase Account" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Wallet Type</Label>
            <Select 
              onValueChange={(value) => setValue("type", value as WalletType)} 
              defaultValue={walletToEdit?.type || "Bank Account"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {WALLET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Initial Balance</Label>
              <Input id="balance" type="number" step="0.01" {...register("balance")} />
              {errors.balance && <p className="text-sm text-red-500">{errors.balance.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" placeholder="USD" {...register("currency")} />
              {errors.currency && <p className="text-sm text-red-500">{errors.currency.message}</p>}
            </div>
          </div>
          
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Wallet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
