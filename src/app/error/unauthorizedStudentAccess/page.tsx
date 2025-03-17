"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from 'lucide-react';

function UnauthorizedStudentAccessPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center  p-4">
      <Card className="max-w-md w-full shadow-lg border-red-200 dark:border-red-900 border-2">
        <CardHeader className="bg-red-50 dark:bg-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-500 dark:text-white" />
            <CardTitle className="text-red-700 dark:text-white">Unauthorized Access</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6 pb-4">
          <div className="space-y-4">
            <p className="font-semibold text-lg">Access Violation Detected</p>
            <p>Your attempt to access the exam has been flagged as unauthorized and has been reported to administrators.</p>
            <div className="rounded-md bg-amber-50 p-4 border border-amber-200 dark:bg-amber-800 mt-4">
              <p className="font-medium text-amber-800 dark:text-white">Important Notice</p>
              <p className="text-amber-700 mt-1 dark:text-white">During exams, students are only permitted to access the system through authorized thin clients.</p>
            </div>
            <p className="text-sm text-gray-500 mt-6">If you believe this is an error, please contact your instructor or exam proctor.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UnauthorizedStudentAccessPage;