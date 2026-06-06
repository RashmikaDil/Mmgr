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

const propertySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(['Vehicle', 'Land', 'Real Estate', 'Valuable', 'Other']),
  purchasePrice: z.coerce.number().min(0, "Price must be positive"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  location: z.string().optional(),
  description: z.string().optional(),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyToEdit?: PropertyAsset | null;
}

const PROPERTY_TYPES = ['Vehicle', 'Land', 'Real Estate', 'Valuable', 'Other'];

export function AddPropertyModal({ isOpen, onClose, propertyToEdit }: AddPropertyModalProps) {
  const { user } = useAuth();
  const { addProperty, editProperty } = usePropertyStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema) as any,
    defaultValues: {
      name: "",
      type: "Vehicle",
      purchasePrice: 0,
      purchaseDate: new Date().toISOString().slice(0, 10),
      location: "",
      description: "",
    }
  });

  useEffect(() => {
    if (propertyToEdit) {
      reset({
        name: propertyToEdit.name,
        type: propertyToEdit.type,
        purchasePrice: propertyToEdit.purchasePrice,
        purchaseDate: propertyToEdit.purchaseDate,
        location: propertyToEdit.location || "",
        description: propertyToEdit.description || "",
      });
    } else {
      reset({
        name: "",
        type: "Vehicle",
        purchasePrice: 0,
        purchaseDate: new Date().toISOString().slice(0, 10),
        location: "",
        description: "",
      });
    }
  }, [propertyToEdit, reset]);

  const onSubmit = async (data: PropertyFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (propertyToEdit) {
        await editProperty(propertyToEdit.id, {
          ...data,
          currentValue: propertyToEdit.currentValue // retain current value on edit unless specifically updating it
        });
      } else {
        await addProperty({
          ...data,
          userId: user.uid,
          currentValue: data.purchasePrice, // Initially set to purchase price
        });
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{propertyToEdit ? "Edit Property" : "Add New Property"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Property Name</Label>
            <Input id="name" placeholder="e.g. 2022 Toyota Camry" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Property Type</Label>
            <Select 
              onValueChange={(value) => setValue("type", value as any)} 
              defaultValue={propertyToEdit?.type || "Vehicle"}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price</Label>
              <Input id="purchasePrice" type="number" step="1" {...register("purchasePrice")} />
              {errors.purchasePrice && <p className="text-sm text-red-500">{errors.purchasePrice.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
              {errors.purchaseDate && <p className="text-sm text-red-500">{errors.purchaseDate.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input id="location" placeholder="e.g. Colombo, Sri Lanka" {...register("location")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" placeholder="Any relevant details for valuation..." {...register("description")} />
          </div>
          
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Property"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
