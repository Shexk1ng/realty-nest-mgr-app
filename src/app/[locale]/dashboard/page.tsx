"use client";

// Strona główna pulpitu: liczniki ofert i kontaktów, wykresy oraz ostatnie ogłoszenia

import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import {
  ArrowRight,
  Building2,
  Inbox,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@heroui/react";
import { ME, type MeUser } from "@/lib/graphql/queries/account";
import { useI18n } from "@/i18n/i18n-context";
import { Panel, StatWidget } from "@/components/dashboard/panel";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { PropertiesTable } from "@/components/dashboard/properties-table";
import { UserInfoPanel } from "@/components/dashboard/user-info-panel";
import { Skeleton } from "@/components/ui/skeleton";

const DASHBOARD_HOME = gql`
  query DashboardHome {
    recent: getProperties(limit: 1) { totalCount }
    active: getProperties(status: "ACTIVE", limit: 1) { totalCount }
    contacts: getContacts(limit: 1) { totalCount }
    enquiries: getEnquiries(limit: 1) { totalCount }
  }
`;

interface HomeData {
  recent: { totalCount: number };
  active: { totalCount: number };
  contacts: { totalCount: number };
  enquiries: { totalCount: number };
}

export default function DashboardHomePage() {
  const { localeHref, t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const resolved = t(key);
    return resolved === key ? fallback : resolved;
  };

  const { data: meData } = useQuery<{ me: MeUser }>(ME, { fetchPolicy: "cache-first" });
  const { data, loading } = useQuery<HomeData>(DASHBOARD_HOME, { fetchPolicy: "cache-and-network" });

  const firstName = meData?.me?.profile?.firstName || meData?.me?.name?.split(" ")[0] || "Agencie";

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-0.5 font-display text-3xl font-semibold tracking-tight text-foreground">
            Witaj, {firstName} 👋
          </h1>
        </div>
        <Button variant="primary" onPress={() => { window.location.href = localeHref("/dashboard/properties/new"); }}>
          <Plus className="h-4 w-4" /> {tf("dashboard.home.newListing", "Nowa oferta")}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col-reverse gap-5 xl:flex-row">
        <div className="flex min-h-0 min-w-0 grow flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatWidget
              icon={Building2}
              tone="accent"
              label="Oferty w portfelu"
              value={loading ? <Skeleton variant="text" className="h-6 w-14" /> : (data?.recent.totalCount ?? 0)}
            />
            <StatWidget
              icon={Sparkles}
              tone="green"
              label={tf("dashboard.home.statActive", "Aktywne ogłoszenia")}
              value={loading ? <Skeleton variant="text" className="h-6 w-14" /> : (data?.active.totalCount ?? 0)}
            />
            <StatWidget
              icon={Users}
              tone="violet"
              label={tf("dashboard.home.statContacts", "Klienci")}
              value={loading ? <Skeleton variant="text" className="h-6 w-14" /> : (data?.contacts.totalCount ?? 0)}
            />
            <StatWidget
              icon={Inbox}
              tone="amber"
              label={tf("dashboard.home.statEnquiries", "Zapytania")}
              value={loading ? <Skeleton variant="text" className="h-6 w-14" /> : (data?.enquiries.totalCount ?? 0)}
            />
          </div>

          <Panel
            flush
            icon={Building2}
            title={tf("dashboard.home.recentTitle", "Najnowsze oferty")}
            description={tf("dashboard.home.recentSubtitle", "Zapoznaj się z najnowszymi nieruchomościami.")}
            action={
              <Button
                variant="secondary"
                size="sm"
                onPress={() => { window.location.href = localeHref("/dashboard/properties"); }}
              >
                {tf("dashboard.home.seeAll", "Wszystkie")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            }
          >
            <PropertiesTable limit={3} showToolbar={false} />
          </Panel>

          <DashboardCharts />
        </div>

        <div className="w-full shrink-0 xl:w-[320px]">
          <UserInfoPanel />
        </div>
      </div>
    </div>
  );
}
