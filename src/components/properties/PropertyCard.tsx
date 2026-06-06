"use client";

import { useState } from "react";
import { PropertyAsset } from "@/types";
import { usePropertyStore } from "@/store/propertyStore";
import { aiValuationService } from "@/services/aiValuationService";
import { useCurrency } from "@/context/CurrencyContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Car, Home, Gem, Package, Sparkles, TrendingUp, TrendingDown, Edit, Trash2 } from "lucide-react";

interface PropertyCardProps {
  property: PropertyAsset;
  onEdit: (property: PropertyAsset) => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'Vehicle': return Car;
    case 'Real Estate': return Home;
    case 'Land': return MapPin;
    case 'Valuable': return Gem;
    default: return Package;
  }
};

export function PropertyCard({ property, onEdit }: PropertyCardProps) {
  const { editProperty, deleteProperty } = usePropertyStore();
  const { formatPrice } = useCurrency();
  const [isValuating, setIsValuating] = useState(false);
  
  const Icon = getIcon(property.type);
  const currentValue = property.aiEstimatedValue || property.currentValue;
  const isUp = currentValue > property.purchasePrice;
  const isDown = currentValue < property.purchasePrice;
  const diffPercent = Math.abs(((currentValue - property.purchasePrice) / property.purchasePrice) * 100);

  const handleAIValuation = async () => {
    setIsValuating(true);
    try {
      const { estimatedValue, reasoning } = await aiValuationService.estimatePropertyValue(property);
      await editProperty(property.id, {
        aiEstimatedValue: estimatedValue,
        aiValuationReasoning: reasoning,
        aiValuationDate: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to valuate property:", error);
    } finally {
      setIsValuating(false);
    }
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <Icon size={20} />
            </div>
            <div>
              <CardTitle className="text-lg">{property.name}</CardTitle>
              <CardDescription className="text-xs">{property.type} • Purchased {new Date(property.purchaseDate).toLocaleDateString()}</CardDescription>
            </div>
          </div>
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(property)} className="h-8 w-8 text-zinc-500 hover:text-blue-600">
              <Edit size={16} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => deleteProperty(property.id)} className="h-8 w-8 text-zinc-500 hover:text-red-600">
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-4">
        <div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Current Estimated Value</div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold">{formatPrice(currentValue)}</span>
            {(isUp || isDown) && (
              <span className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full ${isUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                {isUp ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                {diffPercent.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Purchase Price: {formatPrice(property.purchasePrice)}
          </div>
        </div>

        {property.aiValuationReasoning && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-lg">
            <div className="flex items-center text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-1">
              <Sparkles size={12} className="mr-1" /> AI Insights
            </div>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80">
              {property.aiValuationReasoning}
            </p>
            <div className="text-[10px] text-indigo-400/60 mt-1 text-right">
              Updated {new Date(property.aiValuationDate || '').toLocaleDateString()}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 pb-4">
        <Button 
          variant="outline" 
          className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-900/50 dark:hover:bg-indigo-900/20"
          onClick={handleAIValuation}
          disabled={isValuating}
        >
          {isValuating ? (
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2" />
              Analyzing Market...
            </div>
          ) : (
            <>
              <Sparkles size={16} className="mr-2" />
              Get Real-time AI Valuation
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
