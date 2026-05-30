"use client";

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Transaction } from '@/types';

interface CategoryPieChartProps {
  transactions: Transaction[];
  type: 'income' | 'expense';
}

const CATEGORY_NAMES: Record<string, string> = {
  'cat-inc-1': 'Salary', 'cat-inc-2': 'Freelancing', 'cat-inc-3': 'Business', 
  'cat-inc-4': 'Rental', 'cat-inc-5': 'Interest', 'cat-inc-6': 'Dividends', 'cat-inc-7': 'Other',
  'cat-exp-1': 'Food', 'cat-exp-2': 'Transport', 'cat-exp-3': 'Utilities', 
  'cat-exp-4': 'Shopping', 'cat-exp-5': 'Education', 'cat-exp-6': 'Medical', 
  'cat-exp-7': 'Entertainment', 'cat-exp-8': 'Fuel', 'cat-exp-9': 'Other'
};

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function CategoryPieChart({ transactions, type }: CategoryPieChartProps) {
  const data = useMemo(() => {
    const filtered = transactions.filter(t => t.type === type);
    
    const categoryTotals: Record<string, number> = {};
    filtered.forEach(t => {
      if (!categoryTotals[t.categoryId]) {
        categoryTotals[t.categoryId] = 0;
      }
      categoryTotals[t.categoryId] += t.amount;
    });

    const chartData = Object.keys(categoryTotals).map((catId, index) => ({
      name: CATEGORY_NAMES[catId] || 'Unknown',
      value: categoryTotals[catId],
      color: COLORS[index % COLORS.length]
    })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);

    return chartData;
  }, [transactions, type]);

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
        No {type} data available for chart.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: any) => [`$${Number(value).toFixed(2)}`, undefined]}
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
        />
        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
      </PieChart>
    </ResponsiveContainer>
  );
}
