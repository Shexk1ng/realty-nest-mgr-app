"use client";

// Karta oferty w sieci PropShare wraz z formatowaniem etykiet i ceny

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, ImageOff, MapPin, Ruler, Sparkles, DoorOpen } from "lucide-react";
import { Button, Chip } from "@heroui/react";
import type { PropShareProperty } from "@/lib/graphql/queries/propshare";
import { isSeedImage } from "@/lib/images";
import { useI18n } from "@/i18n/i18n-context";

export type Translate = (path: string) => string;

function label(t: Translate, path: string, fallback: string): string {
  const value = t(path);
  return value === path ? fallback : value;
}

export function propertyTypeLabel(t: Translate, value: string | null | undefined): string | null {
  if (!value) return null;
  return label(t, `dashboard.properties.type.${value}`, value);
}

export function transactionTypeLabel(t: Translate, value: string | null | undefined): string | null {
  if (!value) return null;
  return label(t, `dashboard.transactions.kind${value}`, value);
}

export function formatPrice(price: number | null | undefined): string | null {
  if (price == null) return null;
  return `${Math.round(price).toLocaleString("pl-PL")} zł`;
}

export function matchesLabel(t: Translate, n: number): string {
  const last = n % 10;
  const teens = n % 100;
  const form =
    n === 1
      ? "matchesOne"
      : last >= 2 && last <= 4 && !(teens >= 12 && teens <= 14)
        ? "matchesFew"
        : "matchesMany";
  return t(`dashboard.propshare.${form}`).replace("{count}", String(n));
}

function initials(name: string | null): string {
  if (!name) return "??";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "??"
  );
}

export function ListingCard({
  property,
  matchCount,
  isOwn,
  canManage,
  canSendOffer,
  alreadyOffered,
  onSendOffer,
}: {
  property: PropShareProperty;
  matchCount: number;
  isOwn: boolean;
  canManage: boolean;
  canSendOffer: boolean;
  alreadyOffered: boolean;
  onSendOffer: () => void;
}) {
  const { t, localeHref } = useI18n();
  const [photoBroken, setPhotoBroken] = useState(false);
  const source = property.imageUrl ?? property.images?.[0] ?? null;
  const photo = photoBroken ? null : source;
  const city = property.address?.city ?? property.location ?? null;
  const district = property.address?.district ?? null;
  const price = formatPrice(property.price);
  const transaction = transactionTypeLabel(t, property.transactionType);
  const type = propertyTypeLabel(t, property.propertyType);
  const hasLeadAgent = property.agentId != null;

  return (
    <article className="rn-panel rn-panel--flush overflow-hidden">
      <div className="relative aspect-[16/10] w-full bg-surface-2">
        {photo ? (
          <Image
            src={photo}
            alt={property.title}
            fill
            unoptimized={isSeedImage(photo)}
            onError={() => setPhotoBroken(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-3">
            <ImageOff className="h-8 w-8" aria-hidden />
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/70 to-transparent"
          aria-hidden
        />

        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="text-base font-semibold leading-tight text-white">
            {price ?? t("dashboard.propshare.priceOnRequest")}
          </p>
          {property.area != null && property.price != null && (
            <p className="text-[11px] text-white/85">
              {Math.round(property.price / property.area).toLocaleString("pl-PL")} zł/m²
            </p>
          )}
        </div>

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {transaction && <span className="rn-badge rn-badge--on-media">{transaction}</span>}
          {type && <span className="rn-badge rn-badge--on-media">{type}</span>}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-medium text-foreground" title={property.title}>
              {property.title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {[district, city].filter(Boolean).join(", ") ||
                t("dashboard.propshare.locationUnknown")}
            </p>
          </div>

          {matchCount > 0 && (
            <Chip size="sm" variant="soft" color="success" className="shrink-0">
              <Sparkles className="h-3 w-3" aria-hidden />
              {matchesLabel(t, matchCount)}
            </Chip>
          )}
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {property.area != null && (
            <li className="flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" aria-hidden /> {property.area} m²
            </li>
          )}
          {property.rooms != null && (
            <li className="flex items-center gap-1">
              <DoorOpen className="h-3.5 w-3.5" aria-hidden /> {property.rooms}{" "}
              {t("dashboard.properties.roomsShort")}
            </li>
          )}
          {property.floor != null && (
            <li>
              {property.floor === 0
                ? t("dashboard.propshare.floorGround")
                : t("dashboard.propshare.floorNo").replace("{n}", String(property.floor))}
              {property.totalFloors != null && ` / ${property.totalFloors}`}
            </li>
          )}
          {property.yearBuilt != null && (
            <li>{t("dashboard.propshare.builtYear").replace("{year}", String(property.yearBuilt))}</li>
          )}
        </ul>

        {property.propShareNotes && (
          <p className="line-clamp-2 rounded-lg bg-surface-hi px-2.5 py-2 text-xs italic text-text-2">
            „{property.propShareNotes}”
          </p>
        )}

        <div className="flex items-center gap-2 border-t border-border/60 pt-3">
          {property.ownerAgentAvatarUrl ? (
            <Image
              src={property.ownerAgentAvatarUrl}
              alt=""
              unoptimized={isSeedImage(property.ownerAgentAvatarUrl)}
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-hi text-[10px] font-semibold text-text-3">
              {initials(property.ownerAgentName)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {property.ownerAgentName ?? t("dashboard.propshare.agentFallback")}
            </p>
            <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" aria-hidden />
              {property.ownerCompanyName ?? "—"}
            </p>
          </div>

          {isOwn ? (
            <div className="flex shrink-0 items-center gap-2">
              <span className="rn-badge chip-hue--slate">{t("dashboard.propshare.ownListing")}</span>
              {canManage && (
                <Link
                  href={localeHref(`/dashboard/properties/${property.id}`)}
                  className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  {t("dashboard.propshare.manageListing")}
                </Link>
              )}
            </div>
          ) : !hasLeadAgent ? (
            <span className="rn-badge chip-hue--slate shrink-0">
              {t("dashboard.propshare.noLeadAgent")}
            </span>
          ) : (
            <Button
              size="sm"
              variant={alreadyOffered ? "ghost" : "primary"}
              isDisabled={alreadyOffered || !canSendOffer}
              onPress={onSendOffer}
            >
              {alreadyOffered
                ? t("dashboard.propshare.askedAlready")
                : t("dashboard.propshare.askAction")}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
