"use client";

// Statystyki pulpitu: wskaźniki portfela ofert i zestawienie wyników agentów

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { AlertTriangle, BarChart2, Building2, Inbox, Sparkles, TrendingUp, Users } from "lucide-react";
import { Button } from "@heroui/react";
import { roleIs, type Role } from "@/lib/roles";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { GET_USERS, type User } from "@/lib/graphql/queries/users";
import { useI18n } from "@/i18n/i18n-context";

const SAMPLE_LIMIT = 500;

const STATS_PROPERTIES = gql`
  query StatsProperties($limit: Int) {
    getProperties(limit: $limit) {
      totalCount
      items { id agentId status }
    }
  }
`;

interface StatProp { id: string; agentId: string | null; status: string }
interface AgentRow { id: string; name: string; listed: number; active: number; share: number }

type Translate = (key: string) => string;

const numberLocale = (locale: string) => (locale === "en" ? "en-GB" : "pl-PL");
const fmtInt = (n: number, locale: string) => n.toLocaleString(numberLocale(locale));

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "var(--rn-green)",
  PENDING: "var(--rn-amber)",
  SOLD: "var(--rn-blue)",
  WITHDRAWN: "var(--rn-red)",
};

const STATUS_ORDER = ["ACTIVE", "PENDING", "SOLD", "WITHDRAWN"];

