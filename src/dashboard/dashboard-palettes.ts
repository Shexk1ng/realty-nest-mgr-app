// Definicje palet kolorów pulpitu i budowanie z nich zmiennych CSS

import type { CSSProperties } from "react";

export type DashboardPaletteId =
  | "minimal"
  | "default"
  | "amber"
  | "clay"
  | "earth"
  | "mono"
  | "aurora"
  | "emerald"
  | "ocean"
  | "rose"
  | "slate";

export const DASHBOARD_PALETTE_ORDER: DashboardPaletteId[] = [
  "minimal",
  "default",
  "amber",
  "clay",
  "earth",
  "mono",
  "aurora",
  "emerald",
  "ocean",
  "rose",
  "slate",
];

const GEOMETRY_KEYS = ["radius", "radius-sm", "radius-md", "radius-lg", "radius-xl", "radius-2xl", "radius-full"];

function stripGeometry(tokens: CssVarMap): CssVarMap {
  const out: CssVarMap = {};
  for (const [k, v] of Object.entries(tokens)) {
    if (!GEOMETRY_KEYS.includes(k)) out[k] = v;
  }
  return out;
}

export type CssVarMap = Record<string, string>;

function mergeTokens(
  base: CssVarMap,
  ...overrides: Partial<CssVarMap>[]
): CssVarMap {
  return stripGeometry(Object.assign({}, base, ...overrides));
}

const MINIMAL_LIGHT: CssVarMap = {
  background: "#ffffff",
  foreground: "#262626",
  card: "#ffffff",
  "card-foreground": "#262626",
  popover: "#ffffff",
  "popover-foreground": "#262626",
  primary: "#3b82f6",
  "primary-foreground": "#ffffff",
  secondary: "#f3f4f6",
  "secondary-foreground": "#4b5563",
  muted: "#f7f8fa",
  "muted-foreground": "#6b7280",
  accent: "#eff6ff",
  "accent-foreground": "#1e40af",
  destructive: "#ef4444",
  "destructive-foreground": "#ffffff",
  border: "#e8eaed",
  input: "#e8eaed",
  ring: "#3b82f6",
  radius: "0.5rem",
  highlight: "#d97706",
  "highlight-soft": "#fff7ed",
  success: "#10b981",
  "success-soft": "#ecfdf5",
};

const MINIMAL_DARK: CssVarMap = {
  background: "#171717",
  foreground: "#e6e6e6",
  card: "#1f1f1f",
  "card-foreground": "#e6e6e6",
  popover: "#1f1f1f",
  "popover-foreground": "#e6e6e6",
  primary: "#60a5fa",
  "primary-foreground": "#0b1220",
  secondary: "#262626",
  "secondary-foreground": "#e6e6e6",
  muted: "#212121",
  "muted-foreground": "#a3a3a3",
  accent: "#1e293b",
  "accent-foreground": "#bfdbfe",
  destructive: "#f87171",
  "destructive-foreground": "#450a0a",
  border: "#2e2e2e",
  input: "#2e2e2e",
  ring: "#60a5fa",
  radius: "0.5rem",
  highlight: "#fbbf24",
  "highlight-soft": "rgba(251, 191, 36, 0.12)",
  success: "#34d399",
  "success-soft": "rgba(52, 211, 153, 0.12)",
};

const DEFAULT_LIGHT: CssVarMap = {
  background: "#f5f7fb",
  foreground: "#0f172a",
  card: "#ffffff",
  "card-foreground": "#0f172a",
  popover: "#ffffff",
  "popover-foreground": "#0f172a",
  primary: "#1d4ed8",
  "primary-foreground": "#f8fafc",
  secondary: "#e2e8f0",
  "secondary-foreground": "#0f172a",
  muted: "#eef2f7",
  "muted-foreground": "#64748b",
  accent: "#dbeafe",
  "accent-foreground": "#1e3a8a",
  destructive: "#b91c1c",
  "destructive-foreground": "#fef2f2",
  border: "#e2e8f0",
  input: "#e2e8f0",
  ring: "#2563eb",
  radius: "0.75rem",
  highlight: "#d97706",
  "highlight-soft": "#fff7ed",
  success: "#10b981",
  "success-soft": "#ecfdf5",
};

