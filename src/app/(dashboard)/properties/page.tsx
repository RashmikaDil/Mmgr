"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePropertyStore } from "@/store/propertyStore";
import { PropertyAsset } from "@/types";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, TrendingUp, Wallet, ArrowUpRight } from "lucide-react";
import { AddPropertyModal } from "@/components/properties/AddPropertyModal";
import { PropertyCard } from "@/components/properties/PropertyCard";

export default function PropertiesPage() {
  const { user } = useAuth();
  const { properties, loading, fetchProperties } = usePropertyStore();
  const { formatPrice } = useCurrency();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<PropertyAsset | null>(null);

  useEffect(() => {
    if (user) {
      fetchProperties(user.uid);
    }
  }, [user, fetchProperties]);

  const handleEdit = (property: PropertyAsset) => {
    setPropertyToEdit(property);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setPropertyToEdit(null);
    setIsModalOpen(true);
  };

  const totalValue = properties.reduce((sum, p) => sum + (p.aiEstimatedValue || p.currentValue), 0);
  const totalPurchasePrice = properties.reduce((sum, p) => sum + p.purchasePrice, 0);
  const totalGain = totalValue - totalPurchasePrice;
  const totalGainPercent = totalPurchasePrice > 0 ? (totalGain / totalPurchasePrice) * 100 : 0;

  if (loading && properties.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Properties & Assets</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track physical assets and get real-time AI valuations.</p>
        </div>
        <Button onClick={handleAddNew} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="mr-2 h-4 w-4" /> Add Asset
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            <Wallet className="h-4 w-4" />
            <span>Total Asset Value</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatPrice(totalValue)}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            <TrendingUp className="h-4 w-4" />
            <span>Total Gain / Loss</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-3xl font-bold ${totalGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {totalGain > 0 ? '+' : ''}{formatPrice(totalGain)}
            </span>
            <span className={`flex items-center text-sm font-medium ${totalGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totalGain > 0 && <ArrowUpRight className="h-4 w-4 mr-1" />}
              {totalGainPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            <MapPin className="h-4 w-4" />
            <span>Tracked Assets</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {properties.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {properties.map(property => (
          <PropertyCard key={property.id} property={property} onEdit={handleEdit} />
        ))}
      </div>

      {properties.length === 0 && !loading && (
        <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-800">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No properties yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
            Add your vehicles, real estate, land, and valuables to track their value and get AI-powered market estimates.
          </p>
          <Button onClick={handleAddNew} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Add Your First Asset
          </Button>
        </div>
      )}

      <AddPropertyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        propertyToEdit={propertyToEdit} 
      />
    </div>
  );
}
