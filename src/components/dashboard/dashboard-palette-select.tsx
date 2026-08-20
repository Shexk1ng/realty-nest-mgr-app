"use client";

// Wybór palety kolorystycznej pulpitu z podglądem próbek barw

import { Check, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import {
  DASHBOARD_PALETTE_ORDER,
  DASHBOARD_PALETTES,
  DEFAULT_DASHBOARD_PALETTE_ID,
  type DashboardPaletteId,
} from "@/dashboard/dashboard-palettes";
import { useDashboardPalette } from "@/dashboard/dashboard-palette-context";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

function SwatchPair({
  id,
  mode,
}: {
  id: DashboardPaletteId;
  mode: "light" | "dark";
}) {
  const t = DASHBOARD_PALETTES[id][mode];
  const primary = t.primary ?? "#000";
  const bg = t.background ?? "#fff";
  return (
    <span className="flex items-center gap-1" aria-hidden>
      <span
        className="h-6 w-6 rounded-md border border-border/80 shadow-sm"
        style={{ backgroundColor: primary }}
      />
      <span
        className="h-6 w-6 rounded-md border border-border/80 shadow-sm"
        style={{ backgroundColor: bg }}
      />
    </span>
  );
}

export function DashboardPaletteSelect() {
  const { paletteId, setPaletteId } = useDashboardPalette();
  const { resolvedTheme } = useTheme();
  const { messages } = useI18n();
  const copy = messages.dashboard.settings;
  const paletteNames = messages.dashboard.palettes;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const mode = resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const paletteLabel = (id: DashboardPaletteId) =>
    paletteNames[id as keyof typeof paletteNames] ?? id;

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <Button
        type="button"
        variant="outline"
        className="h-auto w-full justify-between gap-3 rounded-xl border-border/80 bg-card px-3 py-2.5 text-left font-normal shadow-sm"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <SwatchPair id={paletteId} mode={mode} />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">
                {paletteLabel(paletteId)}
              </span>
              {paletteId === DEFAULT_DASHBOARD_PALETTE_ID ? (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-on-soft">
                  {copy.defaultPaletteBadge}
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {copy.paletteHint}
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </Button>

      {open ? (
        <ul
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(70vh,420px)] overflow-auto rounded-xl border border-border/80 bg-popover p-1.5 shadow-lg ring-1 ring-black/5"
          role="listbox"
        >
          {DASHBOARD_PALETTE_ORDER.map((id) => {
            const selected = id === paletteId;
            return (
              <li key={id} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    selected
                      ? "bg-primary/12 text-foreground"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  )}
                  onClick={() => {
                    setPaletteId(id);
                    setOpen(false);
                  }}
                >
                  <SwatchPair id={id} mode={mode} />
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="font-medium">{paletteLabel(id)}</span>
                    {id === DEFAULT_DASHBOARD_PALETTE_ID ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {copy.defaultPaletteBadge}
                      </span>
                    ) : null}
                  </span>
                  {selected ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