const DEFAULT_DARK: CssVarMap = {
  background: "#0b0f14",
  foreground: "#f1f5f9",
  card: "#121820",
  "card-foreground": "#f1f5f9",
  popover: "#121820",
  "popover-foreground": "#f1f5f9",
  primary: "#60a5fa",
  "primary-foreground": "#0f172a",
  secondary: "#1e293b",
  "secondary-foreground": "#f1f5f9",
  muted: "#1a222d",
  "muted-foreground": "#94a3b8",
  accent: "#1e3a8a",
  "accent-foreground": "#dbeafe",
  destructive: "#f87171",
  "destructive-foreground": "#450a0a",
  border: "#2a3441",
  input: "#2a3441",
  ring: "#3b82f6",
  radius: "0.75rem",
  highlight: "#fbbf24",
  "highlight-soft": "rgba(251, 191, 36, 0.12)",
  success: "#34d399",
  "success-soft": "rgba(52, 211, 153, 0.12)",
};

const AMBER_LIGHT: CssVarMap = {
  card: "#ffffff",
  ring: "#f59e0b",
  input: "#e5e7eb",
  muted: "#f9fafb",
  accent: "#fffbeb",
  border: "#e5e7eb",
  radius: "0.375rem",
  popover: "#ffffff",
  primary: "#f59e0b",
  secondary: "#f3f4f6",
  background: "#ffffff",
  foreground: "#262626",
  destructive: "#ef4444",
  "card-foreground": "#262626",
  "muted-foreground": "#6b7280",
  "accent-foreground": "#92400e",
  "popover-foreground": "#262626",
  "primary-foreground": "#000000",
  "secondary-foreground": "#4b5563",
  "destructive-foreground": "#ffffff",
  highlight: "#d97706",
  "highlight-soft": "#fff7ed",
  success: "#10b981",
  "success-soft": "#ecfdf5",
};

const AMBER_DARK: CssVarMap = {
  card: "#262626",
  ring: "#f59e0b",
  input: "#404040",
  muted: "#262626",
  accent: "#92400e",
  border: "#404040",
  popover: "#262626",
  primary: "#f59e0b",
  secondary: "#262626",
  background: "#171717",
  foreground: "#e5e5e5",
  destructive: "#ef4444",
  "card-foreground": "#e5e5e5",
  "muted-foreground": "#a3a3a3",
  "accent-foreground": "#fde68a",
  "popover-foreground": "#e5e5e5",
  "primary-foreground": "#000000",
  "secondary-foreground": "#e5e5e5",
  "destructive-foreground": "#ffffff",
  radius: "0.375rem",
  highlight: "#fbbf24",
  "highlight-soft": "rgba(251, 191, 36, 0.12)",
  success: "#34d399",
  "success-soft": "rgba(52, 211, 153, 0.12)",
};

const CLAY_LIGHT: CssVarMap = {
  card: "#fcfcfc",
  ring: "#644a40",
  input: "#d8d8d8",
  muted: "#efefef",
  accent: "#e8e8e8",
  border: "#d8d8d8",
  radius: "0.5rem",
  popover: "#fcfcfc",
  primary: "#644a40",
  secondary: "#ffdfb5",
  background: "#f9f9f9",
  foreground: "#202020",
  destructive: "#e54d2e",
  "card-foreground": "#202020",
  "muted-foreground": "#646464",
  "accent-foreground": "#202020",
  "popover-foreground": "#202020",
  "primary-foreground": "#ffffff",
  "secondary-foreground": "#582d1d",
  "destructive-foreground": "#ffffff",
  highlight: "#d97706",
  "highlight-soft": "#fff7ed",
  success: "#10b981",
  "success-soft": "#ecfdf5",
};

