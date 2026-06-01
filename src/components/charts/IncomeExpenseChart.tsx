"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Transaction } from '@/types';
import { format, parseISO, subMonths } from 'date-fns';
import { useCurrency } from '@/context/CurrencyContext';

interface IncomeExpenseChartProps {
  transactions: Transaction[];
}

export function IncomeExpenseChart({ transactions }: IncomeExpenseChartProps) {
  const { formatPrice, currency } = useCurrency();
  const data = useMemo(() => {
    // Group last 6 months
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(new Date(), i);
      return {
        month: format(d, 'MMM'),
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        income: 0,
        expense: 0
      };
    }).reverse();

    transactions.forEach(t => {
      const date = parseISO(t.date);
      const targetMonth = months.find(m => m.monthIndex === date.getMonth() && m.year === date.getFullYear());
      if (targetMonth) {
        if (t.type === 'income') {
          targetMonth.income += t.amount;
        } else {
          targetMonth.expense += t.amount;
        }
      }
    });

    return months;
  }, [transactions]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(val) => `${currency.symbol}${val}`} />
        <Tooltip 
          cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
          formatter={(value: any) => [`${formatPrice(Number(value))}`, undefined]}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="income" name="Income" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="expense" name="Expense" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
