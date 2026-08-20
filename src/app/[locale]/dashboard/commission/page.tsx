"use client";

// Ekran prowizji: lista z filtrami, operacje CRUD i podsumowanie kwot naliczonych oraz wypłaconych

import { BadgeDollarSign, Building2, UserRound, UserCog } from "lucide-react";
import { useQuery } from "@apollo/client/react";
import { CrudResource, type Column, type Field } from "@/components/dashboard/crud-resource";
import {
  ADD_COMMISSION,
  DELETE_COMMISSION,
  GET_COMMISSIONS,
  GET_COMMISSION_SUMMARY,
  UPDATE_COMMISSION,
  type Commission,
  type CommissionSummary,
} from "@/lib/graphql/queries/commissions";
import { fmtMoney, fmtNumber, toDateInput } from "@/lib/dashboard-format";
import { StatusBadge, COMMISSION_STATUS_COLORS } from "@/components/ui/status-badge";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["PAID", "PENDING", "PROCESSING", "DISPUTED"];

const opts = (t: (k: string) => string, vals: string[]) =>
  vals.map((v) => ({ value: v, label: t(`common.status.${v}`) }));

const dateFor = (locale: string) => (d: string | null | undefined) => {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function buildColumns(t: (k: string) => string, locale: string): Column<Commission>[] {
  const fmtDate = dateFor(locale);
  return [
  {
    key: "clientName",
    label: t("dashboard.commission.colClient"),
    sortable: true,
    render: (r) => (
      <div className="min-w-0">
        <p className="cell-truncate font-medium text-foreground">{r.clientName || "—"}</p>
        <p className="font-mono text-[11px] text-muted-foreground">#{r.shortId}</p>
      </div>
    ),
  },
  {
    key: "propertyTitle",
    label: t("dashboard.commission.colProperty"),
    sortable: true,
    accessor: (r) => r.propertyTitle ?? "",
    render: (r) => (
      <div className="min-w-0">
        <div className="cell-truncate">{r.propertyTitle ?? "—"}</div>
        {r.propertyLocation && <div className="cell-truncate text-xs text-muted-foreground">{r.propertyLocation}</div>}
      </div>
    ),
  },
  { key: "agentName", label: t("dashboard.commission.colAgent"), sortable: true, accessor: (r) => r.agentName ?? "", render: (r) => r.agentName ?? "—" },
  { key: "salePrice", label: t("dashboard.commission.colSalePrice"), sortable: true, align: "right", render: (r) => fmtMoney(r.salePrice) },
  { key: "rate", label: t("dashboard.commission.colRate"), sortable: true, align: "right", render: (r) => `${r.rate}%` },
  {
    key: "amount",
    label: t("dashboard.commission.colCommission"),
    sortable: true,
    align: "right",
    render: (r) => <span className="font-mono font-bold tabular-nums">{fmtMoney(r.amount)}</span>,
  },
  {
    key: "status",
    label: t("dashboard.tasks.colStatus"),
    sortable: true,
    render: (r) => <StatusBadge colorMap={COMMISSION_STATUS_COLORS} value={r.status} />,
  },
  {
    key: "invoiceNumber",
    label: t("dashboard.commission.colInvoice"),
    render: (r) => (r.invoiceNumber ? <span className="font-mono text-xs">{r.invoiceNumber}</span> : "—"),
  },
  { key: "dealDate", label: t("dashboard.commission.colDealDate"), sortable: true, render: (r) => fmtDate(r.dealDate) },
  { key: "paidDate", label: t("dashboard.commission.colPaidDate"), sortable: true, render: (r) => fmtDate(r.paidDate) },
  ];
}

function buildFields(t: (k: string) => string): Field[] {
  return [
  { name: "clientName", label: t("dashboard.commission.fieldClient"), type: "text", full: true },
  { name: "salePrice", label: t("dashboard.commission.fieldSalePrice"), type: "number", required: true, min: 0 },
  { name: "rate", label: t("dashboard.commission.fieldRate"), type: "number", required: true, min: 0, max: 100, step: 0.1, hint: t("dashboard.commission.hintRate") },
  { name: "status", label: t("dashboard.tasks.colStatus"), type: "select", options: opts(t, STATUS_OPTIONS) },
  { name: "invoiceNumber", label: t("dashboard.commission.fieldInvoice"), type: "text" },
  { name: "dealDate", label: t("dashboard.commission.colDealDate"), type: "date", required: true },
  { name: "paidDate", label: t("dashboard.commission.colPaidDate"), type: "date" },
  ];
}

const DASH = "—";

function num(raw: unknown): number | null {
  if (raw === "" || raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function str(raw: unknown): string {
  if (raw == null) return "";
  return String(raw).trim();
}

function exactMoney(n: number): string {
  return `${fmtNumber(Math.round(n * 100) / 100)} zł`;
}

const PAYOUT_STEPS = ["PENDING", "PROCESSING", "PAID"] as const;

const RATE_SCALE_MAX = 10;

const MS_PER_DAY = 86_400_000;

function PreviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-[11px] uppercase tracking-wide text-text-3">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-text">{children}</dd>
    </div>
  );
}

function PreviewLink({
  icon: Icon,
  role,
  name,
  sub,
}: {
  icon: typeof Building2;
  role: string;
  name: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface p-2.5">
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-3"
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-text-3">{role}</p>
        <p className="truncate text-sm font-medium text-text">{name || DASH}</p>
        {sub ? <p className="truncate text-xs text-text-3">{sub}</p> : null}
      </div>
    </div>
  );
}

function CommissionPreview({
  values,
  mode,
}: {
  values: Record<string, unknown>;
  mode: "new" | "edit";
}) {
  const { t, locale } = useI18n();
  const fmtDate = dateFor(locale);

  const client = str(values.clientName);
  const invoice = str(values.invoiceNumber);
  const status = str(values.status);
  const salePrice = num(values.salePrice);
  const rate = num(values.rate);
  const dealDate = str(values.dealDate);
  const paidDate = str(values.paidDate);

  const propertyTitle = str(values.propertyTitle);
  const propertyLocation = str(values.propertyLocation);
  const agent = str(values.agentName);
  const shortId = num(values.shortId);

  const amount = salePrice != null && rate != null ? (salePrice * rate) / 100 : null;

  const disputed = status === "DISPUTED";
  const stepIndex = PAYOUT_STEPS.indexOf(status as (typeof PAYOUT_STEPS)[number]);
  const progressPct = disputed
    ? 100 / PAYOUT_STEPS.length
    : stepIndex >= 0
      ? ((stepIndex + 1) / PAYOUT_STEPS.length) * 100
      : 0;
  const progressTone = disputed
    ? "bg-danger"
    : status === "PAID"
      ? "bg-success"
      : status === "PROCESSING"
        ? "bg-info"
        : "bg-warn";

  const ratePct =
    rate != null ? (Math.min(Math.max(rate, 0), RATE_SCALE_MAX) / RATE_SCALE_MAX) * 100 : 0;

  const dealTime = dealDate ? new Date(dealDate).getTime() : NaN;
  const paidTime = paidDate ? new Date(paidDate).getTime() : NaN;
  const leadDays =
    Number.isNaN(dealTime) || Number.isNaN(paidTime)
      ? null
      : Math.max(0, Math.round((paidTime - dealTime) / MS_PER_DAY));

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] uppercase tracking-wide text-text-3">
          {t("dashboard.commission.previewFor")}
        </p>
        <h3 className="mt-0.5 break-words font-display text-xl font-semibold leading-tight text-text">
          {client || DASH}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge colorMap={COMMISSION_STATUS_COLORS} value={status || null} />
          <span className="font-mono text-[11px] text-text-3">
            {mode === "edit" && shortId != null
              ? `#${shortId}`
              : t("dashboard.commission.previewUnsaved")}
          </span>
        </div>
      </header>

      <section className="rounded-xl border border-[color-mix(in_oklab,var(--accent)_28%,transparent)] bg-accent p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
          {t("dashboard.commission.colCommission")}
        </p>
        <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-[var(--accent-on-soft)]">
          {amount != null ? exactMoney(amount) : DASH}
        </p>
        <p className="mt-1 text-xs tabular-nums text-text-3">
          {salePrice != null ? fmtMoney(salePrice) : DASH} × {rate != null ? `${rate}%` : DASH}
        </p>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
            {t("dashboard.commission.colRate")}
          </p>
          <p className="text-sm font-semibold tabular-nums text-text">
            {rate != null ? `${rate}%` : DASH}
          </p>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div
            className="h-full rounded-full bg-accent-val transition-[width] duration-200"
            style={{ width: `${ratePct}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-text-3">
          {t("dashboard.commission.previewRateScale").replace("{max}", String(RATE_SCALE_MAX))}
        </p>
      </section>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
          {t("dashboard.commission.previewPayout")}
        </p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div
            className={cn("h-full rounded-full transition-[width] duration-200", progressTone)}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <ol className="mt-1.5 flex justify-between gap-2 text-[10px] text-text-3">
          {PAYOUT_STEPS.map((step, i) => (
            <li
              key={step}
              className={cn(!disputed && stepIndex >= i && "font-semibold text-text")}
            >
              {t(`common.status.${step}`)}
            </li>
          ))}
        </ol>
        {disputed && (
          <p className="mt-1.5 text-[11px] font-medium text-danger">
            {t("dashboard.commission.previewDisputedNote")}
          </p>
        )}
      </section>

      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-3">
          {t("dashboard.commission.previewLinked")}
        </p>
        <div className="space-y-2">
          <PreviewLink
            icon={Building2}
            role={t("dashboard.commission.colProperty")}
            name={propertyTitle}
            sub={propertyLocation || undefined}
          />
          <PreviewLink
            icon={UserRound}
            role={t("dashboard.commission.colClient")}
            name={client}
          />
          <PreviewLink icon={UserCog} role={t("dashboard.commission.colAgent")} name={agent} />
        </div>
      </section>

      <section>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-3">
          {t("dashboard.commission.previewDetails")}
        </p>
        <dl className="divide-y divide-border/60">
          <PreviewRow label={t("dashboard.commission.colSalePrice")}>
            {salePrice != null ? exactMoney(salePrice) : DASH}
          </PreviewRow>
          <PreviewRow label={t("dashboard.commission.colDealDate")}>
            {fmtDate(dealDate || null)}
          </PreviewRow>
          <PreviewRow label={t("dashboard.commission.colPaidDate")}>
            {fmtDate(paidDate || null)}
          </PreviewRow>
          <PreviewRow label={t("dashboard.commission.previewLeadTime")}>
            {leadDays != null
              ? t(
                  leadDays === 1
                    ? "dashboard.commission.previewDay"
                    : "dashboard.commission.previewDays",
                ).replace("{days}", String(leadDays))
              : DASH}
          </PreviewRow>
          <PreviewRow label={t("dashboard.commission.colInvoice")}>
            <span className="font-mono text-xs">{invoice || DASH}</span>
          </PreviewRow>
        </dl>
      </section>
    </div>
  );
}

const FLOW_SEGMENTS = [
  { key: "paidAmount", labelKey: "paidOut", bar: "bg-emerald-500", dot: "text-emerald-700 dark:text-emerald-400" },
  { key: "processingAmount", labelKey: "inProgress", bar: "bg-sky-500", dot: "text-sky-700 dark:text-sky-400" },
  { key: "pendingAmount", labelKey: "awaiting", bar: "bg-amber-500", dot: "text-amber-700 dark:text-amber-400" },
  { key: "disputedAmount", labelKey: "disputed", bar: "bg-rose-500", dot: "text-rose-700 dark:text-rose-400" },
] as const;

function CashFlowReport() {
  const { t } = useI18n();
  const { data } = useQuery<{ getCommissionSummary: CommissionSummary }>(GET_COMMISSION_SUMMARY, {
    fetchPolicy: "cache-and-network",
  });
  const s = data?.getCommissionSummary;
  if (!s || s.count === 0) return null;

  const receivable = s.totalAmount - s.paidAmount;
  const effectiveRate = s.totalSalePrice > 0 ? (s.totalAmount / s.totalSalePrice) * 100 : 0;
  const paidShare = s.totalAmount > 0 ? Math.round((s.paidAmount / s.totalAmount) * 100) : 0;

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4" aria-label={t("dashboard.commission.reportAria")}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: t("dashboard.commission.turnover"),
            value: fmtMoney(s.totalSalePrice),
            sub: t("dashboard.commission.subSettlements").replace("{count}", String(s.count)),
          },
          {
            label: t("dashboard.commission.totalCommissions"),
            value: fmtMoney(s.totalAmount),
            sub: t("dashboard.commission.subAvgRate").replace("{rate}", effectiveRate.toFixed(2)),
          },
          {
            label: t("dashboard.commission.paidOut"),
            value: fmtMoney(s.paidAmount),
            sub: t("dashboard.commission.subShareOfPool").replace("{pct}", String(paidShare)),
          },
          {
            label: t("dashboard.commission.toPayOut"),
            value: fmtMoney(receivable),
            sub: t("dashboard.commission.subOutstanding"),
          },
        ].map((kpi) => (
          <div key={kpi.label}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">{kpi.value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        {FLOW_SEGMENTS.map((seg) => {
          const pct = s.totalAmount > 0 ? (s[seg.key] / s.totalAmount) * 100 : 0;
          return pct > 0 ? <div key={seg.key} className={seg.bar} style={{ width: `${pct}%` }} /> : null;
        })}
      </div>

      <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
        {FLOW_SEGMENTS.map((seg) => (
          <li key={seg.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={`text-base leading-none ${seg.dot}`} aria-hidden>•</span>
            {t(`dashboard.commission.${seg.labelKey}`)}
            <span className="font-semibold tabular-nums text-foreground">{fmtMoney(s[seg.key])}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CommissionPage() {
  const { t, locale } = useI18n();
  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const columns = buildColumns(t, locale);
  const fields = buildFields(t);

  return (
    <CrudResource<Commission>
      title={t("dashboard.commission.title")}
      description={t("dashboard.commission.description")}
      icon={BadgeDollarSign}
      addLabel={t("dashboard.commission.add")}
      newTitle={t("dashboard.commission.newTitle")}
      editTitle={t("dashboard.commission.editTitle")}
      emptyLabel={t("dashboard.commission.empty")}
      query={GET_COMMISSIONS}
      queryRoot="getCommissions"
      createMutation={ADD_COMMISSION}
      updateMutation={UPDATE_COMMISSION}
      deleteMutation={DELETE_COMMISSION}
      columns={columns}
      fields={fields}
      summary={() => <CashFlowReport />}
      defaults={{ status: "PENDING", rate: 2.5 }}
      validateForm={(values): Record<string, string> => {
        const deal = String(values.dealDate ?? "");
        const paid = String(values.paidDate ?? "");
        if (deal && paid && paid < deal) {
          return { paidDate: tf("dashboard.commission.errorPaidBeforeDeal", "Data wypłaty nie może być wcześniejsza niż data transakcji.") };
        }
        return {};
      }}
      preview={(values, mode) => <CommissionPreview values={values} mode={mode} />}
      toForm={(r) => ({
        clientName: r.clientName ?? "",
        salePrice: r.salePrice,
        rate: r.rate,
        status: r.status,
        invoiceNumber: r.invoiceNumber ?? "",
        dealDate: toDateInput(r.dealDate),
        paidDate: toDateInput(r.paidDate),
        shortId: r.shortId,
        propertyTitle: r.propertyTitle ?? "",
        propertyLocation: r.propertyLocation ?? "",
        agentName: r.agentName ?? "",
      })}
      searchKeys={["clientName", "propertyTitle", "agentName", "invoiceNumber"]}
      searchPlaceholder={t("dashboard.commission.search")}
      statusKey="status"
      statusOptions={STATUS_OPTIONS}
      defaultSort={{ key: "shortId", dir: "desc" }}
    />
  );
}
