"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PropertyAsset } from "@/types";
import { usePropertyStore } from "@/store/propertyStore";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useWalletStore } from "@/store/walletStore";
import { transactionService } from "@/services/transactionService";

const propertySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(['Vehicle', 'Land', 'Real Estate', 'Valuable', 'Other']),
  currency: z.string().min(1, "Currency is required"),
  condition: z.enum(['Pristine', 'Excellent', 'Good', 'Fair', 'Poor']).optional(),
  assetIdentifier: z.string().optional(),
  purchasePrice: z.coerce.number().min(0, "Price must be positive"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  currentValue: z.coerce.number().min(0, "Current value must be positive"),
  enableAutoValuation: z.boolean(),
  liquidityScore: z.enum(['High', 'Medium', 'Low']).optional(),
  expectedYield: z.coerce.number().optional(),
  projectionModel: z.enum(['straight-line', 'historical', 'none']).optional(),
  linkedLiabilityId: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  walletId: z.string().optional(),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyToEdit?: PropertyAsset | null;
}

const PROPERTY_TYPES = ['Vehicle', 'Land', 'Real Estate', 'Valuable', 'Other'];
const CONDITIONS = ['Pristine', 'Excellent', 'Good', 'Fair', 'Poor'];
const LIQUIDITY_SCORES = ['High', 'Medium', 'Low'];
const PROJECTION_MODELS = ['none', 'straight-line', 'historical'];

