"use client";

// Podgląd transakcji ze stronami umowy, kwotami prowizji i czasem jej trwania

import { CalendarClock, Check, FileText, Home, StickyNote, User } from "lucide-react";
import { StatusBadge, TRANSACTION_STATUS_COLORS } from "@/components/ui/status-badge";
import type { ChecklistCatalogueItem, ChecklistEntry } from "@/components/ui/checklist-field";
import { fmtDate, fmtNumber, type BadgeColor } from "@/lib/dashboard-format";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

const EMPTY = "—";

const KIND_COLORS: Record<string, BadgeColor> = { SALE: "green", RENT: "blue", LEASE: "violet" };

function text(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function number(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function money(n: number | null, currency: string): string {
  if (n == null) return EMPTY;
  return `${fmtNumber(Math.round(n))} ${currency || "PLN"}`;
}

function daysBetween(from: string, to: string): number | null {
  if (!from || !to) return null;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {children}
    </p>
  );
}

function Pair({
  label,
  value,
  filled,
  strong,
}: {
  label: string;
  value: string;
  filled: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-[11px] text-text-3">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words text-right tabular-nums",
          strong ? "text-sm font-semibold" : "text-xs font-medium",
          filled ? "text-foreground" : "text-text-3",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Party({ role, name }: { role: string; name: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
          name
            ? "bg-accent text-accent-val"
            : "border border-dashed border-border text-text-3",
        )}
        aria-hidden
      >
        {name ? initials(name) : <User className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wide text-text-3">{role}</span>
        <span
          className={cn(
            "block truncate text-xs font-medium",
            name ? "text-foreground" : "text-text-3",
          )}
        >
          {name || EMPTY}
        </span>
      </span>
    </div>
  );
}

export interface TransactionPreviewProps {
  values: Record<string, unknown>;
  mode: "new" | "edit";
  catalogue: ChecklistCatalogueItem[];
  kindLabel: (value: string) => string;
}

export function TransactionPreview({ values, mode, catalogue, kindLabel }: TransactionPreviewProps) {
  const { t } = useI18n();

  const kind = text(values.kind);
  const status = text(values.status);
  const currency = text(values.currency) || "PLN";
  const price = number(values.price);
  const deposit = number(values.deposit);
  const propertyId = text(values.propertyId);
  const buyer = text(values.buyerName);
  const seller = text(values.sellerName);
  const signedAt = text(values.signedAt);
  const closedAt = text(values.closedAt);
  const notes = text(values.notes);

  const balance = price == null ? null : price - (deposit ?? 0);
  const depositPct =
    price != null && price > 0 && deposit != null && deposit > 0
      ? Math.min(100, Math.round((deposit / price) * 100))
      : 0;

  const duration = daysBetween(signedAt, closedAt);

  const entries = Array.isArray(values.checklist) ? (values.checklist as ChecklistEntry[]) : [];
  const doneKeys = new Set(entries.filter((c) => c?.done).map((c) => c.key));
  const doneCount = catalogue.filter((c) => doneKeys.has(c.key)).length;
  const total = catalogue.length;
  const donePct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const allDone = total > 0 && doneCount === total;

  const untouched = price == null && !propertyId && !buyer && !seller && !notes;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
          {t("dashboard.transactions.previewAmountLabel")}
        </p>
        <p
          className={cn(
            "mt-0.5 font-display text-2xl font-semibold tabular-nums tracking-tight",
            price == null ? "text-text-3" : "text-foreground",
          )}
        >
          {money(price, currency)}
        </p>

        <p className="mt-1.5 flex items-center gap-1.5 text-xs">
          <Home className="h-3.5 w-3.5 shrink-0 text-text-3" aria-hidden />
          <span className="text-text-3">{t("dashboard.common.propertyId")}:</span>
          <span className={cn("truncate font-mono", propertyId ? "text-text-2" : "text-text-3")}>
            {propertyId || EMPTY}
          </span>
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge value={status || null} colorMap={TRANSACTION_STATUS_COLORS} />
          {kind ? (
            <StatusBadge value={kind} colorMap={KIND_COLORS} label={kindLabel(kind)} />
          ) : (
            <StatusBadge value={null} colorMap={KIND_COLORS} />
          )}
        </div>

        {mode === "new" && untouched && (
          <p className="mt-2.5 rounded-lg border border-dashed border-border px-3 py-2 text-[11px] leading-relaxed text-text-3">
            {t("dashboard.transactions.previewEmptyHint")}
          </p>
        )}
      </header>

      <section className="rounded-xl border border-border bg-surface p-3">
        <SectionTitle icon={User}>{t("dashboard.transactions.previewParties")}</SectionTitle>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Party role={t("dashboard.transactions.colBuyer")} name={buyer} />
          <Party role={t("dashboard.transactions.colSeller")} name={seller} />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-3">
        <SectionTitle icon={FileText}>{t("dashboard.transactions.previewSettlement")}</SectionTitle>

        <div className="mb-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${depositPct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-text-3">
            {t("dashboard.transactions.previewDepositShare").replace("{pct}", String(depositPct))}
          </p>
        </div>

        <dl className="divide-y divide-border">
          <Pair
            label={t("dashboard.transactions.colPrice")}
            value={money(price, currency)}
            filled={price != null}
          />
          <Pair
            label={t("dashboard.transactions.colDeposit")}
            value={money(deposit, currency)}
            filled={deposit != null}
          />
          <Pair
            label={t("dashboard.transactions.previewBalance")}
            value={money(balance, currency)}
            filled={balance != null}
            strong
          />
        </dl>
      </section>

      <section>
        <SectionTitle icon={CalendarClock}>{t("dashboard.transactions.previewDates")}</SectionTitle>
        <dl className="divide-y divide-border">
          <Pair
            label={t("dashboard.transactions.fieldSignedAt")}
            value={signedAt ? fmtDate(signedAt) : EMPTY}
            filled={Boolean(signedAt)}
          />
          <Pair
            label={t("dashboard.transactions.fieldClosedAt")}
            value={closedAt ? fmtDate(closedAt) : EMPTY}
            filled={Boolean(closedAt)}
          />
          <Pair
            label={t("dashboard.transactions.previewDuration")}
            value={
              duration == null
                ? EMPTY
                : t("dashboard.transactions.previewDurationDays").replace("{days}", String(duration))
            }
            filled={duration != null}
          />
        </dl>
      </section>

      <section>
        <SectionTitle icon={Check}>{t("dashboard.transactions.colChecklist")}</SectionTitle>

        <div className="mb-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className={cn("h-full rounded-full transition-all", allDone ? "bg-success" : "bg-primary")}
              style={{ width: `${donePct}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-text-3">
            {doneCount}/{total}
          </span>
        </div>

        <ul className="space-y-1">
          {catalogue.map((item) => {
            const checked = doneKeys.has(item.key);
            return (
              <li key={item.key} className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-transparent",
                  )}
                  aria-hidden
                >
                  {checked && <Check size={9} strokeWidth={3.5} />}
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-snug",
                    checked ? "text-foreground" : "text-text-3",
                  )}
                >
                  {item.label}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <SectionTitle icon={StickyNote}>{t("dashboard.common.notes")}</SectionTitle>
        <p
          className={cn(
            "whitespace-pre-wrap text-xs leading-relaxed",
            notes ? "text-text-2" : "text-text-3",
          )}
        >
          {notes || t("dashboard.transactions.previewNotesEmpty")}
        </p>
      </section>
    </div>
  );
}