const CLAY_DARK: CssVarMap = {
  card: "#191919",
  ring: "#ffe0c2",
  input: "#484848",
  muted: "#222222",
  accent: "#2a2a2a",
  border: "#201e18",
  radius: "0.5rem",
  popover: "#191919",
  primary: "#ffe0c2",
  secondary: "#393028",
  background: "#111111",
  foreground: "#eeeeee",
  destructive: "#e54d2e",
  "card-foreground": "#eeeeee",
  "muted-foreground": "#b4b4b4",
  "accent-foreground": "#eeeeee",
  "popover-foreground": "#eeeeee",
  "primary-foreground": "#081a1b",
  "secondary-foreground": "#ffe0c2",
  "destructive-foreground": "#ffffff",
  highlight: "#fbbf24",
  "highlight-soft": "rgba(251, 191, 36, 0.12)",
  success: "#34d399",
  "success-soft": "rgba(52, 211, 153, 0.12)",
};

const EARTH_LIGHT: CssVarMap = {
  card: "#faf9f5",
  ring: "#c96442",
  input: "#b4b2a7",
  muted: "#ede9de",
  accent: "#e9e6dc",
  border: "#dad9d4",
  radius: "0.5rem",
  popover: "#ffffff",
  primary: "#c96442",
  secondary: "#e9e6dc",
  background: "#faf9f5",
  foreground: "#3d3929",
  destructive: "#141413",
  "card-foreground": "#141413",
  "muted-foreground": "#83827d",
  "accent-foreground": "#28261b",
  "popover-foreground": "#28261b",
  "primary-foreground": "#ffffff",
  "secondary-foreground": "#535146",
  "destructive-foreground": "#ffffff",
  highlight: "#d97706",
  "highlight-soft": "#fff7ed",
  success: "#10b981",
  "success-soft": "#ecfdf5",
};

const EARTH_DARK: CssVarMap = {
  card: "#262624",
  ring: "#d97757",
  input: "#52514a",
  muted: "#1b1b19",
  accent: "#1a1915",
  border: "#3e3e38",
  popover: "#30302e",
  primary: "#d97757",
  secondary: "#faf9f5",
  background: "#262624",
  foreground: "#c3c0b6",
  destructive: "#ef4444",
  "card-foreground": "#faf9f5",
  "muted-foreground": "#b7b5a9",
  "accent-foreground": "#f5f4ee",
  "popover-foreground": "#e5e5e2",
  "primary-foreground": "#ffffff",
  "secondary-foreground": "#30302e",
  "destructive-foreground": "#ffffff",
  radius: "0.5rem",
  highlight: "#fbbf24",
  "highlight-soft": "rgba(251, 191, 36, 0.12)",
  success: "#34d399",
  "success-soft": "rgba(52, 211, 153, 0.12)",
};

const MONO_LIGHT: CssVarMap = {
  card: "#ffffff",
  ring: "#a1a1a1",
  input: "#e5e5e5",
  muted: "#f5f5f5",
  accent: "#f5f5f5",
  border: "#e5e5e5",
  radius: "0.625rem",
  popover: "#ffffff",
  primary: "#171717",
  secondary: "#f5f5f5",
  background: "#ffffff",
  foreground: "#0a0a0a",
  destructive: "#e7000b",
  "card-foreground": "#0a0a0a",
  "muted-foreground": "#737373",
  "accent-foreground": "#171717",
  "popover-foreground": "#0a0a0a",
  "primary-foreground": "#fafafa",
  "secondary-foreground": "#171717",
  "destructive-foreground": "#ffffff",
  highlight: "#d97706",
  "highlight-soft": "#fff7ed",
  success: "#10b981",
  "success-soft": "#ecfdf5",
};

const MONO_DARK: CssVarMap = {
  card: "#0a0a0a",
  ring: "#525252",
  input: "#262626",
  muted: "#262626",
  accent: "#262626",
  border: "#262626",
  popover: "#0a0a0a",
  primary: "#fafafa",
  secondary: "#262626",
  background: "#0a0a0a",
  foreground: "#fafafa",
  destructive: "#e7000b",
  "card-foreground": "#fafafa",
  "muted-foreground": "#a1a1a1",
  "accent-foreground": "#fafafa",
  "popover-foreground": "#fafafa",
  "primary-foreground": "#0a0a0a",
  "secondary-foreground": "#fafafa",
  "destructive-foreground": "#ffffff",
  radius: "0.625rem",
  highlight: "#fbbf24",
  "highlight-soft": "rgba(251, 191, 36, 0.12)",
  success: "#34d399",
  "success-soft": "rgba(52, 211, 153, 0.12)",
};

