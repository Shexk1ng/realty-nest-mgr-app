// Ogranicza sekcję firm do ról zarządzających wszystkimi firmami i osadza ją w powłoce pulpitu

import { redirect } from "next/navigation";
import { auth } from "@/lib/graphql/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { roleIs } from "@/lib/roles";

export default async function CompaniesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!roleIs.canManageAllCompanies(session?.user?.role)) {
    redirect("/dashboard");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
