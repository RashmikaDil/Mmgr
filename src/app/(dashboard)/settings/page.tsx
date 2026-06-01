"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500">Manage your application preferences and profile.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Display & Preferences</CardTitle>
          <CardDescription>Update how your financial data is presented.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2 sm:max-w-xs">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Base Currency
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Select your primary currency. Dashboard totals, budgets, and crypto values will automatically convert to this currency.
            </p>
            <CurrencySwitcher variant="full" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Update your personal information and preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-md bg-gray-50">
            Under Construction
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
