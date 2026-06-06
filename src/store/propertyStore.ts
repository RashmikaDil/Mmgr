import { create } from "zustand";
import { PropertyAsset } from "@/types";
import { propertyService } from "@/services/propertyService";

interface PropertyState {
  properties: PropertyAsset[];
  loading: boolean;
  error: string | null;
  fetchProperties: (userId: string) => Promise<void>;
  addProperty: (propertyData: Omit<PropertyAsset, 'id' | 'createdAt'>) => Promise<void>;
  editProperty: (id: string, updates: Partial<PropertyAsset>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  clearProperties: () => void;
}

export const usePropertyStore = create<PropertyState>((set, get) => ({
  properties: [],
  loading: false,
  error: null,

  fetchProperties: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const properties = await propertyService.getPropertiesByUser(userId);
      set({ properties, loading: false });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch properties", loading: false });
    }
  },

  addProperty: async (propertyData: Omit<PropertyAsset, 'id' | 'createdAt'>) => {
    try {
      const newProperty = await propertyService.createProperty(propertyData);
      set((state) => ({ properties: [newProperty, ...state.properties] }));
    } catch (error: any) {
      throw new Error(error.message || "Failed to add property");
    }
  },

  editProperty: async (id: string, updates: Partial<PropertyAsset>) => {
    try {
      await propertyService.updateProperty(id, updates);
      set((state) => ({
        properties: state.properties.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }));
    } catch (error: any) {
      throw new Error(error.message || "Failed to update property");
    }
  },

  deleteProperty: async (id: string) => {
    try {
      await propertyService.deleteProperty(id);
      set((state) => ({
        properties: state.properties.filter((p) => p.id !== id),
      }));
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete property");
    }
  },

  clearProperties: () => {
    set({ properties: [], error: null, loading: false });
  },
}));
