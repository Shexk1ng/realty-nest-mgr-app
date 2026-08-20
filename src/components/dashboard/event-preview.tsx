"use client";

// Podgląd wydarzenia w kalendarzu wraz z ostrzeżeniem o kolizji terminów

import {
  AlertTriangle,
  CalendarClock,
  Clock3,
  FileText,
  History,
  MapPin,
} from "lucide-react";
import { fmtDateTime } from "@/lib/dashboard-format";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

const EMPTY = "—";

const BAND_START = 7;
const BAND_END = 21;

export interface EventConflict {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function parseDate(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(d: Date): number {
  const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return Math.round((midnight(d) - midnight(new Date())) / 86_400_000);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-3">
      {children}
    </p>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-1.5 last:border-b-0">
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-text-3">
        <Icon size={13} className="text-text-4" aria-hidden />
        {label}
      </span>
      <span className="min-w-0 break-words text-right text-sm text-text">{children}</span>
    </div>
  );
}

export function EventPreview({
  values,
  mode,
  kindLabel,
  kindDotClass,
  conflicts,
}: {
  values: Record<string, unknown>;
  mode: "new" | "edit";
  kindLabel: string;
  kindDotClass: string;
  conflicts: EventConflict[];
}) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-GB" : "pl-PL";

  const title = str(values.title);
  const location = str(values.location);
  const description = str(values.description);
  const shortId = str(values.shortId);
  const createdAt = str(values.createdAt);
  const updatedAt = str(values.updatedAt);

  const start = parseDate(values.startAt);
  const end = parseDate(values.endAt);

  const time = (d: Date) => d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  const minutes = start && end ? Math.round((end.getTime() - start.getTime()) / 60_000) : null;
  const badRange = minutes != null && minutes <= 0;

