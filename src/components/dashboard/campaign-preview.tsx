"use client";

// Podgląd kampanii marketingowej z lejkiem konwersji, kosztami i harmonogramem

import { BarChart3, CalendarRange, Coins, MessageSquare } from "lucide-react";
import { StatusBadge, MARKETING_STATUS_COLORS } from "@/components/ui/status-badge";
import { fmtDate, fmtNumber, type BadgeColor } from "@/lib/dashboard-format";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

const DASH = "—";

const CHANNEL_COLORS: Record<string, BadgeColor> = {
  EMAIL: "blue",
  SOCIAL: "violet",
  PORTAL: "amber",
  SEARCH: "green",
  DIRECT: "slate",
};

const MS_PER_DAY = 86_400_000;

function str(raw: unknown): string {
  if (raw == null) return "";
  return String(raw).trim();
}

function num(raw: unknown): number | null {
  if (raw === "" || raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function money(n: number | null): string {
  if (n == null) return DASH;
  return `${fmtNumber(Math.round(n))} zł`;
}

function pct(n: number): string {
  return `${n >= 1 ? n.toFixed(1) : n.toFixed(2)}%`;
}

function time(raw: string): number | null {
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

function Track({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--text-3)_22%,transparent)]"
      aria-hidden
    >
      {children}
    </div>
  );
}

function Pair({
  label,
  value,
  filled,
  strong,
  mono,
}: {
  label: string;
  value: string;
  filled: boolean;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-[11px] text-text-3">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words text-right tabular-nums",
          strong ? "text-sm font-semibold" : "text-xs font-medium",
          mono && "font-mono",
          filled ? "text-text" : "text-text-3",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function FunnelStage({
  label,
  value,
  share,
  tone,
}: {
  label: string;
  value: number | null;
  share: number;
  tone: string;
}) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] text-text-3">{label}</span>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            value == null ? "text-text-3" : "text-text",
          )}
        >
          {value == null ? DASH : fmtNumber(value)}
        </span>
      </div>
      <div className="mt-1">
        <Track>
          <div
            className={cn("h-full rounded-full transition-[width] duration-200", tone)}
            style={{ width: `${share}%` }}
          />
        </Track>
      </div>
    </li>
  );
}

export interface CampaignPreviewProps {
  values: Record<string, unknown>;
  mode: "new" | "edit";
  channelLabel: (value: string) => string;
}