const AURORA_LIGHT: CssVarMap = {
  card: "#fdfdfd",
  ring: "#000000",
  input: "#ebebeb",
  muted: "#f5f5f5",
  accent: "#e2ebff",
  border: "#e7e7ee",
  radius: "1.4rem",
  popover: "#fcfcfc",
  primary: "#7033ff",
  secondary: "#edf0f4",
  background: "#fdfdfd",
  foreground: "#000000",
  destructive: "#e54b4f",
  "card-foreground": "#000000",
  "muted-foreground": "#525252",
  "accent-foreground": "#1e69dc",
  "popover-foreground": "#000000",
  "primary-foreground": "#ffffff",
  "secondary-foreground": "#080808",
  "destructive-foreground": "#ffffff",
  highlight: "#d97706",
  "highlight-soft": "#fff7ed",
  success: "#10b981",
  "success-soft": "#ecfdf5",
};

const AURORA_DARK: CssVarMap = {
  card: "#222327",
  ring: "#8c5cff",
  input: "#33353a",
  muted: "#2a2c33",
  accent: "#1e293b",
  border: "#33353a",
  radius: "1.4rem",
  popover: "#222327",
  primary: "#8c5cff",
  secondary: "#2a2c33",
  background: "#1a1b1e",
  foreground: "#f0f0f0",
  destructive: "#f87171",
  "card-foreground": "#f0f0f0",
  "muted-foreground": "#a0a0a0",
  "accent-foreground": "#79c0ff",
  "popover-foreground": "#f0f0f0",
  "primary-foreground": "#ffffff",
  "secondary-foreground": "#f0f0f0",
  "destructive-foreground": "#ffffff",
  highlight: "#fbbf24",
  "highlight-soft": "rgba(251, 191, 36, 0.12)",
  success: "#34d399",
  "success-soft": "rgba(52, 211, 153, 0.12)",
};

const EMERALD_LIGHT: CssVarMap = mergeTokens(DEFAULT_LIGHT, {
  background: "#ecfdf5",
  foreground: "#064e3b",
  card: "#ffffff",
  "card-foreground": "#064e3b",
  popover: "#ffffff",
  "popover-foreground": "#064e3b",
  primary: "#059669",
  "primary-foreground": "#ffffff",
  secondary: "#d1fae5",
  "secondary-foreground": "#064e3b",
  muted: "#d1fae5",
  "muted-foreground": "#047857",
  accent: "#a7f3d0",
  "accent-foreground": "#064e3b",
  border: "#a7f3d0",
  input: "#a7f3d0",
  ring: "#059669",
});

const EMERALD_DARK: CssVarMap = mergeTokens(DEFAULT_DARK, {
  background: "#052e16",
  foreground: "#ecfdf5",
  card: "#0c1f14",
  "card-foreground": "#ecfdf5",
  popover: "#0c1f14",
  "popover-foreground": "#ecfdf5",
  primary: "#34d399",
  "primary-foreground": "#052e16",
  secondary: "#14532d",
  "secondary-foreground": "#ecfdf5",
  muted: "#14532d",
  "muted-foreground": "#a7f3d0",
  accent: "#166534",
  "accent-foreground": "#ecfdf5",
  border: "#166534",
  input: "#166534",
  ring: "#34d399",
});

const OCEAN_LIGHT: CssVarMap = {
  background: "#f0f9ff",
  foreground: "#0c1a2e",
  card: "#ffffff",
  "card-foreground": "#0c1a2e",
  popover: "#ffffff",
  "popover-foreground": "#0c1a2e",
  primary: "#0284c7",
  "primary-foreground": "#ffffff",
  secondary: "#e0f2fe",
  "secondary-foreground": "#0c1a2e",
  muted: "#e0f2fe",
  "muted-foreground": "#0369a1",
  accent: "#bae6fd",
  "accent-foreground": "#0c4a6e",
  destructive: "#dc2626",
  "destructive-foreground": "#fff",
  border: "#bae6fd",
  input: "#bae6fd",
  ring: "#0284c7",
  radius: "0.75rem",
  highlight: "#0891b2",
  "highlight-soft": "#e0f2fe",
  success: "#10b981",
  "success-soft": "#ecfdf5",
};

