"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Title } from '@/components/ui/title'; // assume exists
import { NetWorthChart } from '@/components/charts/NetWorthChart'; // placeholder component
import { useCurrency } from "@/context/CurrencyContext";

export default function NetWorthPage() {
  const { formatPrice } = useCurrency();
  return (
    <main className="p-6 space-y-6">
      <Title>Net Worth Overview</Title>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Net Worth</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-green-600">{formatPrice(0)}</CardContent>
        </Card>
        {/* Placeholder chart component */}
        <Card className="col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Growth Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <NetWorthChart />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
