"use client";

// Podgląd zapytania klienta z etapem obsługi, priorytetem i przedziałem budżetu

import {
  CalendarClock,
  Hash,
  Mail,
  MapPin,
  Phone,
  Radio,
  Search,
  StickyNote,
  Wallet,
} from "lucide-react";
import {
  ENQUIRY_PRIORITY_COLORS,
  ENQUIRY_STATUS_COLORS,
  StatusBadge,
} from "@/components/ui/status-badge";
import { fmtDate, fmtMoney } from "@/lib/dashboard-format";
import { useI18n } from "@/i18n/i18n-context";

const EMPTY = "—";

const PIPELINE = ["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATING"] as const;
const PRIORITY_ORDER = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const PRIORITY_TONE: Record<string, string> = {
  LOW: "var(--text-3)",
  MEDIUM: "var(--info)",
  HIGH: "var(--warn)",
  URGENT: "var(--danger)",
};

const BUDGET_SCALE = 3_000_000;

function text(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function num(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function budgetTierKey(budget: number): string {
  if (budget < 500_000) return "previewTierBasic";
  if (budget < 1_500_000) return "previewTierStandard";
  if (budget < BUDGET_SCALE) return "previewTierPremium";
  return "previewTierLuxury";
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  const filled = value.length > 0;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={14} className="mt-[3px] shrink-0 text-text-4" />
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] font-medium uppercase tracking-wide text-text-4">
          {label}
        </div>
        <div
          className={
            filled
              ? "break-words text-[13px] font-medium text-text"
              : "text-[13px] text-text-4"
          }
        >
          {filled ? value : EMPTY}
        </div>
      </div>
    </div>
  );
}

