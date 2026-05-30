"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// Dummy data for demonstration – will be replaced with real net‑worth data later
const data = [
  { month: "Jan", value: 50000 },
  { month: "Feb", value: 52000 },
  { month: "Mar", value: 54000 },
  { month: "Apr", value: 56000 },
  { month: "May", value: 58000 },
  { month: "Jun", value: 59000 },
  { month: "Jul", value: 60500 },
  { month: "Aug", value: 62000 },
  { month: "Sep", value: 63000 },
  { month: "Oct", value: 64500 },
  { month: "Nov", value: 66000 },
  { month: "Dec", value: 68000 },
];

export function NetWorthChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
        <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#93c5fd" fillOpacity={0.3} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
