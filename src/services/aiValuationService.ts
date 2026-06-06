import { aiService } from "./aiService";
import { PropertyAsset } from "@/types";

export const aiValuationService = {
  /** Gets an AI estimation of a property's current value */
  async estimatePropertyValue(property: PropertyAsset): Promise<{ estimatedValue: number; reasoning: string }> {
    const key = aiService.getApiKey();
    
    if (!key) {
      return this.heuristicValuation(property);
    }

    const prompt = `
      You are an expert real estate and asset valuation AI. 
      I have a property asset:
      - Name: ${property.name}
      - Type: ${property.type}
      - Purchase Price: ${property.purchasePrice}
      - Purchase Date: ${property.purchaseDate}
      - Location/Details: ${property.location || property.description || "Not specified"}

      Estimate its current market value based on general historical appreciation/depreciation rates for this type of asset.
      Respond strictly in the following JSON format:
      {
        "estimatedValue": <number>,
        "reasoning": "<short 1-2 sentence explanation of why this value changed>"
      }
    `;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (textResponse) {
        const parsed = JSON.parse(textResponse);
        return {
          estimatedValue: parsed.estimatedValue,
          reasoning: parsed.reasoning
        };
      }
      throw new Error("Invalid response from Gemini");
    } catch (e) {
      console.warn("Gemini API call failed for valuation, falling back to heuristic:", e);
      return this.heuristicValuation(property);
    }
  },

  heuristicValuation(property: PropertyAsset): { estimatedValue: number; reasoning: string } {
    const purchaseDate = new Date(property.purchaseDate);
    const now = new Date();
    const yearsElapsed = Math.max(0, (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    
    let estimatedValue = property.purchasePrice;
    let reasoning = "";

    switch (property.type) {
      case 'Vehicle':
        // General assumption: cars depreciate by ~15% per year
        estimatedValue = property.purchasePrice * Math.pow(0.85, yearsElapsed);
        reasoning = `Based on a standard 15% annual depreciation rate over ${yearsElapsed.toFixed(1)} years.`;
        break;
      case 'Real Estate':
      case 'Land':
        // General assumption: real estate appreciates by ~4% per year
        estimatedValue = property.purchasePrice * Math.pow(1.04, yearsElapsed);
        reasoning = `Based on a conservative 4% annual appreciation rate over ${yearsElapsed.toFixed(1)} years.`;
        break;
      case 'Valuable':
        // Assume holds value or slight appreciation
        estimatedValue = property.purchasePrice * Math.pow(1.01, yearsElapsed);
        reasoning = `Valuables tend to hold their value with a slight appreciation over time.`;
        break;
      default:
        estimatedValue = property.purchasePrice;
        reasoning = `Insufficient data to predict value changes for 'Other' asset types, keeping purchase price.`;
    }

    return {
      estimatedValue: Math.round(estimatedValue),
      reasoning
    };
  }
};
