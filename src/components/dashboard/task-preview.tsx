"use client";

// Podgląd zadania z terminem realizacji, stanem i powiązanymi rekordami

import {
  AlertTriangle,
  Building2,
  CalendarClock,
  FileText,
  UserRound,
} from "lucide-react";
import {
  StatusBadge,
  TASK_PRIORITY_COLORS,
  TASK_STATUS_COLORS,
} from "@/components/ui/status-badge";
import { fmtDateTime } from "@/lib/dashboard-format";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

const EMPTY = "—";

const STATUS_PROGRESS: Record<string, number> = {
  TODO: 0,
  IN_PROGRESS: 50,
  BLOCKED: 35,
  DONE: 100,
  CANCELLED: 0,
};

const STATUS_TONE: Record<string, string> = {
  TODO: "var(--text-3)",
  IN_PROGRESS: "var(--accent)",
  BLOCKED: "var(--danger)",
  DONE: "var(--success)",
  CANCELLED: "var(--text-3)",
};

const PRIORITY_LEVEL: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };

const PRIORITY_TONE: Record<string, string> = {
  LOW: "var(--text-3)",
  MEDIUM: "var(--info)",
  HIGH: "var(--warn)",
  URGENT: "var(--danger)",
};

const SETTLED = new Set(["DONE", "CANCELLED"]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function daysUntil(raw: string): number | null {
  const due = new Date(raw);
  if (Number.isNaN(due.getTime())) return null;
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((midnight(due) - midnight(new Date())) / 86_400_000);
}

function Row({
  icon: Icon,
  label,
  children,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-b-0">
      <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-text-3">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 break-words text-right text-sm text-foreground",
          mono && "font-mono text-xs",
        )}
      >
        {children}
      </span>
    </div>
  );
}

export function TaskPreview({
  values,
  mode,
}: {
  values: Record<string, unknown>;
  mode: "new" | "edit";
}) {
  const { t } = useI18n();

  const title = str(values.title);
  const status = str(values.status);
  const priority = str(values.priority);
  const dueAt = str(values.dueAt);
  const propertyId = str(values.propertyId);
  const contactId = str(values.contactId);
  const description = str(values.description);

  const pct = STATUS_PROGRESS[status] ?? 0;
  const tone = STATUS_TONE[status] ?? "var(--text-3)";
  const level = PRIORITY_LEVEL[priority] ?? 0;
  const priorityTone = PRIORITY_TONE[priority] ?? "var(--text-3)";

  const days = dueAt ? daysUntil(dueAt) : null;
  const overdue = days != null && days < 0 && !SETTLED.has(status);

  let countdown = t("dashboard.tasks.previewNoDeadline");
  if (days != null) {
    if (days === 0) countdown = t("dashboard.tasks.previewDueToday");
    else if (days === 1) countdown = t("dashboard.tasks.previewDueTomorrow");
    else if (days > 1)
      countdown = t("dashboard.tasks.previewDueInDays").replace("{n}", String(days));
    else if (days === -1) countdown = t("dashboard.tasks.previewOverdueOneDay");
    else countdown = t("dashboard.tasks.previewOverdueBy").replace("{n}", String(-days));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3
          className={cn(
            "font-display text-xl font-semibold leading-snug tracking-tight",
            title ? "text-foreground" : "text-text-3",
          )}
        >
          {title || t("dashboard.tasks.previewUntitled")}
        </h3>

        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge value={status || null} colorMap={TASK_STATUS_COLORS} />
          <StatusBadge value={priority || null} colorMap={TASK_PRIORITY_COLORS} />
        </div>

        {mode === "new" && !title && (
          <p className="text-xs text-text-3">{t("dashboard.tasks.previewHint")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">
            {t("dashboard.tasks.previewProgress")}
          </span>
          <span className="text-xs font-semibold tabular-nums text-foreground">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border" aria-hidden>
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%`, background: tone }}
          />
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border p-3",
          overdue ? "border-danger" : "border-border bg-surface",
        )}
        style={overdue ? { background: "var(--danger-soft)" } : undefined}
      >
        <div className="flex items-start gap-2.5">
          <span className={cn("mt-0.5 shrink-0", overdue ? "text-danger" : "text-text-3")}>
            {overdue ? (
              <AlertTriangle className="h-4 w-4" aria-hidden />
            ) : (
              <CalendarClock className="h-4 w-4" aria-hidden />
            )}
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-3">
              {t("dashboard.tasks.previewDeadline")}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {dueAt ? fmtDateTime(dueAt) : EMPTY}
            </p>
            <p className={cn("text-xs", overdue ? "text-danger" : "text-text-3")}>{countdown}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-text-3">
          {t("dashboard.tasks.fieldPriority")}
        </span>
        <span className="flex items-center gap-1" aria-hidden>
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className="h-3.5 w-2 rounded-sm"
              style={{
                background: step <= level ? priorityTone : "var(--border)",
              }}
            />
          ))}
        </span>
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-3">
          {t("dashboard.tasks.previewLinks")}
        </p>
        <Row icon={Building2} label={t("dashboard.tasks.previewProperty")} mono={Boolean(propertyId)}>
          {propertyId || EMPTY}
        </Row>
        <Row icon={UserRound} label={t("dashboard.tasks.previewContact")} mono={Boolean(contactId)}>
          {contactId || EMPTY}
        </Row>
      </div>

      <div className="space-y-1.5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {t("dashboard.tasks.previewDescription")}
        </p>
        {description ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-2">
            {description}
          </p>
        ) : (
          <p className="text-sm text-text-3">{EMPTY}</p>
        )}
      </div>
    </div>
  );
}