export function CampaignPreview({ values, mode, channelLabel }: CampaignPreviewProps) {
  const { t } = useI18n();

  const name = str(values.name);
  const channel = str(values.channel);
  const status = str(values.status);
  const budget = num(values.budget);
  const spent = num(values.spent);
  const impressions = num(values.impressions);
  const clicks = num(values.clicks);
  const leads = num(values.leads);
  const startDate = str(values.startDate);
  const endDate = str(values.endDate);
  const enquiryId = str(values.enquiryId);

  const enquiryName = str(values.enquiryName);
  const shortId = num(values.shortId);

  const budgetUsable = budget != null && budget > 0;
  const usedPct = budgetUsable && spent != null ? (spent / budget) * 100 : 0;
  const barPct = Math.min(100, Math.max(0, usedPct));
  const remaining = budget != null ? budget - (spent ?? 0) : null;
  const overspend = remaining != null && remaining < 0 ? -remaining : null;
  const burnTone = overspend != null ? "bg-danger" : usedPct >= 80 ? "bg-warn" : "bg-accent-val";

  const funnelBase = impressions ?? clicks ?? leads ?? 0;
  const share = (v: number | null) => {
    if (v == null || v <= 0 || funnelBase <= 0) return 0;
    return Math.max(2, Math.min(100, (v / funnelBase) * 100));
  };

  const ctr = impressions != null && impressions > 0 && clicks != null ? (clicks / impressions) * 100 : null;
  const conversion = clicks != null && clicks > 0 && leads != null ? (leads / clicks) * 100 : null;
  const costPerLead = leads != null && leads > 0 && spent != null ? spent / leads : null;

  const startMs = time(startDate);
  const endMs = time(endDate);
  const durationDays =
    startMs != null && endMs != null ? Math.max(0, Math.round((endMs - startMs) / MS_PER_DAY)) : null;
  const nowMs = new Date().getTime();
  const elapsedPct =
    startMs != null && endMs != null && endMs > startMs
      ? Math.min(100, Math.max(0, ((nowMs - startMs) / (endMs - startMs)) * 100))
      : null;

  const days = (n: number) =>
    t(n === 1 ? "dashboard.marketing.previewDay" : "dashboard.marketing.previewDays").replace(
      "{days}",
      String(n),
    );

  const untouched =
    !name &&
    budget == null &&
    spent == null &&
    impressions == null &&
    clicks == null &&
    leads == null &&
    !startDate &&
    !endDate;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
          {t("dashboard.marketing.colCampaign")}
        </p>
        <h3
          className={cn(
            "mt-0.5 break-words font-display text-xl font-semibold leading-tight",
            name ? "text-text" : "text-text-3",
          )}
        >
          {name || DASH}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge value={status || null} colorMap={MARKETING_STATUS_COLORS} />
          <StatusBadge
            value={channel || null}
            colorMap={CHANNEL_COLORS}
            label={channel ? channelLabel(channel) : undefined}
          />
          <span className="font-mono text-[11px] text-text-3">
            {mode === "edit" && shortId != null
              ? `#${shortId}`
              : t("dashboard.marketing.previewUnsaved")}
          </span>
        </div>

        {mode === "new" && untouched && (
          <p className="mt-2.5 rounded-lg border border-dashed border-border px-3 py-2 text-[11px] leading-relaxed text-text-3">
            {t("dashboard.marketing.previewEmptyHint")}
          </p>
        )}
      </header>

      <section className="rounded-xl border border-[color-mix(in_oklab,var(--accent)_28%,transparent)] bg-accent p-3">
        <SectionTitle icon={Coins}>{t("dashboard.marketing.previewBudget")}</SectionTitle>
        <p className="font-display text-2xl font-semibold tabular-nums text-[var(--accent-on-soft)]">
          {money(spent)}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-text-3">
          {t("dashboard.marketing.previewOfBudget").replace("{budget}", money(budget))}
        </p>

        <div className="mt-2">
          <Track>
            <div
              className={cn("h-full rounded-full transition-[width] duration-200", burnTone)}
              style={{ width: `${barPct}%` }}
            />
          </Track>
        </div>

        <p className="mt-1.5 text-[11px] text-text-3">
          {budgetUsable
            ? t("dashboard.marketing.previewBudgetUsed").replace("{pct}", String(Math.round(usedPct)))
            : t("dashboard.marketing.previewNoBudget")}
        </p>

        {overspend != null ? (
          <p className="mt-1 text-[11px] font-medium text-danger">
            {t("dashboard.marketing.previewOverBudget").replace("{amount}", money(overspend))}
          </p>
        ) : (
          <dl className="mt-1">
            <Pair
              label={t("dashboard.marketing.previewRemaining")}
              value={money(remaining)}
              filled={remaining != null}
            />
          </dl>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-3">
        <SectionTitle icon={BarChart3}>{t("dashboard.marketing.previewFunnel")}</SectionTitle>
        <ul className="space-y-2">
          <FunnelStage
            label={t("dashboard.marketing.fieldImpressions")}
            value={impressions}
            share={share(impressions)}
            tone="bg-accent-val/35"
          />
          <FunnelStage
            label={t("dashboard.marketing.fieldClicks")}
            value={clicks}
            share={share(clicks)}
            tone="bg-accent-val/65"
          />
          <FunnelStage
            label={t("dashboard.marketing.colLeads")}
            value={leads}
            share={share(leads)}
            tone="bg-accent-val"
          />
        </ul>

        <dl className="mt-2 divide-y divide-border">
          <Pair
            label={t("dashboard.marketing.previewCtr")}
            value={ctr == null ? DASH : pct(ctr)}
            filled={ctr != null}
          />
          <Pair
            label={t("dashboard.marketing.previewConversion")}
            value={conversion == null ? DASH : pct(conversion)}
            filled={conversion != null}
          />
          <Pair
            label={t("dashboard.marketing.previewCostPerLead")}
            value={money(costPerLead)}
            filled={costPerLead != null}
            strong
          />
        </dl>
      </section>

      <section>
        <SectionTitle icon={CalendarRange}>{t("dashboard.marketing.previewPeriod")}</SectionTitle>

        {elapsedPct != null && (
          <div className="mb-2">
            <Track>
              <div
                className="h-full rounded-full bg-accent-val transition-[width] duration-200"
                style={{ width: `${elapsedPct}%` }}
              />
            </Track>
            <p className="mt-1 text-[11px] text-text-3">
              {t("dashboard.marketing.previewElapsed").replace("{pct}", String(Math.round(elapsedPct)))}
            </p>
          </div>
        )}

        <dl className="divide-y divide-border">
          <Pair
            label={t("dashboard.marketing.fieldStart")}
            value={startDate ? fmtDate(startDate) : DASH}
            filled={Boolean(startDate)}
          />
          <Pair
            label={t("dashboard.marketing.fieldEnd")}
            value={endDate ? fmtDate(endDate) : t("dashboard.marketing.previewNoEnd")}
            filled={Boolean(endDate)}
          />
          <Pair
            label={t("dashboard.marketing.previewDuration")}
            value={durationDays == null ? DASH : days(durationDays)}
            filled={durationDays != null}
          />
        </dl>
      </section>

      <section>
        <SectionTitle icon={MessageSquare}>{t("dashboard.marketing.colEnquiry")}</SectionTitle>
        <p
          className={cn(
            "text-xs font-medium",
            enquiryName || enquiryId ? "text-text" : "text-text-3",
          )}
        >
          {enquiryName || (enquiryId ? t("dashboard.marketing.previewEnquiryLinked") : DASH)}
        </p>
        {enquiryId && (
          <p className="mt-0.5 break-all font-mono text-[11px] text-text-3">{enquiryId}</p>
        )}
      </section>
    </div>
  );
}
