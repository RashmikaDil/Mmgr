import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ComingSoonPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">🚧 Coming Soon 🚧</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-600 dark:text-gray-300">
          This module is scheduled for Phase 4 of the implementation plan. Stay tuned!
        </CardContent>
      </Card>
    </div>
  );
}