export function AddPropertyModal({ isOpen, onClose, propertyToEdit }: AddPropertyModalProps) {
  const { user } = useAuth();
  const { addProperty, editProperty } = usePropertyStore();
  const { wallets, fetchWallets } = useWalletStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const { register, handleSubmit, reset, setValue, watch, trigger, formState: { errors } } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema) as any,
    defaultValues: {
      name: "",
      type: "Vehicle",
      currency: "USD",
      purchasePrice: 0,
      currentValue: 0,
      purchaseDate: new Date().toISOString().slice(0, 10),
      enableAutoValuation: false,
      projectionModel: "none",
      location: "",
      description: "",
      walletId: "none",
    }
  });

  const watchEnableAutoValuation = watch("enableAutoValuation");

  useEffect(() => {
    if (isOpen && user && wallets.length === 0) {
      fetchWallets(user.uid);
    }
  }, [isOpen, user, fetchWallets, wallets.length]);

  useEffect(() => {
    if (propertyToEdit) {
      reset({
        name: propertyToEdit.name,
        type: propertyToEdit.type,
        currency: propertyToEdit.currency || "USD",
        condition: propertyToEdit.condition,
        assetIdentifier: propertyToEdit.assetIdentifier || "",
        purchasePrice: propertyToEdit.purchasePrice,
        currentValue: propertyToEdit.currentValue,
        purchaseDate: propertyToEdit.purchaseDate,
        enableAutoValuation: propertyToEdit.enableAutoValuation || false,
        liquidityScore: propertyToEdit.liquidityScore,
        expectedYield: propertyToEdit.expectedYield || 0,
        projectionModel: propertyToEdit.projectionModel || "none",
        linkedLiabilityId: propertyToEdit.linkedLiabilityId || "",
        location: propertyToEdit.location || "",
        description: propertyToEdit.description || "",
      });
    } else {
      reset({
        name: "",
        type: "Vehicle",
        currency: "USD",
        purchasePrice: 0,
        currentValue: 0,
        purchaseDate: new Date().toISOString().slice(0, 10),
        enableAutoValuation: false,
        projectionModel: "none",
        location: "",
        description: "",
        walletId: "none",
      });
    }
    setStep(1);
    setError(null);
  }, [propertyToEdit, reset, isOpen]);

  const handleNext = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await trigger(['name', 'type', 'assetIdentifier', 'condition', 'location']);
    } else if (step === 2) {
      isValid = await trigger(['purchasePrice', 'currentValue', 'currency', 'purchaseDate']);
    }
    
    if (isValid) {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    setStep(s => Math.max(1, s - 1));
  };

  const onSubmit = async (data: PropertyFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { walletId, ...propertyData } = data;
      
      if (propertyToEdit) {
        await editProperty(propertyToEdit.id, {
          ...propertyData,
          currentValue: data.currentValue
        });
      } else {
        await addProperty({
          ...propertyData,
          userId: user.uid,
          currentValue: data.currentValue || data.purchasePrice,
        });

        if (data.walletId && data.walletId !== "none" && data.purchasePrice > 0) {
          await transactionService.createTransaction({
            userId: user.uid,
            walletId: data.walletId,
            type: "expense",
            title: `Purchased ${data.name}`,
            amount: data.purchasePrice,
            categoryId: "cat-exp-9",
            date: data.purchaseDate,
            isRecurring: false,
            notes: `Auto-generated from property purchase: ${data.name}`
          });
          await fetchWallets(user.uid);
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save property");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{propertyToEdit ? "Edit Property" : "Add New Property"}</DialogTitle>
          <p className="text-sm text-muted-foreground">Step {step} of 3</p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label htmlFor="name">Asset Name <span className="text-red-500">*</span></Label>
                <Input id="name" placeholder="e.g. 2022 Toyota Camry" {...register("name")} />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Asset Type <span className="text-red-500">*</span></Label>
                  <Select 
                    onValueChange={(value) => setValue("type", value as any)} 
                    defaultValue={watch("type") || "Vehicle"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Select 
                    onValueChange={(value) => setValue("condition", value as any)} 
                    defaultValue={watch("condition") || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((cond) => (
                        <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assetIdentifier">Identifier (VIN, Deed #, Serial)</Label>
                <Input id="assetIdentifier" placeholder="Optional identifier" {...register("assetIdentifier")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <Input id="location" placeholder="e.g. Colombo, Sri Lanka" {...register("location")} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency <span className="text-red-500">*</span></Label>
                  <Input id="currency" placeholder="USD" {...register("currency")} />
                  {errors.currency && <p className="text-sm text-red-500">{errors.currency.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Purchase Date <span className="text-red-500">*</span></Label>
                  <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
                  {errors.purchaseDate && <p className="text-sm text-red-500">{errors.purchaseDate.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price <span className="text-red-500">*</span></Label>
                  <Input id="purchasePrice" type="number" step="0.01" {...register("purchasePrice")} onChange={(e) => {
                    register("purchasePrice").onChange(e);
                    if (watch("currentValue") === 0) {
                      setValue("currentValue", parseFloat(e.target.value) || 0);
                    }
                  }} />
                  {errors.purchasePrice && <p className="text-sm text-red-500">{errors.purchasePrice.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currentValue">Current Est. Value <span className="text-red-500">*</span></Label>
                  <Input id="currentValue" type="number" step="0.01" {...register("currentValue")} />
                  {errors.currentValue && <p className="text-sm text-red-500">{errors.currentValue.message}</p>}
                </div>
              </div>

              {!propertyToEdit && (
                <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md border">
                  <Label htmlFor="walletId">Fund Purchase from Wallet</Label>
                  <Select 
                    onValueChange={(value) => setValue("walletId", value || undefined)} 
                    defaultValue={watch("walletId") || "none"}
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-800">
                      <SelectValue placeholder="Select wallet to deduct funds" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Do not deduct from wallet</SelectItem>
                      {wallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          {wallet.name} ({wallet.balance.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">If selected, an expense transaction will be created.</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              
              <div className="p-3 border rounded-md space-y-3 bg-blue-50/50 dark:bg-blue-900/10">
                <div className="space-y-1">
                  <Label>AI Auto-Valuation</Label>
                  <p className="text-xs text-muted-foreground">Allow WealthTracker to estimate current value based on market trends (requires valid Location/Identifier).</p>
                </div>
                <Select 
                  onValueChange={(value) => setValue("enableAutoValuation", value === "yes")} 
                  defaultValue={watchEnableAutoValuation ? "yes" : "no"}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Enable auto-valuation?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">Disabled - I will update manually</SelectItem>
                    <SelectItem value="yes">Enabled - Use AI APIs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="liquidityScore">Liquidity Score</Label>
                  <Select 
                    onValueChange={(value) => setValue("liquidityScore", value as any)} 
                    defaultValue={watch("liquidityScore") || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select liquidity" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIQUIDITY_SCORES.map((score) => (
                        <SelectItem key={score} value={score}>{score}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">Used for FIRE planning.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectionModel">Appreciation Model</Label>
                  <Select 
                    onValueChange={(value) => setValue("projectionModel", value as any)} 
                    defaultValue={watch("projectionModel") || "none"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECTION_MODELS.map((model) => (
                        <SelectItem key={model} value={model}>{model.replace('-', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedYield">Expected Annual Yield (%)</Label>
                <Input id="expectedYield" type="number" step="0.1" placeholder="e.g. 5.0" {...register("expectedYield")} />
                <p className="text-[10px] text-muted-foreground">For rental properties or dividend-generating assets.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Notes (Optional)</Label>
                <Textarea id="description" placeholder="Any relevant details..." {...register("description")} />
              </div>
            </div>
          )}
          
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>}

          <div className="flex justify-between pt-4 mt-4 border-t">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting}>
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
            
            {step < 3 ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Asset"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