function buildColumns(t: Translate, locale: string): DataTableColumn<AgentRow>[] {
  return [
    { key: "name", header: t("dashboard.stats.colAgent"), sortable: true, render: (r) => (
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-primary/30 to-primary/5 text-[10px] font-bold text-primary ring-1 ring-primary/20">
          {initials(r.name)}
        </span>
        <span className="font-medium text-foreground">{r.name}</span>
      </div>
    ) },
    { key: "listed", header: t("dashboard.stats.colListed"), sortable: true, align: "right", accessor: (r) => r.listed, render: (r) => (
      <span className="tabular-nums">{fmtInt(r.listed, locale)}</span>
    ) },
    { key: "active", header: t("dashboard.stats.colActive"), sortable: true, align: "right", accessor: (r) => r.active, render: (r) => (
      <span className="tabular-nums">{fmtInt(r.active, locale)}</span>
    ) },
    { key: "share", header: t("dashboard.stats.colShare"), sortable: true, align: "right", accessor: (r) => r.share, render: (r) => (
      <div className="flex items-center justify-end gap-2">
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${r.share}%` }} />
        </div>
        <span className="w-11 text-right tabular-nums text-muted-foreground">{r.share}%</span>
      </div>
    ) },
  ];
}

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2);
  return letters ? letters.toUpperCase() : "?";
}

function StatTile({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; tone: string;
}) {
  return (
    <div className="rn-panel flex items-center gap-4">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: `color-mix(in oklab, ${tone} 15%, transparent)`,
          color: `color-mix(in oklch, ${tone} 70%, var(--text))`,
        }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-2xl font-semibold leading-none tabular-nums text-foreground">{value}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

function PanelNote({
  icon: Icon,
  tone = "muted",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: "muted" | "danger";
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          tone === "danger" ? "bg-danger/12 text-danger" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className={`max-w-sm text-sm ${tone === "danger" ? "text-danger" : "text-muted-foreground"}`}>{children}</span>
    </div>
  );
}

export default function StatsPage() {
  const { t, locale } = useI18n();
  const { data: session } = useSession();
  const userRole = (session?.user?.role ?? "AGENT") as Role;
  const isTeamLead = roleIs.adminLevel(userRole) || roleIs.manager(userRole);

  const propsQ = useQuery<{ getProperties: { totalCount: number; items: StatProp[] } }>(STATS_PROPERTIES, {
    variables: { limit: SAMPLE_LIMIT },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const usersQ = useQuery<{ getUsers: { items: User[] } }>(GET_USERS, {
    variables: { limit: 200 },
    skip: !isTeamLead,
    errorPolicy: "all",
  });

  const items = useMemo(() => propsQ.data?.getProperties.items ?? [], [propsQ.data]);
  const total = propsQ.data?.getProperties.totalCount ?? 0;
  const active = items.filter((p) => p.status === "ACTIVE").length;
  const sold = items.filter((p) => p.status === "SOLD").length;

  const propsFailed = Boolean(propsQ.error) && items.length === 0;
  const propsPending = propsQ.loading && items.length === 0;

  const activeRate = items.length > 0 ? Math.round((active / items.length) * 100) : null;

  const breakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of items) counts.set(p.status, (counts.get(p.status) ?? 0) + 1);
    const known = STATUS_ORDER.filter((s) => counts.has(s)).map((s) => ({
      key: s,
      count: counts.get(s) ?? 0,
      tone: STATUS_TONE[s],
    }));
    const other = [...counts.entries()]
      .filter(([key]) => !STATUS_ORDER.includes(key))
      .reduce((sum, [, count]) => sum + count, 0);
    return other > 0 ? [...known, { key: "OTHER", count: other, tone: "var(--text-3)" }] : known;
  }, [items]);

  const statusLabel = (key: string) =>
    key === "OTHER" ? t("dashboard.stats.statusOther") : t(`common.status.${key}`);

  const rows = useMemo<AgentRow[]>(() => {
    const agents = (usersQ.data?.getUsers.items ?? []).filter((u) =>
      ["AGENT", "MANAGER", "COMPANY_ADMIN", "AGENT_ASSISTANT"].includes(u.role),
    );
    const grand = items.length || 1;
    return agents
      .map((u) => {
        const mine = items.filter((p) => p.agentId === u.id);
        return {
          id: u.id,
          name: u.name,
          listed: mine.length,
          active: mine.filter((p) => p.status === "ACTIVE").length,
          share: Math.round((mine.length / grand) * 100),
        };
      })
      .sort((a, b) => b.listed - a.listed);
  }, [usersQ.data, items]);

  const cols = buildColumns(t, locale);
  const sampled = total > items.length;
  const tileValue = (n: number) => (propsPending || propsFailed ? "—" : fmtInt(n, locale));

  return (
    <div className="space-y-6 pb-10">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2.5 font-display text-3xl font-semibold tracking-tight text-foreground">
          <BarChart2 className="h-7 w-7 text-primary" aria-hidden /> {t("dashboard.stats.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isTeamLead ? t("dashboard.stats.subtitleTeam") : t("dashboard.stats.subtitleAgent")}
        </p>
      </header>

      {propsFailed && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/40 bg-danger/8 px-4 py-3"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
          <span className="min-w-0 flex-1 text-sm text-foreground">{t("dashboard.stats.loadError")}</span>
          <Button variant="secondary" size="sm" onPress={() => void propsQ.refetch()}>
            {t("common.crud.retry")}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={Building2}
          label={isTeamLead ? t("dashboard.stats.statCompanyListings") : t("dashboard.stats.statMyListings")}
          value={tileValue(total)}
          tone="var(--accent)"
        />
        <StatTile icon={Sparkles} label={t("dashboard.stats.statActive")} value={tileValue(active)} tone={STATUS_TONE.ACTIVE} />
        <StatTile icon={TrendingUp} label={t("dashboard.stats.statSold")} value={tileValue(sold)} tone={STATUS_TONE.SOLD} />
        <StatTile
          icon={Users}
          label={isTeamLead ? t("dashboard.stats.statAgents") : t("dashboard.stats.statActiveRate")}
          value={
            isTeamLead
              ? usersQ.loading && rows.length === 0
                ? "—"
                : fmtInt(rows.length, locale)
              : activeRate == null
                ? "—"
                : `${activeRate}%`
          }
          tone="var(--rn-amber)"
        />
      </div>

      <section className="rn-panel">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-3">
          <h2 className="text-sm font-semibold text-foreground">{t("dashboard.stats.breakdownTitle")}</h2>
          {!propsPending && !propsFailed && items.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {sampled
                ? t("dashboard.stats.breakdownSample")
                    .replace("{shown}", fmtInt(items.length, locale))
                    .replace("{total}", fmtInt(total, locale))
                : t("dashboard.stats.breakdownScope").replace("{total}", fmtInt(items.length, locale))}
            </p>
          )}
        </div>

        {propsPending ? (
          <div className="space-y-3">
            <Skeleton variant="text" className="h-3 w-full rounded-full" />
            <div className="grid gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} variant="text" className="h-4 w-40" />
              ))}
            </div>
          </div>
        ) : propsFailed ? (
          <PanelNote icon={AlertTriangle} tone="danger">
            {t("dashboard.stats.loadError")}
          </PanelNote>
        ) : items.length === 0 ? (
          <PanelNote icon={Inbox}>{t("dashboard.stats.breakdownEmpty")}</PanelNote>
        ) : (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-border" aria-hidden>
              {breakdown.map((seg) => (
                <span
                  key={seg.key}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ flex: `${seg.count} 0 0`, minWidth: "4px", background: seg.tone }}
                />
              ))}
            </div>
            <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {breakdown.map((seg) => {
                const pct = Math.round((seg.count / items.length) * 100);
                return (
                  <li key={seg.key} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: seg.tone }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-foreground">{statusLabel(seg.key)}</span>
                    <span className="tabular-nums font-medium text-foreground">{fmtInt(seg.count, locale)}</span>
                    <span className="w-11 shrink-0 text-right tabular-nums text-muted-foreground">{pct}%</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {isTeamLead && (
        <section className="rn-panel">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 pb-1 pt-2">
            <h2 className="text-sm font-semibold text-foreground">{t("dashboard.stats.rankingTitle")}</h2>
            {sampled && !propsPending && !propsFailed && (
              <p className="text-xs text-muted-foreground">
                {t("dashboard.stats.rankingSample").replace("{shown}", fmtInt(items.length, locale))}
              </p>
            )}
          </div>
          {usersQ.error && rows.length === 0 ? (
            <PanelNote icon={AlertTriangle} tone="danger">
              {t("dashboard.stats.loadError")}
            </PanelNote>
          ) : (
            <DataTable<AgentRow>
              columns={cols}
              data={rows}
              loading={usersQ.loading || propsQ.loading}
              defaultSort={{ key: "listed", dir: "desc" }}
              emptyNode={<div className="rn-dt-empty"><p>{t("dashboard.stats.empty")}</p></div>}
            />
          )}
        </section>
      )}
    </div>
  );
}
