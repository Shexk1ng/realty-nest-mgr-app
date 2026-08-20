"use client";

// Podgląd szansy sprzedaży z jej etapem w lejku i powiązanymi rekordami

import {
  Building2,
  Coins,
  Inbox,
  Radio,
  UserCircle2,
  UserRound,
} from "lucide-react";
import { PIPELINE_STAGE_COLORS, StatusBadge } from "@/components/ui/status-badge";
import { fmtDate, fmtMoney } from "@/lib/dashboard-format";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

const RAIL = ["NEW", "QUALIFYING", "SHOWING", "OFFER", "CLOSED"] as const;
const RAIL_STEP: Record<string, number> = {
  NEW: 0,
  QUALIFYING: 1,
  SHOWING: 2,
  NURTURE: 2,
  OFFER: 3,
  CLOSED: 4,
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function num(v: unknown): number | null {
  const s = str(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-3">
      {children}
    </p>
  );
}

function LinkRow({
  icon: Icon,
  role,
  name,
  meta,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  role: string;
  name: string;
  meta: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface p-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hi text-text-4">
        <Icon size={15} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wide text-text-4">{role}</span>
        <span className="block truncate text-sm text-text">{name}</span>
        {meta ? <span className="block truncate text-[11px] text-text-3">{meta}</span> : null}
      </span>
    </div>
  );
}

export function LeadPreview({
  values,
  mode,
}: {
  values: Record<string, unknown>;
  mode: "new" | "edit";
}) {
  const { t } = useI18n();

  const title = str(values.title);
  const stage = str(values.stage);
  const source = str(values.source);
  const estValue = num(values.estValue);

  const shortId = str(values.shortId);
  const contactName = str(values.contactName);
  const contactMeta = str(values.contactPhone) || str(values.contactEmail);
  const propertyTitle = str(values.propertyTitle);
  const propertyLocation = str(values.propertyLocation);
  const agentName = str(values.agentName);
  const enquiryName = str(values.enquiryName);
  const createdAt = str(values.createdAt);

  const lost = stage === "LOST";
  const parked = stage === "NURTURE";
  const step = RAIL_STEP[stage] ?? 0;

  let ageText = "";
  if (mode === "edit" && createdAt) {
    const created = new Date(createdAt);
    if (!Number.isNaN(created.getTime())) {
      const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
      const days = Math.max(0, Math.round((midnight(new Date()) - midnight(created)) / 86_400_000));
      if (days === 0) ageText = t("dashboard.pipelineBoard.previewAgeToday");
      else if (days === 1) ageText = t("dashboard.pipelineBoard.previewAgeOneDay");
      else ageText = t("dashboard.pipelineBoard.previewAgeDays").replace("{n}", String(days));
    }
  }

  const hasLinks = Boolean(contactName || propertyTitle || agentName || enquiryName);
  const hasValue = estValue != null && estValue > 0;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-4">
          {mode === "edit" && shortId ? `#${shortId}` : t("dashboard.pipelineBoard.newLead")}
        </p>
        <div className="mt-1 flex items-start justify-between gap-2">
          <h3
            className={cn(
              "min-w-0 font-display text-xl font-semibold leading-snug tracking-tight",
              title ? "text-text" : "text-text-4",
            )}
          >
            {title || t("dashboard.pipelineBoard.previewUntitled")}
          </h3>
          <span className="shrink-0">
            <StatusBadge value={stage || null} colorMap={PIPELINE_STAGE_COLORS} />
          </span>
        </div>
        {ageText ? <p className="mt-1 text-xs text-text-3">{ageText}</p> : null}

        {mode === "new" && !title && (
          <p className="mt-2 text-xs text-text-3">{t("dashboard.pipelineBoard.previewHint")}</p>
        )}
      </header>

      <section>
        <SectionLabel>{t("dashboard.pipelineBoard.previewProgress")}</SectionLabel>
        <ol className="flex items-start gap-1">
          {RAIL.map((s, i) => {
            const reached = !lost && i <= step;
            return (
              <li key={s} className="min-w-0 flex-1">
                <span
                  className={cn("block h-1.5 rounded-full", reached ? "bg-accent-val" : "bg-border")}
                  aria-hidden
                />
                <span
                  className={cn(
                    "mt-1 block truncate text-[10px]",
                    reached ? "text-text-2" : "text-text-4",
                  )}
                >
                  {t(`common.status.${s}`)}
                </span>
              </li>
            );
          })}
        </ol>
        {lost ? (
          <p className="mt-1.5 text-[11px] text-danger">
            {t("dashboard.pipelineBoard.previewLost")}
          </p>
        ) : null}
        {parked ? (
          <p className="mt-1.5 text-[11px] text-text-3">
            {t("dashboard.pipelineBoard.previewNurture")}
          </p>
        ) : null}
      </section>

      <section
        className={cn("flex items-start gap-2.5 rounded-xl border border-border p-3", !hasValue && "bg-surface")}
        style={hasValue ? { background: "var(--accent-soft)" } : undefined}
      >
        <Coins
          size={16}
          className={cn("mt-0.5 shrink-0", hasValue ? "text-[var(--accent-on-soft)]" : "text-text-4")}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-3">
            {t("dashboard.pipelineBoard.fieldEstValue")}
          </p>
          {hasValue ? (
            <p className="text-lg font-semibold tabular-nums text-[var(--accent-on-soft)]">
              {fmtMoney(estValue)}
            </p>
          ) : (
            <p className="text-xs text-text-4">{t("dashboard.pipelineBoard.previewNoValue")}</p>
          )}
        </div>
      </section>

      <section>
        <SectionLabel>{t("dashboard.pipelineBoard.fieldSource")}</SectionLabel>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <Radio size={14} className="shrink-0 text-text-4" aria-hidden />
          {source ? (
            <span className="min-w-0 truncate text-sm text-text">{source}</span>
          ) : (
            <span className="text-xs text-text-4">
              {t("dashboard.pipelineBoard.previewNoSource")}
            </span>
          )}
        </div>
      </section>

      <section>
        <SectionLabel>{t("dashboard.pipelineBoard.previewLinks")}</SectionLabel>
        {hasLinks ? (
          <div className="grid grid-cols-1 gap-2">
            {contactName ? (
              <LinkRow
                icon={UserRound}
                role={t("dashboard.pipelineBoard.previewRoleContact")}
                name={contactName}
                meta={contactMeta}
              />
            ) : null}
            {propertyTitle ? (
              <LinkRow
                icon={Building2}
                role={t("dashboard.pipelineBoard.previewRoleProperty")}
                name={propertyTitle}
                meta={propertyLocation}
              />
            ) : null}
            {agentName ? (
              <LinkRow
                icon={UserCircle2}
                role={t("dashboard.pipelineBoard.previewRoleAgent")}
                name={agentName}
                meta=""
              />
            ) : null}
            {enquiryName ? (
              <LinkRow
                icon={Inbox}
                role={t("dashboard.pipelineBoard.previewRoleEnquiry")}
                name={enquiryName}
                meta=""
              />
            ) : null}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-4">
            {t("dashboard.pipelineBoard.previewNoLinks")}
          </p>
        )}
      </section>

      {mode === "edit" && createdAt ? (
        <p className="text-[11px] text-text-4">
          {t("dashboard.pipelineBoard.previewCreated").replace("{date}", fmtDate(createdAt))}
        </p>
      ) : null}
    </div>
  );
}
