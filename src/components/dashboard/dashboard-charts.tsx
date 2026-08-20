"use client";

// Wykresy sprzedaży i aktywności prezentowane na stronie startowej pulpitu

import { useI18n } from "@/i18n/i18n-context";

import { useMemo } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Spinner } from "@heroui/react";
import { Panel } from "@/components/dashboard/panel";

const CHART_DATA = gql`
  query DashboardCharts {
    props: getProperties(limit: 300) {
      items { id status propertyType createdAt }
    }
    enq: getEnquiries(limit: 300) {
      items { id createdAt status }
    }
  }
`;

interface ChartRow {
  id: string;
  status: string | null;
  propertyType: string | null;
  createdAt: string | null;
}
interface EnqRow {
  id: string;
  createdAt: string | null;
  status: string | null;
}
interface ChartData {
  props: { items: ChartRow[] };
  enq: { items: EnqRow[] };
}

const HUES = [
  "var(--rn-blue)",
  "var(--rn-green)",
  "var(--rn-amber)",
  "var(--rn-purple)",
  "var(--rn-red)",
  "var(--text-4)",
];

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktywne",
  PENDING: "W toku",
  SOLD: "Sprzedane",
  RENTED: "Wynajęte",
  WITHDRAWN: "Wycofane",
  DRAFT: "Szkice",
};

const TYPE_LABEL: Record<string, string> = {
  APARTMENT: "Mieszkania",
  HOUSE: "Domy",
  STUDIO: "Kawalerki",
  PLOT: "Działki",
  COMMERCIAL: "Lokale użytkowe",
  OFFICE: "Biura",
  GARAGE: "Garaże",
  ROOM: "Pokoje",
};

function ChartFrame({
  title,
  description,
  loading,
  empty,
  children,
}: {
  title: string;
  description: string;
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Panel
      title={title}
      description={description}
      className="flex h-full min-h-[240px] flex-col"
      bodyClassName="min-h-0 flex-1"
    >
      <div className="h-full pt-1">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : empty ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Za mało danych, aby zbudować wykres.
          </div>
        ) : (
          children
        )}
      </div>
    </Panel>
  );
}

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  fontSize: 12,
  color: "var(--text)",
} as const;

const TOOLTIP_PROPS = {
  contentStyle: tooltipStyle,
  separator: ": ",
} as const;

export function DashboardCharts() {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const resolved = t(key);
    return resolved === key ? fallback : resolved;
  };
  const { data, loading } = useQuery<ChartData>(CHART_DATA, {
    fetchPolicy: "cache-and-network",
  });

  const props = useMemo(() => data?.props.items ?? [], [data]);
  const enquiries = useMemo(() => data?.enq.items ?? [], [data]);

  const byStatus = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of props) {
      const k = p.status ?? "DRAFT";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, value], i) => ({
        name: STATUS_LABEL[name] ?? name,
        value,
        fill: HUES[i % HUES.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [props]);

  const byMonth = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("pl-PL", { month: "short" }),
        value: 0,
      });
    }
    const index = new Map(buckets.map((b, i) => [b.key, i]));
    for (const e of enquiries) {
      if (!e.createdAt) continue;
      const raw = Number(e.createdAt);
      const d = new Date(Number.isFinite(raw) && raw > 0 ? raw : e.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (i != null) buckets[i]!.value += 1;
    }
    return buckets;
  }, [enquiries]);

  const byType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of props) {
      const k = p.propertyType ?? "OTHER";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, value], i) => ({
        name: TYPE_LABEL[name] ?? name,
        value,
        fill: HUES[i % HUES.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [props]);

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
      <ChartFrame
        title={tf("dashboard.home.chartByStatus", "Oferty według statusu")}
        description={tf("dashboard.home.chartByStatusSub", "Ile ofert jest na jakim etapie.")}
        loading={loading && props.length === 0}
        empty={byStatus.length === 0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byStatus} layout="vertical" barCategoryGap={5} maxBarSize={26}>
            <YAxis
              dataKey="name"
              type="category"
              width={78}
              tickLine={false}
              axisLine={false}
              tickSize={0}
              tick={{ fill: "var(--text-3)", fontSize: 11 }}
            />
            <XAxis dataKey="value" type="number" hide />
            <Tooltip cursor={{ fill: "var(--surface-hi)" }} {...TOOLTIP_PROPS} />
            <Bar dataKey="value" name="Oferty" radius={7} animationDuration={700}>
              {byStatus.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="insideRight"
                fill="var(--rn-ink, #fff)"
                offset={10}
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title={tf("dashboard.home.chartEnquiries", "Zapytania w czasie")}
        description={tf("dashboard.home.chartEnquiriesSub", "Zapytania z ostatnich sześciu miesięcy.")}
        loading={loading && enquiries.length === 0}
        empty={byMonth.every((b) => b.value === 0)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={byMonth} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="enqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--rn-blue)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--rn-blue)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-3)", fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-3)", fontSize: 11 }}
            />
            <Tooltip cursor={false} {...TOOLTIP_PROPS} />
            <Area
              type="monotone"
              dataKey="value"
              name="Zapytania"
              stroke="var(--rn-blue)"
              strokeWidth={2}
              fill="url(#enqFill)"
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title={tf("dashboard.home.chartPortfolio", "Struktura portfela")}
        description={tf("dashboard.home.chartPortfolioSub", "Czego masz najwięcej w portfelu.")}
        loading={loading && props.length === 0}
        empty={byType.length === 0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Tooltip {...TOOLTIP_PROPS} />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              width={176}
              content={({ payload }) => (
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 pl-2">
                  {(payload ?? []).map((entry) => (
                    <li key={String(entry.value)} className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: entry.color }}
                        aria-hidden
                      />
                      <span className="truncate text-[10.5px] text-[var(--text-3)]">
                        {entry.value}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            />
            <Pie
              data={byType}
              dataKey="value"
              nameKey="name"
              cx="32%"
              innerRadius={38}
              outerRadius={62}
              paddingAngle={2}
              animationDuration={700}
            >
              {byType.map((d) => (
                <Cell key={d.name} fill={d.fill} stroke="var(--surface)" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}
