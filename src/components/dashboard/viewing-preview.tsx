"use client";

// Podgląd prezentacji nieruchomości z oceną gwiazdkową i uczestnikami spotkania

import {
  Bell,
  Clock,
  ImageIcon,
  MessageSquareQuote,
  Timer,
  User,
  UserCircle2,
} from "lucide-react";
import { StatusBadge, VIEWING_STATUS_COLORS } from "@/components/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { fmtDate, fmtDateTime } from "@/lib/dashboard-format";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

const EMPTY = "—";

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function num(v: unknown): number | null {
  const s = str(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function ViewingStars({ value }: { value: number }) {
  const n = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className="whitespace-nowrap" title={`${n}/5`}>
      <span className="text-amber-700 dark:text-amber-400">{"★".repeat(n)}</span>
      <span className="text-text-3">{"★".repeat(5 - n)}</span>
    </span>
  );
}

const RAIL = ["SCHEDULED", "CONFIRMED", "COMPLETED"] as const;
const RAIL_STEP: Record<string, number> = {
  SCHEDULED: 0,
  RESCHEDULED: 0,
  CONFIRMED: 1,
  COMPLETED: 2,
};
const RAIL_ABORTED = new Set(["NO_SHOW", "CANCELLED"]);

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
      <span className="min-w-0 text-right text-sm text-text">{children}</span>
    </div>
  );
}

