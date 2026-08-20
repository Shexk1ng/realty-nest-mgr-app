"use client";

// Pole listy kontrolnej z zaznaczaniem pozycji, używane przy formalnościach transakcji

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";

export interface ChecklistEntry {
  key: string;
  label: string;
  done: boolean;
}

export interface ChecklistCatalogueItem {
  key: string;
  label: string;
  hint?: string;
}

export function ChecklistField({
  catalogue,
  value,
  onChange,
  id,
  ariaLabelledBy,
  describedBy,
}: {
  catalogue: ChecklistCatalogueItem[];
  value: ChecklistEntry[];
  onChange: (next: ChecklistEntry[]) => void;
  id?: string;
  ariaLabelledBy?: string;
  describedBy?: string;
}) {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const value_ = t(key);
    return value_ === key ? fallback : value_;
  };
  const doneKeys = new Set(value.filter((v) => v.done).map((v) => v.key));

  const toggle = (key: string) => {
    onChange(
      catalogue.map((c) => ({
        key: c.key,
        label: c.label,
        done: c.key === key ? !doneKeys.has(key) : doneKeys.has(c.key),
      })),
    );
  };

  const done = catalogue.filter((c) => doneKeys.has(c.key)).length;
  const total = catalogue.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div
      id={id}
      role="group"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={describedBy}
      className="rounded-xl border border-border/60"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2.5">
        <span className="text-xs font-semibold text-foreground">
          {tf("common.crud.checklistProgress", "Spełniono {done} z {total}")
            .replaceAll("{done}", String(done))
            .replaceAll("{total}", String(total))}
        </span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className={cn("h-full rounded-full transition-all", done === total ? "bg-emerald-500" : "bg-primary")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
        </div>
      </div>

      <ul className="divide-y divide-border/60">
        {catalogue.map((item) => {
          const checked = doneKeys.has(item.key);
          return (
            <li key={item.key}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(item.key)}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    checked ? "border-primary bg-primary text-white" : "border-border bg-transparent",
                  )}
                  aria-hidden
                >
                  {checked && <Check size={11} strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-xs font-medium",
                      checked ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.hint && (
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{item.hint}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