const OCEAN_DARK: CssVarMap = {
  background: "#030d1a",
  foreground: "#e0f2fe",
  card: "#06172a",
  "card-foreground": "#e0f2fe",
  popover: "#06172a",
  "popover-foreground": "#e0f2fe",
  primary: "#38bdf8",
  "primary-foreground": "#030d1a",
  secondary: "#0c2d4a",
  "secondary-foreground": "#e0f2fe",
  muted: "#0a2237",
  "muted-foreground": "#7dd3fc",
  accent: "#0c4a6e",
  "accent-foreground": "#bae6fd",
  destructive: "#f87171",
  "destructive-foreground": "#450a0a",
  border: "#0c3a5e",
  input: "#0c3a5e",
  ring: "#38bdf8",
  radius: "0.75rem",
  highlight: "#38bdf8",
  "highlight-soft": "rgba(56, 189, 248, 0.12)",
  success: "#34d399",
  "success-soft": "rgba(52, 211, 153, 0.12)",
};

const ROSE_LIGHT: CssVarMap = {
  background: "#fff1f2",
  foreground: "#1a0a0f",
  card: "#ffffff",
  "card-foreground": "#1a0a0f",
  popover: "#ffffff",
  "popover-foreground": "#1a0a0f",
  primary: "#e11d48",
  "primary-foreground": "#ffffff",
  secondary: "#fce7f3",
  "secondary-foreground": "#1a0a0f",
  muted: "#fce7f3",
  "muted-foreground": "#be185d",
  accent: "#fbcfe8",
  "accent-foreground": "#831843",
  destructive: "#dc2626",
  "destructive-foreground": "#fff",
  border: "#fbcfe8",
  input: "#fbcfe8",
  ring: "#e11d48",
  radius: "0.75rem",
  highlight: "#be185d",
  "highlight-soft": "#fce7f3",
  success: "#10b981",
  "success-soft": "#ecfdf5",
};

const ROSE_DARK: CssVarMap = {
  background: "#160610",
  foreground: "#fce7f3",
  card: "#220a17",
  "card-foreground": "#fce7f3",
  popover: "#220a17",
  "popover-foreground": "#fce7f3",
  primary: "#fb7185",
  "primary-foreground": "#160610",
  secondary: "#3d0e24",
  "secondary-foreground": "#fce7f3",
  muted: "#2a0818",
  "muted-foreground": "#fda4af",
  accent: "#831843",
  "accent-foreground": "#fce7f3",
  destructive: "#f87171",
  "destructive-foreground": "#450a0a",
  border: "#4c0e28",
  input: "#4c0e28",
  ring: "#fb7185",
  radius: "0.75rem",
  highlight: "#fb7185",
  "highlight-soft": "rgba(251, 113, 133, 0.12)",
  success: "#34d399",
  "success-soft": "rgba(52, 211, 153, 0.12)",
};

const SLATE_LIGHT: CssVarMap = {
  background: "#f8fafc",
  foreground: "#0f172a",
  card: "#ffffff",
  "card-foreground": "#0f172a",
  popover: "#ffffff",
  "popover-foreground": "#0f172a",
  primary: "#334155",
  "primary-foreground": "#f8fafc",
  secondary: "#f1f5f9",
  "secondary-foreground": "#0f172a",
  muted: "#f1f5f9",
  "muted-foreground": "#64748b",
  accent: "#e2e8f0",
  "accent-foreground": "#0f172a",
  destructive: "#dc2626",
  "destructive-foreground": "#fff",
  border: "#e2e8f0",
  input: "#e2e8f0",
  ring: "#475569",
  radius: "0.5rem",
  highlight: "#d97706",
  "highlight-soft": "#fff7ed",
  success: "#10b981",
  "success-soft": "#ecfdf5",
};

