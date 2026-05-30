"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-gray-500">Generate and export financial reports (Coming in Phase 5).</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>This module is scheduled for Phase 5 of the implementation plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-md">
            Under Construction
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
