"use client";

// Boczna szpalta z danymi zalogowanego użytkownika i licznikami jego rekordów

import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { CalendarDays, Coins, GitBranch, Inbox, ListChecks, ShieldCheck } from "lucide-react";
import { Chip, Skeleton as HeroSkeleton } from "@heroui/react";
import { ME, type MeUser } from "@/lib/graphql/queries/account";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge, ENQUIRY_STATUS_COLORS } from "@/components/ui/status-badge";
import { useI18n } from "@/i18n/i18n-context";
import Link from "next/link";
import { labelOf } from "@/lib/property-options";

const RAIL_DATA = gql`
  query DashboardRail {
    myEnq: getEnquiries(limit: 5) {
      totalCount
      items { id shortId name status propertyInterest }
    }
    leads: getLeads(limit: 1) { totalCount }
    viewings: getViewings(limit: 1) { totalCount }
    tasks: getTasks(limit: 1) { totalCount }
    commissions: getCommissions(limit: 1) { totalCount }
  }
`;

interface Count {
  totalCount: number;
}

interface RailData {
  myEnq: { totalCount: number; items: EnqItem[] };
  leads: Count;
  viewings: Count;
  tasks: Count;
  commissions: Count;
}

interface EnqItem {
  id: string;
  shortId: number;
  name: string;
  status: string | null;
  propertyInterest: string | null;
}

export function UserInfoPanel() {
  const { t, localeHref } = useI18n();
  const { data, loading } = useQuery<{ me: MeUser }>(ME, { fetchPolicy: "cache-first" });
  const { data: railData } = useQuery<RailData>(RAIL_DATA, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const me = data?.me;
  const profile = me?.profile;
  const fullName = profile?.fullName || me?.name || "—";
  const enquiries = railData?.myEnq.items ?? [];

  return (
    <aside className="rn-panel rn-panel--flush flex h-full flex-col">
      <div className="relative">
        <div
          className="h-24 w-full"
          style={{
            background: me?.company?.coverImageUrl
              ? `center/cover url(${me.company.coverImageUrl})`
              : "linear-gradient(135deg, var(--rn-blue), var(--rn-purple))",
          }}
          aria-hidden
        />
        <div className="px-5 pb-4">
          <div className="-mt-8 mb-3">
            <span className="inline-block rounded-full ring-4 ring-[var(--surface)]">
              <Avatar src={profile?.avatarUrl} name={fullName} size={64} />
            </span>
          </div>

          {loading && !me ? (
            <div className="space-y-2">
              <HeroSkeleton className="h-5 w-32 rounded" />
              <HeroSkeleton className="h-4 w-24 rounded" />
            </div>
          ) : (
            <>
              <h2 className="truncate text-base font-semibold text-foreground">{fullName}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {profile?.jobTitle || (me?.role ? t(`roles.${me.role}.label`) : "")}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Chip size="sm" variant="soft" color="accent">
                  <ShieldCheck className="h-3 w-3" /> {me?.role ? t(`roles.${me.role}.label`) : ""}
                </Chip>
                {me?.twoFactorEnabled && (
                  <Chip size="sm" variant="soft" color="success">
                    2FA
                  </Chip>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <hr className="border-border/60" />

      <div className="grid grid-cols-2 gap-2 px-5 py-4">
        {[
          { label: "Leady", value: railData?.leads.totalCount, href: "/dashboard/pipeline", icon: GitBranch },
          { label: "Prezentacje", value: railData?.viewings.totalCount, href: "/dashboard/viewings", icon: CalendarDays },
          { label: "Zadania", value: railData?.tasks.totalCount, href: "/dashboard/tasks", icon: ListChecks },
          { label: "Prowizje", value: railData?.commissions.totalCount, href: "/dashboard/commission", icon: Coins },
        ].map((s2) => (
          <Link
            key={s2.href}
            href={localeHref(s2.href)}
            className="rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <s2.icon className="h-3 w-3" aria-hidden /> {s2.label}
            </span>
            <span className="mt-0.5 block text-lg font-semibold tabular-nums text-foreground">
              {s2.value ?? "—"}
            </span>
          </Link>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
        <h3 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Inbox className="h-3.5 w-3.5" aria-hidden /> {t("dashboard.home.myEnquiries")}
          <span className="ml-auto font-normal normal-case">
            {railData?.myEnq.totalCount ?? 0}
          </span>
        </h3>

        {enquiries.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{t("dashboard.home.noEnquiries")}</p>
        ) : (
          <ul className="space-y-1.5">
            {enquiries.map((e) => (
              <li key={e.id}>
                <Link
                  href={localeHref("/dashboard/enquiries")}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {e.name}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {e.propertyInterest ? labelOf("propertyType", e.propertyInterest) : "—"}
                    </span>
                  </span>
                  <StatusBadge value={e.status} colorMap={ENQUIRY_STATUS_COLORS} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