const SLATE_DARK: CssVarMap = {
  background: "#0f172a",
  foreground: "#f1f5f9",
  card: "#1e293b",
  "card-foreground": "#f1f5f9",
  popover: "#1e293b",
  "popover-foreground": "#f1f5f9",
  primary: "#94a3b8",
  "primary-foreground": "#0f172a",
  secondary: "#1e293b",
  "secondary-foreground": "#f1f5f9",
  muted: "#1e293b",
  "muted-foreground": "#64748b",
  accent: "#334155",
  "accent-foreground": "#f1f5f9",
  destructive: "#f87171",
  "destructive-foreground": "#450a0a",
  border: "#334155",
  input: "#334155",
  ring: "#94a3b8",
  radius: "0.5rem",
  highlight: "#fbbf24",
  "highlight-soft": "rgba(251, 191, 36, 0.12)",
  success: "#34d399",
  "success-soft": "rgba(52, 211, 153, 0.12)",
};

export const DASHBOARD_PALETTES: Record<
  DashboardPaletteId,
  { light: CssVarMap; dark: CssVarMap }
> = {
  minimal: {
    light: mergeTokens(MINIMAL_LIGHT),
    dark: mergeTokens(MINIMAL_DARK),
  },
  default: {
    light: mergeTokens(DEFAULT_LIGHT),
    dark: mergeTokens(DEFAULT_DARK),
  },
  amber: { light: mergeTokens(AMBER_LIGHT), dark: mergeTokens(AMBER_DARK) },
  clay: { light: mergeTokens(CLAY_LIGHT), dark: mergeTokens(CLAY_DARK) },
  earth: { light: mergeTokens(EARTH_LIGHT), dark: mergeTokens(EARTH_DARK) },
  mono: { light: mergeTokens(MONO_LIGHT), dark: mergeTokens(MONO_DARK) },
  aurora: { light: mergeTokens(AURORA_LIGHT), dark: mergeTokens(AURORA_DARK) },
  emerald: {
    light: mergeTokens(EMERALD_LIGHT),
    dark: mergeTokens(EMERALD_DARK),
  },
  ocean: { light: mergeTokens(OCEAN_LIGHT), dark: mergeTokens(OCEAN_DARK) },
  rose: { light: mergeTokens(ROSE_LIGHT), dark: mergeTokens(ROSE_DARK) },
  slate: { light: mergeTokens(SLATE_LIGHT), dark: mergeTokens(SLATE_DARK) },
};

export const DEFAULT_DASHBOARD_PALETTE_ID: DashboardPaletteId = "minimal";

const WCAG_AA_NORMAL = 4.5;

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = ([r, g, b]: [number, number, number]) =>
  `#${[r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("")}`;

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastWithWhite(rgb: [number, number, number]): number {
  return 1.05 / (relativeLuminance(rgb) + 0.05);
}

