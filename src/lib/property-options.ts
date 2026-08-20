// Słowniki cech nieruchomości oraz formatowanie ceny, powierzchni i klas odznak statusu

import type {
  PropertyCondition,
  PropertyStatus,
  PropertyType,
  TransactionType,
  MarketType,
  OwnershipType,
} from "@/lib/graphql/queries/properties";

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

export const TRANSACTION_TYPES: Option<TransactionType>[] = [
  { value: "SALE", label: "Sprzedaż" },
  { value: "RENT", label: "Wynajem" },
];

export const PROPERTY_TYPES: Option<PropertyType>[] = [
  { value: "APARTMENT", label: "Mieszkanie" },
  { value: "HOUSE", label: "Dom" },
  { value: "STUDIO", label: "Kawalerka" },
  { value: "ROOM", label: "Pokój" },
  { value: "PLOT", label: "Działka" },
  { value: "COMMERCIAL", label: "Lokal użytkowy" },
  { value: "OFFICE", label: "Biuro" },
  { value: "GARAGE", label: "Garaż" },
];

export const MARKET_TYPES: Option<MarketType>[] = [
  { value: "SECONDARY", label: "Rynek wtórny" },
  { value: "PRIMARY", label: "Rynek pierwotny" },
];

export const STATUSES: Option<PropertyStatus>[] = [
  { value: "ACTIVE", label: "Aktywna" },
  { value: "PENDING", label: "Zarezerwowana" },
  { value: "SOLD", label: "Sprzedana" },
  { value: "WITHDRAWN", label: "Wycofana" },
];

export const OWNERSHIP_TYPES: Option<OwnershipType>[] = [
  { value: "FULL_OWNERSHIP", label: "Pełna własność" },
  { value: "COOPERATIVE", label: "Spółdzielcze własnościowe" },
  { value: "COOPERATIVE_LAND", label: "Spółdzielcze z gruntem" },
  { value: "SHARE", label: "Udział we współwłasności" },
];

export const CONDITIONS: Option<PropertyCondition>[] = [
  { value: "READY_TO_MOVE", label: "Do zamieszkania" },
  { value: "GOOD", label: "Dobry stan" },
  { value: "AFTER_RENOVATION", label: "Po remoncie" },
  { value: "TO_RENOVATE", label: "Do remontu" },
  { value: "FOR_FINISHING", label: "Do wykończenia" },
  { value: "DEVELOPER_STATE", label: "Stan deweloperski" },
];

export const HEATING_TYPES: Option[] = [
  { value: "DISTRICT", label: "Miejskie" },
  { value: "GAS", label: "Gazowe" },
  { value: "ELECTRIC", label: "Elektryczne" },
  { value: "HEAT_PUMP", label: "Pompa ciepła" },
  { value: "SOLID_FUEL", label: "Paliwo stałe" },
  { value: "OTHER", label: "Inne" },
];

export const ENERGY_CLASSES: Option[] = ["A+", "A", "B", "C", "D", "E", "F", "G"].map((v) => ({
  value: v,
  label: v,
}));

export const FEATURE_TAGS: Option[] = [
  { value: "balcony", label: "Balkon" },
  { value: "terrace", label: "Taras" },
  { value: "garden", label: "Ogród" },
  { value: "parking", label: "Miejsce postojowe" },
  { value: "garage", label: "Garaż" },
  { value: "elevator", label: "Winda" },
  { value: "basement", label: "Komórka lokatorska" },
  { value: "furnished", label: "Umeblowane" },
  { value: "ac", label: "Klimatyzacja" },
  { value: "fireplace", label: "Kominek" },
  { value: "alarm", label: "Alarm / ochrona" },
  { value: "concierge", label: "Concierge" },
  { value: "reception", label: "Recepcja" },
  { value: "fiber", label: "Światłowód" },
  { value: "two_level", label: "Dwupoziomowe" },
  { value: "separate_kitchen", label: "Oddzielna kuchnia" },
];

function toMap(opts: Option[]): Record<string, string> {
  return Object.fromEntries(opts.map((o) => [o.value, o.label]));
}

const LABEL_MAPS = {
  transactionType: toMap(TRANSACTION_TYPES),
  propertyType: toMap(PROPERTY_TYPES),
  market: toMap(MARKET_TYPES),
  status: toMap(STATUSES),
  ownership: toMap(OWNERSHIP_TYPES),
  condition: toMap(CONDITIONS),
  heating: toMap(HEATING_TYPES),
  feature: toMap(FEATURE_TAGS),
} as const;

export function labelOf(kind: keyof typeof LABEL_MAPS, value?: string | null): string {
  if (!value) return "";
  return LABEL_MAPS[kind][value] ?? value;
}

const PLN = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

export function formatPrice(n?: number | null, compact = false): string {
  if (n == null) return "—";
  if (compact) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1).replace(".", ",")} mln zł`;
    if (n >= 1_000) return `${Math.round(n / 1_000)} tys. zł`;
  }
  return `${PLN.format(n)} zł`;
}

export function formatArea(n?: number | null): string {
  if (n == null) return "—";
  return `${PLN.format(n)} m²`;
}

export function statusBadgeClass(status?: string | null): string {
  switch (status) {
    case "ACTIVE": return "rn-badge rn-badge--accent";
    case "PENDING": return "rn-badge rn-badge--warn";
    case "SOLD": return "rn-badge rn-badge--violet";
    case "WITHDRAWN": return "rn-badge rn-badge--danger";
    default: return "rn-badge rn-badge--muted";
  }
}
