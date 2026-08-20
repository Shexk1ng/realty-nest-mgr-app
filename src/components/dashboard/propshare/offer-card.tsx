"use client";

// Karta przychodzącej lub wychodzącej propozycji współpracy PropShare

import { useState } from "react";
import Image from "next/image";
import { Building2, Check, Clock, Eye, ImageOff, Percent, X } from "lucide-react";
import { Button } from "@heroui/react";
import type { PropShareOffer } from "@/lib/graphql/queries/propshare";
import { StatusBadge } from "@/components/ui/status-badge";
import type { BadgeColor } from "@/lib/dashboard-format";
import { formatPrice } from "./listing-card";
import { isSeedImage } from "@/lib/images";
import { useI18n } from "@/i18n/i18n-context";

const OFFER_STATUS_COLORS: Record<string, BadgeColor> = {
  PENDING: "amber",
  VIEWED: "blue",
  ACCEPTED: "green",
  REJECTED: "red",
  WITHDRAWN: "slate",
};

function shortDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "short" });
}

export function OfferCard({
  offer,
  incoming,
  busy,
  onRespond,
}: {
  offer: PropShareOffer;
  incoming: boolean;
  busy?: boolean;
  onRespond?: (status: "ACCEPTED" | "REJECTED") => void;
}) {
  const { t } = useI18n();
  const [photoBroken, setPhotoBroken] = useState(false);
  const p = offer.property;
  const source = p?.imageUrl ?? p?.images?.[0] ?? null;
  const photo = photoBroken ? null : source;
  const sent = shortDate(offer.createdAt);
  const viewed = shortDate(offer.viewedAt);
  const responded = shortDate(offer.respondedAt);
  const price = formatPrice(p?.price);

  const partyName = incoming
    ? (offer.fromAgentName ?? t("dashboard.propshare.agentFallback"))
    : (offer.toAgentName ?? t("dashboard.propshare.agentFallback"));
  const partyCompany = incoming ? offer.fromCompanyName : offer.toCompanyName;
  const party = t(incoming ? "dashboard.propshare.offerFrom" : "dashboard.propshare.offerTo").replace(
    "{name}",
    partyCompany ? `${partyName}, ${partyCompany}` : partyName,
  );

  const statusLabel = t(`dashboard.propshare.status${offer.status}`);

  return (
    <li className="rn-panel rn-panel--flush overflow-hidden">
      <div className="flex gap-4 p-4">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-surface-2">
          {photo ? (
            <Image
              src={photo}
              alt=""
              fill
              sizes="128px"
              unoptimized={isSeedImage(photo)}
              onError={() => setPhotoBroken(true)}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-text-3">
              <ImageOff className="h-5 w-5" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-medium text-foreground">
                {p?.title ??
                  t("dashboard.propshare.offerFallbackTitle").replace("{id}", String(offer.shortId))}
              </h3>
              <p className="truncate text-xs text-muted-foreground">
                {p?.location ?? "—"} · {price ?? t("dashboard.propshare.priceOnRequest")}
              </p>
            </div>
            <span className="shrink-0">
              <StatusBadge
                value={offer.status}
                colorMap={OFFER_STATUS_COLORS}
                label={
                  statusLabel === `dashboard.propshare.status${offer.status}`
                    ? offer.status
                    : statusLabel
                }
              />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" aria-hidden />
              {party}
            </span>
            {offer.proposedCommission != null && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Percent className="h-3.5 w-3.5 text-primary" aria-hidden />
                {t("dashboard.propshare.commissionShare").replace(
                  "{value}",
                  offer.proposedCommission.toString().replace(".", ","),
                )}
              </span>
            )}
          </div>

          {offer.message && (
            <p className="line-clamp-2 rounded-lg bg-surface-hi px-2.5 py-2 text-xs italic text-text-2">
              „{offer.message}”
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {sent && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden />
                {t("dashboard.propshare.timelineSent").replace("{date}", sent)}
              </span>
            )}
            {viewed && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" aria-hidden />
                {t("dashboard.propshare.timelineViewed").replace("{date}", viewed)}
              </span>
            )}
            {responded && (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3" aria-hidden />
                {t("dashboard.propshare.timelineResponded").replace("{date}", responded)}
              </span>
            )}
          </div>

          {incoming && (offer.status === "PENDING" || offer.status === "VIEWED") && onRespond && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="primary" isDisabled={busy} onPress={() => onRespond("ACCEPTED")}>
                <Check className="h-3.5 w-3.5" aria-hidden /> {t("dashboard.propshare.accept")}
              </Button>
              <Button size="sm" variant="ghost" isDisabled={busy} onPress={() => onRespond("REJECTED")}>
                <X className="h-3.5 w-3.5" aria-hidden /> {t("dashboard.propshare.reject")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
