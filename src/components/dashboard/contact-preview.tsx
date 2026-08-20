"use client";

// Podgląd kontaktu ze stanem zgody marketingowej, datą jej udzielenia i notatkami

import {
  AtSign,
  IdCard,
  Phone,
  ShieldCheck,
  ShieldOff,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { CONTACT_KIND_COLORS, StatusBadge } from "@/components/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { fmtDate } from "@/lib/dashboard-format";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

function str(v: unknown): string {
  if (v == null) return "";
  return typeof v === "string" ? v.trim() : String(v);
}

function sourceLabel(t: (k: string) => string, value: string): string {
  if (!value) return "";
  const key = `dashboard.contacts.src${value}`;
  const label = t(key);
  return label === key ? value : label;
}

function DetailRow({
  icon: Icon,
  label,
  value,
  breakAll,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <>
      <dt className="flex items-center gap-1.5 pt-0.5 text-[11px] font-medium uppercase tracking-wide text-text-3">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </dt>
      <dd
        className={cn(
          "min-w-0 text-sm",
          breakAll ? "break-all" : "break-words",
          value ? "text-foreground" : "text-text-3",
        )}
      >
        {value || "—"}
      </dd>
    </>
  );
}

export function ContactPreview({
  values,
  mode,
}: {
  values: Record<string, unknown>;
  mode: "new" | "edit";
}) {
  const { t } = useI18n();

  const name = str(values.name);
  const kind = str(values.kind);
  const email = str(values.email);
  const phone = str(values.phone);
  const role = str(values.role);
  const source = str(values.source);
  const notes = str(values.notes);
  const consent = Boolean(values.consent);
  const consentGivenAt = str(values.consentGivenAt);
  const shortId = str(values.shortId);

  const tracked = [name, kind, email, phone, role, source, notes];
  const filled = tracked.filter(Boolean).length;
  const pct = Math.round((filled / tracked.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Avatar name={name || "?"} size={48} className="rounded-2xl ring-1 ring-border" />

        <div className="min-w-0 flex-1 space-y-1">
          <h3
            className={cn(
              "break-words font-display text-lg font-semibold leading-tight",
              name ? "text-foreground" : "text-text-3",
            )}
          >
            {name || t("dashboard.contacts.previewNoName")}
          </h3>
          <p className="text-[11px] text-text-3">
            {mode === "edit" && shortId ? `#${shortId}` : t("dashboard.contacts.previewDraft")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge colorMap={CONTACT_KIND_COLORS} value={kind || null} />
        <span className="rn-badge border border-border bg-surface text-text-2">
          <Tag className="h-3 w-3" aria-hidden />
          {source ? sourceLabel(t, source) : "—"}
        </span>
      </div>

      {mode === "new" && filled === 0 ? (
        <p className="text-xs leading-relaxed text-text-3">
          {t("dashboard.contacts.previewNewHint")}
        </p>
      ) : null}

      <section className="rounded-xl border border-border bg-surface p-3">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">
          {t("dashboard.contacts.previewSectionDetails")}
        </p>
        <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2.5">
          <DetailRow icon={IdCard} label={t("dashboard.contacts.colRole")} value={role} />
          <DetailRow icon={AtSign} label={t("dashboard.contacts.colEmail")} value={email} breakAll />
          <DetailRow icon={Phone} label={t("dashboard.contacts.colPhone")} value={phone} />
        </dl>
      </section>

      <section
        className={cn(
          "flex items-start gap-2.5 rounded-xl border p-3",
          consent
            ? "border-[color-mix(in_oklab,var(--rn-green)_45%,transparent)] bg-[color-mix(in_oklab,var(--rn-green)_10%,transparent)]"
            : "border-border bg-surface",
        )}
      >
        {consent ? (
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--rn-green)]" aria-hidden />
        ) : (
          <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-text-3" aria-hidden />
        )}
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            {consent
              ? t("dashboard.contacts.previewConsentGranted")
              : t("dashboard.contacts.previewConsentMissing")}
          </p>
          <p className="text-[11px] leading-relaxed text-text-3">
            {!consent
              ? t("dashboard.contacts.previewConsentBlocked")
              : consentGivenAt
                ? t("dashboard.contacts.consentGivenOn").replace("{date}", fmtDate(consentGivenAt))
                : t("dashboard.contacts.previewConsentPending")}
          </p>
        </div>
      </section>

      <section className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
          {t("dashboard.common.notes")}
        </p>
        <p
          className={cn(
            "whitespace-pre-line break-words text-sm leading-relaxed",
            notes ? "text-text-2" : "text-text-3",
          )}
        >
          {notes || "—"}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
            {t("dashboard.contacts.previewCompleteness")}
          </span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {filled}/{tracked.length}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-hi" aria-hidden>
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-text-3">
          {t("dashboard.contacts.previewCompletenessHint")
            .replace("{filled}", String(filled))
            .replace("{total}", String(tracked.length))}
        </p>
      </section>
    </div>
  );
}