export function EnquiryPreview({
  values,
  mode,
}: {
  values: Record<string, unknown>;
  mode: "new" | "edit";
}) {
  const { t } = useI18n();

  const name = text(values.name);
  const email = text(values.email);
  const phone = text(values.phone);
  const interest = text(values.propertyInterest);
  const location = text(values.location);
  const note = text(values.note);
  const source = text(values.source);
  const priority = text(values.priority);
  const status = text(values.status);
  const budget = num(values.budget);

  const shortId = num(values.shortId);
  const createdAt = text(values.createdAt);

  const stageIndex = PIPELINE.indexOf(status as (typeof PIPELINE)[number]);
  const isLost = status === "LOST";
  const priorityIndex = PRIORITY_ORDER.indexOf(priority as (typeof PRIORITY_ORDER)[number]);
  const priorityTone = PRIORITY_TONE[priority] ?? "var(--text-4)";

  const budgetPct =
    budget != null && budget > 0
      ? Math.max(4, Math.min(100, (budget / BUDGET_SCALE) * 100))
      : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-[15px] font-bold"
          style={{
            background: "color-mix(in oklab, var(--accent) 12%, var(--surface))",
            color: name ? "var(--accent)" : "var(--text-4)",
          }}
        >
          {initials(name) || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={
              name
                ? "break-words text-[17px] font-bold leading-tight text-text"
                : "text-[17px] font-bold leading-tight text-text-4"
            }
          >
            {name || t("dashboard.enquiries.previewUnnamed")}
          </h3>
          <p className="mt-0.5 truncate text-[11.5px] text-text-3">
            {email || phone || (shortId != null ? `#${shortId}` : t("dashboard.enquiries.previewNoContact"))}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge colorMap={ENQUIRY_STATUS_COLORS} value={status || null} />
        <StatusBadge colorMap={ENQUIRY_PRIORITY_COLORS} value={priority || null} />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-text-4">
            {t("dashboard.enquiries.previewPipeline")}
          </span>
          <span
            className="text-[11px] font-medium"
            style={{ color: isLost ? "var(--danger)" : "var(--text-3)" }}
          >
            {isLost
              ? t("dashboard.enquiries.previewStageLost")
              : stageIndex >= 0
                ? t("dashboard.enquiries.previewStageOf")
                    .replace("{step}", String(stageIndex + 1))
                    .replace("{total}", String(PIPELINE.length))
                : EMPTY}
          </span>
        </div>
        <div className="flex gap-1" aria-hidden>
          {PIPELINE.map((step, i) => (
            <span
              key={step}
              className="h-1.5 flex-1 rounded-full"
              style={{
                background: isLost
                  ? "color-mix(in oklab, var(--danger) 45%, transparent)"
                  : i <= stageIndex
                    ? "var(--accent)"
                    : "var(--surface-2)",
                transition: "background 240ms var(--ease-out-quart, ease)",
              }}
            />
          ))}
        </div>
      </div>

      <div
        className="rounded-xl border border-border p-3"
        style={{ background: "color-mix(in oklab, var(--accent) 6%, var(--surface))" }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-text-4">
            <Wallet size={13} aria-hidden /> {t("dashboard.enquiries.fieldBudget")}
          </span>
          {budget != null && budget > 0 && (
            <span className="text-[11px] font-medium text-text-3">
              {t(`dashboard.enquiries.${budgetTierKey(budget)}`)}
            </span>
          )}
        </div>
        <div
          className="mt-1 text-[22px] font-bold leading-none tabular-nums"
          style={{ color: budget != null ? "var(--text)" : "var(--text-4)" }}
        >
          {budget != null ? fmtMoney(budget) : EMPTY}
        </div>
        <div
          className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: "var(--surface-2)" }}
          aria-hidden
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${budgetPct}%`,
              background: "var(--accent)",
              transition: "width 320ms var(--ease-out-quart, ease)",
            }}
          />
        </div>
        {budget == null && (
          <p className="mt-2 text-[11px] text-text-4">
            {t("dashboard.enquiries.previewBudgetNone")}
          </p>
        )}
      </div>

      <div className="divide-y divide-border">
        <Fact icon={Search} label={t("dashboard.enquiries.fieldInterest")} value={interest} />
        <Fact icon={MapPin} label={t("dashboard.enquiries.fieldLocation")} value={location} />
        <Fact icon={Mail} label={t("dashboard.enquiries.fieldEmail")} value={email} />
        <Fact icon={Phone} label={t("dashboard.enquiries.fieldPhone")} value={phone} />
        <Fact
          icon={Radio}
          label={t("dashboard.enquiries.colSource")}
          value={source ? t(`dashboard.enquiries.src${source}`) : ""}
        />
        {mode === "edit" && (
          <>
            <Fact
              icon={Hash}
              label={t("dashboard.enquiries.previewRecordNo")}
              value={shortId != null ? `#${shortId}` : ""}
            />
            <Fact
              icon={CalendarClock}
              label={t("dashboard.enquiries.previewCreated")}
              value={createdAt ? fmtDate(createdAt) : ""}
            />
          </>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-text-4">
            {t("dashboard.enquiries.colPriority")}
          </span>
          <span className="text-[11px] font-medium" style={{ color: priorityTone }}>
            {priority ? t(`common.status.${priority}`) : EMPTY}
          </span>
        </div>
        <div className="flex gap-1" aria-hidden>
          {PRIORITY_ORDER.map((level, i) => (
            <span
              key={level}
              className="h-1.5 flex-1 rounded-full"
              style={{
                background: i <= priorityIndex ? priorityTone : "var(--surface-2)",
                transition: "background 240ms var(--ease-out-quart, ease)",
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-text-4">
          <StickyNote size={13} aria-hidden /> {t("dashboard.common.notes")}
        </div>
        {note ? (
          <p
            className="whitespace-pre-wrap break-words rounded-lg border-l-2 py-1 pl-2.5 text-[12.5px] leading-relaxed text-text-2"
            style={{ borderColor: "var(--accent)" }}
          >
            {note}
          </p>
        ) : (
          <p className="text-[12.5px] text-text-4">{EMPTY}</p>
        )}
      </div>

      {mode === "new" && (
        <p className="text-[11px] leading-relaxed text-text-4">
          {t("dashboard.enquiries.previewNewHint")}
        </p>
      )}
    </div>
  );
}