function contrastBetween(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

function deepenForWhiteText(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  let current = rgb;
  for (let i = 0; i < 24 && contrastWithWhite(current) < WCAG_AA_NORMAL; i++) {
    current = [current[0] * 0.92, current[1] * 0.92, current[2] * 0.92] as [number, number, number];
  }
  return toHex(current);
}

function inkIsDark(hex: string | undefined): boolean {
  if (!hex) return false;
  const rgb = hexToRgb(hex);
  return rgb ? relativeLuminance(rgb) < 0.5 : false;
}

function resolveAccent(tokens: CssVarMap): { accent: string; ink: string } | null {
  if (!tokens.primary) return null;

  const declaredInk = tokens["primary-foreground"] ?? "#ffffff";

  if (inkIsDark(declaredInk)) {
    const rgb = hexToRgb(tokens.primary);
    const inkRgb = hexToRgb(declaredInk);
    if (rgb && inkRgb && contrastBetween(rgb, inkRgb) >= WCAG_AA_NORMAL) {
      return { accent: tokens.primary, ink: declaredInk };
    }
    return { accent: deepenForWhiteText(tokens.primary), ink: "#ffffff" };
  }

  return { accent: deepenForWhiteText(tokens.primary), ink: "#ffffff" };
}

const DANGER_LIGHT_FILL_LUMINANCE = 0.3;

function resolveDanger(fill: string): { danger: string; ink: string } | null {
  const rgb = hexToRgb(fill);
  if (!rgb) return null;

  if (contrastWithWhite(rgb) >= WCAG_AA_NORMAL) return { danger: fill, ink: "#ffffff" };

  if (relativeLuminance(rgb) > DANGER_LIGHT_FILL_LUMINANCE) {
    const ink = toHex([rgb[0] * 0.18, rgb[1] * 0.18, rgb[2] * 0.18]);
    const inkRgb = hexToRgb(ink);
    if (inkRgb && contrastBetween(rgb, inkRgb) >= WCAG_AA_NORMAL) return { danger: fill, ink };
  }

  return { danger: deepenForWhiteText(fill), ink: "#ffffff" };
}

function bridgeEstataTokens(o: Record<string, string>, tokens: CssVarMap) {
  if (tokens.background) o["--bg"] = tokens.background;
  if (tokens.foreground) {
    o["--text"] = tokens.foreground;
    o["--text-2"] = tokens["card-foreground"] ?? tokens.foreground;
  }
  if (tokens["muted-foreground"]) {
    o["--text-3"] = tokens["muted-foreground"];
    o["--text-4"] = `color-mix(in oklch, ${tokens["muted-foreground"]} 80%, var(--text))`;
  }
  if (tokens.card) {
    o["--surface"] = tokens.card;
    o["--surface-2"] = tokens.muted ?? tokens.card;
  }
  if (tokens.muted) o["--surface-hi"] = tokens.muted;
  if (tokens.border) {
    o["--border"] = tokens.border;
    o["--border-soft"] = tokens.border;
  }
  const resolved = resolveAccent(tokens);
  if (resolved) {
    o["--accent"] = resolved.accent;
    o["--primary"] = resolved.accent;
    o["--ring"] = tokens.ring ?? resolved.accent;
    o["--accent-ink"] = resolved.ink;
    o["--accent-foreground"] = resolved.ink;
    o["--primary-foreground"] = resolved.ink;
  } else if (tokens["primary-foreground"]) {
    o["--accent-ink"] = tokens["primary-foreground"];
  }
  if (tokens.accent) o["--accent-soft"] = tokens.accent;
  if (tokens.destructive) {
    const danger = resolveDanger(tokens.destructive);
    o["--danger"] = danger?.danger ?? tokens.destructive;
    if (danger) o["--danger-ink"] = danger.ink;
  }
}

export function paletteVarsToStyle(tokens: CssVarMap): CSSProperties {
  const o: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    o[`--${key}`] = value;
  }
  bridgeEstataTokens(o, tokens);
  return o as CSSProperties;
}

export const PALETTE_COOKIE = "rn-theme";

export function resolvePaletteId(value: string | null | undefined): DashboardPaletteId {
  return value && value in DASHBOARD_PALETTES
    ? (value as DashboardPaletteId)
    : DEFAULT_DASHBOARD_PALETTE_ID;
}

function serializeVars(tokens: CssVarMap): string {
  const vars = paletteVarsToStyle(tokens) as Record<string, string>;
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

function heroUiAccentOverrides(tokens: CssVarMap): string {
  const resolved = resolveAccent(tokens);
  if (!resolved) return "";

  const tint = tokens.accent;
  return (
    `;--accent:${resolved.accent};--accent-foreground:${resolved.ink}` +
    `;--accent-ink:${resolved.ink};--primary:${resolved.accent};--primary-foreground:${resolved.ink}` +
    (tint ? `;--accent-fg:${tint}` : "")
  );
}

export function buildPaletteCss(id: DashboardPaletteId): string {
  const palette = DASHBOARD_PALETTES[resolvePaletteId(id)];
  const light = serializeVars(palette.light) + heroUiAccentOverrides(palette.light);
  const dark = serializeVars(palette.dark) + heroUiAccentOverrides(palette.dark);
  return `:root{${light}}\n.dark{${dark}}`;
}
