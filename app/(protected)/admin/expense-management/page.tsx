"use client";

import { AdminAuthGuard } from "@/components/auth-guard/AdminAuthGuard";
import { ExpensePage } from "@/features/admin/pages/ExpensePage";

export default function AdminExpenseManagementPage() {
  return (
    <AdminAuthGuard>
      <ExpensePage />
    </AdminAuthGuard>
  );
}
