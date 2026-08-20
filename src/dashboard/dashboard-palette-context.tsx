"use client";

// Kontekst React z wybraną paletą pulpitu: wstrzykuje jej zmienne CSS i zapisuje wybór w cookie

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_DASHBOARD_PALETTE_ID,
  PALETTE_COOKIE,
  buildPaletteCss,
  resolvePaletteId,
  type DashboardPaletteId,
} from "@/dashboard/dashboard-palettes";

const STYLE_ID = "rn-palette-vars";

function applyPaletteCss(id: DashboardPaletteId) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = buildPaletteCss(id);
}

interface DashboardPaletteContextValue {
  paletteId: DashboardPaletteId;
  setPaletteId: (id: DashboardPaletteId) => void;
}

const DashboardPaletteContext =
  createContext<DashboardPaletteContextValue | null>(null);

export function DashboardPaletteProvider({
  children,
  initialPaletteId = DEFAULT_DASHBOARD_PALETTE_ID,
}: {
  children: ReactNode;
  initialPaletteId?: DashboardPaletteId;
}) {
  const [paletteId, setPaletteIdState] = useState<DashboardPaletteId>(initialPaletteId);

  const setPaletteId = useCallback((id: DashboardPaletteId) => {
    const next = resolvePaletteId(id);
    setPaletteIdState(next);
    applyPaletteCss(next);
    try {
      document.cookie = `${PALETTE_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
    } catch {
    }
  }, []);

  const value = useMemo(
    () => ({ paletteId, setPaletteId }),
    [paletteId, setPaletteId],
  );

  return (
    <DashboardPaletteContext.Provider value={value}>
      {children}
    </DashboardPaletteContext.Provider>
  );
}

export function useDashboardPalette() {
  const ctx = useContext(DashboardPaletteContext);
  if (!ctx) {
    throw new Error(
      "useDashboardPalette must be used within DashboardPaletteProvider",
    );
  }
  return ctx;
}
