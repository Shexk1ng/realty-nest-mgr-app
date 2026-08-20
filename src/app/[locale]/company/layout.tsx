// Osadza sekcję własnej firmy w powłoce pulpitu

import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
