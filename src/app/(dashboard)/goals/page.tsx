"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSavingsGoalStore } from '@/store/savingsGoalStore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function GoalsPage() {
  const { user } = useAuth();
  const { goals, loading, fetchGoals, deleteGoal } = useSavingsGoalStore();

  useEffect(() => {
    if (user?.uid) {
      fetchGoals(user.uid, (user as any).familyId);
    }
  }, [user]);

  if (loading) return <p className="text-center py-8">Loading goals…</p>;

  return (
    <section className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">💡 Savings Goals</h1>
        <Button variant="outline" className="flex items-center gap-1">
          <Plus size={16} /> Add Goal
        </Button>
      </div>
      {goals.length === 0 ? (
        <p className="text-center text-gray-500">No goals yet. Create one to start saving!</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <Card key={g.id} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {g.name}
                  <Button variant="ghost" size="sm" onClick={() => deleteGoal(g.id)}>
                    Delete
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Target: ${g.targetAmount.toLocaleString()}</p>
                <p>Current: ${g.currentAmount.toLocaleString()}</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-green-600 h-2.5 rounded-full"
                    style={{ width: `${Math.min((g.currentAmount / g.targetAmount) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {g.currentAmount >= g.targetAmount ? 'Goal reached!' : `${Math.round((g.currentAmount / g.targetAmount) * 100)}% complete`}
                </p>
              </CardContent>
              <CardFooter className="text-sm text-gray-500">Target date: {g.targetDate}</CardFooter>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
