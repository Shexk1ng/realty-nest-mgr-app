"use client";

// Odznaka statusu ze wspólną paletą kolorów i tłumaczonymi etykietami w całym pulpicie

import { Chip } from "@heroui/react";
import { type BadgeColor } from "@/lib/dashboard-format";
import { useI18n } from "@/i18n/i18n-context";

export const ENQUIRY_STATUS_COLORS: Record<string, BadgeColor> = {
  NEW: "blue", CONTACTED: "violet", QUALIFIED: "amber", NEGOTIATING: "green", LOST: "red",
};

export const ENQUIRY_PRIORITY_COLORS: Record<string, BadgeColor> = {
  LOW: "slate", MEDIUM: "blue", HIGH: "amber", URGENT: "red",
};

export const PIPELINE_STAGE_COLORS: Record<string, BadgeColor> = {
  NEW: "blue", QUALIFYING: "violet", SHOWING: "amber",
  NURTURE: "slate", OFFER: "amber", CLOSED: "green", LOST: "red",
};

export const CONTACT_KIND_COLORS: Record<string, BadgeColor> = {
  CLIENT: "blue", PARTNER: "violet", VENDOR: "amber", COLLEAGUE: "slate",
};

export const DOCUMENT_CATEGORY_COLORS: Record<string, BadgeColor> = {
  CONTRACT: "blue", LISTING: "green", REPORT: "violet", MARKETING: "amber", LEGAL: "red",
};

export const MARKETING_STATUS_COLORS: Record<string, BadgeColor> = {
  ACTIVE: "green", PAUSED: "amber", ENDED: "slate", DRAFT: "blue",
};

export const COMMISSION_STATUS_COLORS: Record<string, BadgeColor> = {
  PAID: "green", PENDING: "amber", PROCESSING: "blue", DISPUTED: "red",
};

export const PROPERTY_STATUS_COLORS: Record<string, BadgeColor> = {
  ACTIVE: "green", SOLD: "slate", RENTED: "blue",
  WITHDRAWN: "red", DRAFT: "amber", PENDING: "violet",
};

export const TRANSACTION_STATUS_COLORS: Record<string, BadgeColor> = {
  DRAFT: "slate", PENDING: "amber", COMPLETED: "green", CANCELLED: "red", REFUNDED: "violet",
};

export const VIEWING_STATUS_COLORS: Record<string, BadgeColor> = {
  SCHEDULED: "blue", CONFIRMED: "violet", COMPLETED: "green",
  NO_SHOW: "red", CANCELLED: "slate", RESCHEDULED: "amber",
};

export const TASK_STATUS_COLORS: Record<string, BadgeColor> = {
  TODO: "slate", IN_PROGRESS: "blue", DONE: "green", BLOCKED: "red", CANCELLED: "slate",
};

export const TASK_PRIORITY_COLORS: Record<string, BadgeColor> = {
  LOW: "slate", MEDIUM: "blue", HIGH: "amber", URGENT: "red",
};

type ChipColor = NonNullable<React.ComponentProps<typeof Chip>["color"]>;

const CHIP_COLOR: Record<BadgeColor, ChipColor> = {
  green: "success",
  amber: "warning",
  red: "danger",
  blue: "default",
  violet: "default",
  slate: "default",
};

const CHIP_HUE: Partial<Record<BadgeColor, string>> = {
  blue: "chip-hue--blue",
  violet: "chip-hue--violet",
  slate: "chip-hue--slate",
};

export const STATUS_LABELS_PL: Record<string, string> = {
  ACTIVE: "Aktywna", PENDING: "W toku", COMPLETED: "Zakończona",
  CANCELLED: "Anulowana", DRAFT: "Szkic", REFUNDED: "Zwrócona",
  PAUSED: "Wstrzymana", ENDED: "Zakończona", WITHDRAWN: "Wycofana",

  NEW: "Nowe", CONTACTED: "Skontaktowano", QUALIFIED: "Zakwalifikowane",
  NEGOTIATING: "Negocjacje", LOST: "Utracone",
  QUALIFYING: "Kwalifikacja", SHOWING: "Prezentacje", NURTURE: "Podtrzymanie",
  OFFER: "Oferta", CLOSED: "Zamknięte",

  LOW: "Niski", MEDIUM: "Średni", HIGH: "Wysoki", URGENT: "Pilny",

  CLIENT: "Klient", PARTNER: "Partner", VENDOR: "Dostawca", COLLEAGUE: "Współpracownik",

  CONTRACT: "Umowa", LISTING: "Oferta", REPORT: "Raport",
  MARKETING: "Marketing", LEGAL: "Prawne",

  PAID: "Wypłacona", PROCESSING: "W realizacji", DISPUTED: "Sporna",

  SOLD: "Sprzedana", RENTED: "Wynajęta",

  SCHEDULED: "Zaplanowana", CONFIRMED: "Potwierdzona",
  NO_SHOW: "Nieobecność", RESCHEDULED: "Przełożona",

  TODO: "Do zrobienia", IN_PROGRESS: "W trakcie", DONE: "Zrobione", BLOCKED: "Zablokowane",
};

interface StatusBadgeProps {
  value: string | null | undefined;
  colorMap: Record<string, BadgeColor>;
  fallback?: BadgeColor;
  label?: string;
}

export function StatusBadge({ value, colorMap, fallback = "slate", label }: StatusBadgeProps) {
  const { t } = useI18n();
  const color: BadgeColor = value ? (colorMap[value] ?? fallback) : fallback;
  const translated = value ? t(`common.status.${value}`) : null;
  const text = value
    ? (label ?? (translated !== `common.status.${value}` ? translated : STATUS_LABELS_PL[value] ?? value))
    : "—";

  return (
    <Chip
      size="sm"
      variant="soft"
      color={CHIP_COLOR[color]}
      className={CHIP_HUE[color] ? CHIP_HUE[color] : undefined}
    >
      {text}
    </Chip>
  );
}