function Person({
  icon: Icon,
  role,
  name,
  meta,
  avatar,
  fallback,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  role: string;
  name: string;
  meta: string;
  avatar: string;
  fallback: string;
}) {
  const known = Boolean(name);
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface p-2">
      {known ? (
        <Avatar src={avatar || null} name={name} size={32} />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hi text-text-4">
          <Icon size={15} aria-hidden />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wide text-text-4">{role}</span>
        <span className={cn("block truncate text-sm", known ? "text-text" : "text-text-4")}>
          {known ? name : fallback}
        </span>
        {meta ? <span className="block truncate text-[11px] text-text-3">{meta}</span> : null}
      </span>
    </div>
  );
}

export function ViewingPreview({
  values,
  mode,
  outcomeLabel,
}: {
  values: Record<string, unknown>;
  mode: "new" | "edit";
  outcomeLabel?: string | null;
}) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-GB" : "pl-PL";

  const status = str(values.status);
  const start = parseDate(values.scheduledAt);
  const duration = num(values.durationMin);
  const rating = num(values.rating);
  const feedback = str(values.feedback);
  const followUpAt = str(values.followUpAt);

  const propertyId = str(values.propertyId);
  const propertyTitle = str(values.propertyTitle);
  const propertyLocation = str(values.propertyLocation);
  const propertyImage = str(values.propertyImageUrl);
  const contactId = str(values.contactId);
  const contactName = str(values.contactName);
  const contactMeta = str(values.contactPhone) || str(values.contactEmail) || contactId;
  const agentName = str(values.agentName);
  const agentAvatar = str(values.agentAvatarUrl);
  const shortId = str(values.shortId);

  const time = (d: Date) => d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  const end = start && duration ? new Date(start.getTime() + duration * 60_000) : null;
  const weekday = start ? start.toLocaleDateString(dateLocale, { weekday: "long" }) : "";

  const aborted = RAIL_ABORTED.has(status);
  const step = RAIL_STEP[status] ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-4">
          {mode === "edit" && shortId ? `#${shortId}` : t("dashboard.viewings.add")}
        </p>
        <div className="mt-1 flex items-start justify-between gap-2">
          <h3
            className={cn(
              "font-display text-xl font-semibold leading-tight",
              start ? "text-text" : "text-text-4",
            )}
          >
            {start ? fmtDate(start.toISOString()) : EMPTY}
          </h3>
          <StatusBadge value={status} colorMap={VIEWING_STATUS_COLORS} />
        </div>
        <p className="mt-1 text-xs text-text-3">
          {start ? (
            <>
              <span className="capitalize">{weekday}</span>
              {" · "}
              <span className="tabular-nums">
                {time(start)}
                {end ? ` – ${time(end)}` : ""}
              </span>
            </>
          ) : (
            t("dashboard.viewings.previewNoDate")
          )}
        </p>
      </header>

      <section>
        <SectionLabel>{t("dashboard.viewings.previewProgress")}</SectionLabel>
        <ol className="flex items-start gap-1.5">
          {RAIL.map((s, i) => {
            const reached = !aborted && i <= step;
            return (
              <li key={s} className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block h-1.5 rounded-full",
                    reached ? "bg-accent-val" : "bg-border",
                  )}
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
        {aborted ? (
          <p className="mt-1.5 text-[11px] text-danger">{t("dashboard.viewings.previewNotHeld")}</p>
        ) : null}
      </section>

      <section>
        <SectionLabel>{t("dashboard.viewings.colProperty")}</SectionLabel>
        <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
          {propertyImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={propertyImage} alt="" loading="lazy" className="rn-thumb" />
          ) : (
            <span className="rn-thumb rn-thumb--empty">
              <ImageIcon size={16} aria-hidden />
            </span>
          )}
          <span className="min-w-0 flex-1">
            {propertyTitle ? (
              <span className="block truncate text-sm font-medium text-text">{propertyTitle}</span>
            ) : (
              <span className="block truncate text-sm text-text-4">
                {t("dashboard.viewings.previewNoProperty")}
              </span>
            )}
            <span className="block truncate text-xs text-text-3">{propertyLocation || EMPTY}</span>
            {propertyId ? (
              <span className="mt-0.5 block truncate font-mono text-[10px] text-text-4">
                {propertyId}
              </span>
            ) : null}
          </span>
        </div>
      </section>

      <section>
        <SectionLabel>{t("dashboard.viewings.previewPeople")}</SectionLabel>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Person
            icon={User}
            role={t("dashboard.viewings.colContact")}
            name={contactName}
            meta={contactName ? contactMeta : ""}
            avatar=""
            fallback={contactId || t("dashboard.viewings.previewNoContact")}
          />
          <Person
            icon={UserCircle2}
            role={t("dashboard.viewings.colAgent")}
            name={agentName}
            meta=""
            avatar={agentAvatar}
            fallback={t("dashboard.viewings.previewNoAgent")}
          />
        </div>
      </section>

      <section>
        <SectionLabel>{t("dashboard.viewings.previewDetails")}</SectionLabel>
        <div className="rounded-lg border border-border bg-surface px-3 py-1">
          <DetailRow icon={Timer} label={t("dashboard.viewings.colDuration")}>
            {duration ? <span className="tabular-nums">{duration} min</span> : EMPTY}
          </DetailRow>
          <DetailRow icon={Clock} label={t("dashboard.viewings.colOutcome")}>
            {outcomeLabel || <span className="text-text-4">{EMPTY}</span>}
          </DetailRow>
          <DetailRow icon={Bell} label={t("dashboard.viewings.fieldFollowUp")}>
            {followUpAt ? fmtDateTime(followUpAt) : EMPTY}
          </DetailRow>
        </div>
      </section>

      <section>
        <SectionLabel>{t("dashboard.viewings.colRating")}</SectionLabel>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          {rating ? (
            <>
              <ViewingStars value={rating} />
              <span className="text-xs tabular-nums text-text-3">
                {Math.max(0, Math.min(5, Math.round(rating)))}/5
              </span>
            </>
          ) : (
            <span className="text-xs text-text-4">{t("dashboard.viewings.previewNoRating")}</span>
          )}
        </div>
      </section>

      <section>
        <SectionLabel>{t("dashboard.viewings.colFeedback")}</SectionLabel>
        <div className="flex gap-2 rounded-lg border border-[color-mix(in_oklab,var(--accent)_28%,transparent)] bg-accent p-3">
          <MessageSquareQuote
            size={15}
            className="mt-0.5 shrink-0 text-[var(--accent-on-soft)]"
            aria-hidden
          />
          {feedback ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--accent-on-soft)]">
              {feedback}
            </p>
          ) : (
            <p className="text-xs text-[var(--accent-on-soft)] opacity-70">
              {t("dashboard.viewings.previewNoFeedback")}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
