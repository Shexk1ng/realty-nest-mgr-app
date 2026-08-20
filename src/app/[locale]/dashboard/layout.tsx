// Osadza sekcję pulpitu w powłoce z nawigacją i ustala metadane strony dla języka trasy

import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getLocaleMetadata } from "@/i18n/metadata";
import { isLocale } from "@/lib/i18n-routing";
import { getSidebarCookie } from "@/lib/session";
import type { Locale } from "@/i18n/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw as Locale;
  const { dashboard } = getLocaleMetadata(locale);
  return {
    title: dashboard.title,
    description: dashboard.description,
  };
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialExpanded = await getSidebarCookie();
  return (
    <DashboardShell initialExpanded={initialExpanded}>{children}</DashboardShell>
  );
}
