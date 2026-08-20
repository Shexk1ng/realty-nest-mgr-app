// Formatuje kwoty, liczby, daty i rozmiary plików oraz dobiera klasy kolorów odznak

export function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M zł`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k zł`;
  return `${n.toLocaleString("pl-PL")} zł`;
}

export function fmtNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("pl-PL");
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pl-PL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function toDateInput(d: string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function toDateTimeInput(d: string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const off = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - off).toISOString().slice(0, 16);
}

const PALETTE: Record<string, string> = {
  green: "rn-badge--green",
  amber: "rn-badge--amber",
  blue: "rn-badge--blue",
  red: "rn-badge--red",
  violet: "rn-badge--purple",
  slate: "rn-badge--slate",
};

export type BadgeColor = keyof typeof PALETTE;

export function badge(color: BadgeColor): string {
  return `rn-badge ${PALETTE[color] ?? "rn-badge--slate"} uppercase`;
}