  let durationText = EMPTY;
  if (minutes != null && minutes > 0) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) durationText = t("dashboard.calendar.previewDurationMin").replace("{n}", String(m));
    else if (m === 0) durationText = t("dashboard.calendar.previewDurationH").replace("{h}", String(h));
    else
      durationText = t("dashboard.calendar.previewDurationHm")
        .replace("{h}", String(h))
        .replace("{m}", String(m));
  }

  let relative = t("dashboard.calendar.previewNoDate");
  if (start) {
    const days = daysUntil(start);
    if (days === 0) relative = t("dashboard.calendar.previewToday");
    else if (days === 1) relative = t("dashboard.calendar.previewTomorrow");
    else if (days === -1) relative = t("dashboard.calendar.previewYesterday");
    else if (days > 1) relative = t("dashboard.calendar.previewInDays").replace("{n}", String(days));
    else relative = t("dashboard.calendar.previewDaysAgo").replace("{n}", String(-days));
  }

  const span = BAND_END - BAND_START;
  const toFrac = (d: Date) => (d.getHours() + d.getMinutes() / 60 - BAND_START) / span;
  const rawLeft = start ? toFrac(start) : 0;
  const rawRight = end ? toFrac(end) : rawLeft;
  const left = Math.min(0.98, Math.max(0, rawLeft));
  const width = Math.max(0.02, Math.min(1, rawRight) - left);

  const weekday = start ? start.toLocaleDateString(dateLocale, { weekday: "long" }) : "";
  const dateLine = start
    ? start.toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-4">
          {mode === "edit" && shortId ? `#${shortId}` : t("dashboard.calendar.newEvent")}
        </p>
        <h3
          className={cn(
            "mt-1 font-display text-xl font-semibold leading-snug tracking-tight",
            title ? "text-text" : "text-text-4",
          )}
        >
          {title || t("dashboard.calendar.previewUntitled")}
        </h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-3">
          <span className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", kindDotClass)} aria-hidden />
            {kindLabel}
          </span>
          <span aria-hidden>·</span>
          <span>{relative}</span>
        </p>

        {mode === "new" && !title && (
          <p className="mt-2 text-xs text-text-3">{t("dashboard.calendar.previewHint")}</p>
        )}
      </header>

      <section
        className={cn("rounded-xl border p-3", badRange ? "border-danger" : "border-border bg-surface")}
        style={badRange ? { background: "var(--danger-soft)" } : undefined}
      >
        <div className="flex items-start gap-2.5">
          <span className={cn("mt-0.5 shrink-0", badRange ? "text-danger" : "text-text-4")}>
            {badRange ? (
              <AlertTriangle size={16} aria-hidden />
            ) : (
              <CalendarClock size={16} aria-hidden />
            )}
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-text">
              {start ? (
                <>
                  <span className="capitalize">{weekday}</span>, {dateLine}
                </>
              ) : (
                EMPTY
              )}
            </p>
            <p className="text-sm tabular-nums text-text-2">
              {start ? time(start) : EMPTY}
              {end ? ` – ${time(end)}` : ""}
              {durationText !== EMPTY ? ` · ${durationText}` : ""}
            </p>
            {badRange && (
              <p className="text-xs text-danger">{t("dashboard.calendar.errEndBeforeStart")}</p>
            )}
          </div>
        </div>

        {start && !badRange && (
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-border" aria-hidden>
              <div
                className="h-full rounded-full bg-accent-val transition-[width,margin] duration-300 ease-out"
                style={{ marginInlineStart: `${left * 100}%`, width: `${width * 100}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] tabular-nums text-text-4" aria-hidden>
              <span>{String(BAND_START).padStart(2, "0")}:00</span>
              <span>{String(BAND_END).padStart(2, "0")}:00</span>
            </div>
          </div>
        )}
      </section>

      {conflicts.length > 0 && (
        <section
          className="rounded-xl border border-warn p-3"
          style={{ background: "var(--warn-soft)" }}
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold text-text">
            <AlertTriangle size={14} className="shrink-0 text-warn" aria-hidden />
            {t("dashboard.calendar.previewConflicts").replace("{n}", String(conflicts.length))}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {conflicts.slice(0, 3).map((c) => (
              <li key={c.id} className="truncate text-xs text-text-2">
                <span className="tabular-nums">
                  {time(new Date(c.startAt))}–{time(new Date(c.endAt))}
                </span>{" "}
                {c.title}
              </li>
            ))}
          </ul>
          {conflicts.length > 3 && (
            <p className="mt-1 text-[11px] text-text-3">
              {t("dashboard.calendar.moreEvents").replace("{count}", String(conflicts.length - 3))}
            </p>
          )}
        </section>
      )}

      <section>
        <SectionLabel>{t("dashboard.calendar.previewDetails")}</SectionLabel>
        <div className="rounded-lg border border-border bg-surface px-3 py-1">
          <DetailRow icon={MapPin} label={t("dashboard.calendar.fieldLocation")}>
            {location || <span className="text-text-4">{EMPTY}</span>}
          </DetailRow>
          <DetailRow icon={Clock3} label={t("dashboard.calendar.previewDuration")}>
            {durationText === EMPTY ? <span className="text-text-4">{EMPTY}</span> : durationText}
          </DetailRow>
          {mode === "edit" && (createdAt || updatedAt) ? (
            <DetailRow icon={History} label={t("dashboard.calendar.previewUpdated")}>
              {fmtDateTime(updatedAt || createdAt)}
            </DetailRow>
          ) : null}
        </div>
      </section>

      <section>
        <SectionLabel>
          <span className="flex items-center gap-1.5">
            <FileText size={12} aria-hidden />
            {t("dashboard.calendar.fieldDescription")}
          </span>
        </SectionLabel>
        <div className="rounded-lg border border-border bg-surface p-3">
          {description ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-2">
              {description}
            </p>
          ) : (
            <p className="text-xs text-text-4">{t("dashboard.calendar.previewNoDescription")}</p>
          )}
        </div>
      </section>
    </div>
  );
}
