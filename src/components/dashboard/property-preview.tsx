"use client";

// Podgląd oferty nieruchomości w wersji pełnej i skróconej

import Image from "next/image";
import { useI18n } from "@/i18n/i18n-context";
import {
  Bath,
  BedDouble,
  Building2,
  CalendarClock,
  Layers,
  MapPin,
  Maximize2,
  Ruler,
  Share2,
} from "lucide-react";
import { PropertyGallery } from "@/components/dashboard/property-gallery";
import {
  formatArea,
  formatPrice,
  labelOf,
  statusBadgeClass,
} from "@/lib/property-options";
import type { Property } from "@/lib/graphql/queries/properties";
import { isSeedImage } from "@/lib/images";

export type PropertyDraft = Partial<Property>;

function resolveDescription(p: PropertyDraft): string {
  if (p.description?.trim()) return p.description.trim();
  const s = p.descriptionSections;
  if (!s) return "";
  return [s.intro, s.layout, s.location, s.additional]
    .map((x) => x?.trim())
    .filter(Boolean)
    .join("\n\n");
}

function Spec({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ size?: number }>;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rn-spec">
      <span className="rn-spec__val">
        <Icon size={14} />
        {value}
      </span>
      <span className="rn-spec__lbl">{label}</span>
    </div>
  );
}

export function PropertyPreview({
  property,
  className = "",
}: {
  property: PropertyDraft;
  className?: string;
}) {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const resolved = t(key);
    return resolved === key ? fallback : resolved;
  };
  const images = (property.images?.length ? property.images : property.imageUrl ? [property.imageUrl] : []).filter(
    Boolean,
  ) as string[];
  const desc = resolveDescription(property);
  const txn = property.transactionType ? labelOf("transactionType", property.transactionType) : null;
  const isRent = property.transactionType === "RENT";

  const specs: React.ReactNode[] = [];
  if (property.area != null) specs.push(<Spec key="area" icon={Maximize2} value={formatArea(property.area)} label="Pow." />);
  if (property.rooms != null) specs.push(<Spec key="rooms" icon={BedDouble} value={property.rooms} label="Pokoje" />);
  if (property.bathrooms != null) specs.push(<Spec key="bath" icon={Bath} value={property.bathrooms} label="Łazienki" />);
  if (property.floor != null)
    specs.push(
      <Spec
        key="floor"
        icon={Layers}
        value={property.totalFloors != null ? `${property.floor}/${property.totalFloors}` : property.floor}
        label="Piętro"
      />,
    );
  if (property.yearBuilt != null) specs.push(<Spec key="year" icon={CalendarClock} value={property.yearBuilt} label="Rok" />);
  if (property.pricePerM2 != null) specs.push(<Spec key="ppm" icon={Ruler} value={formatPrice(property.pricePerM2)} label="Za m²" />);

  return (
    <article className={`rn-preview ${className}`}>
      <PropertyGallery
        images={images}
        alt={property.title || undefined}
        overlay={
          <>
            <div className="rn-preview__badges">
              {txn && <span className="rn-badge rn-badge--info">{txn}</span>}
              {property.status && <span className={statusBadgeClass(property.status)}>{labelOf("status", property.status)}</span>}
              {property.market && <span className="rn-badge rn-badge--muted">{labelOf("market", property.market)}</span>}
              {property.propShareListed && (
                <span className="rn-badge" style={{ background: "var(--accent-soft)", color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Share2 size={10} /> PropShare
                </span>
              )}
            </div>

            {property.price != null && (
              <div className="rn-preview__price-tag">
                {formatPrice(property.price)}
                {isRent && <small> /mc</small>}
              </div>
            )}
          </>
        }
      />

      <div className="rn-preview__body">
        <div>
          <h3 className="rn-preview__title">{property.title || tf("dashboard.propertyForm.untitledListing", "Oferta bez tytułu")}</h3>
          {(property.location || property.propertyType) && (
            <p className="rn-preview__loc">
              <MapPin size={13} />
              {property.location || "—"}
              {property.propertyType && <> · {labelOf("propertyType", property.propertyType)}</>}
            </p>
          )}
        </div>

        {specs.length > 0 && <div className="rn-preview__specs">{specs}</div>}

        {property.features && property.features.length > 0 && (
          <div className="rn-preview__features">
            {property.features.slice(0, 8).map((f) => (
              <span key={f} className="rn-badge rn-badge--muted">
                {labelOf("feature", f)}
              </span>
            ))}
          </div>
        )}

        {desc ? (
          <p className="rn-preview__desc">{desc}</p>
        ) : (
          <p className="rn-preview__desc-empty">{tf("dashboard.propertyForm.noDescription", "Brak opisu — uzupełnij pola lub wygeneruj tekst przez AI.")}</p>
        )}
      </div>
    </article>
  );
}

export function PropertyPreviewCompact({ property }: { property: PropertyDraft }) {
  const cover = property.imageUrl || property.images?.[0];
  return (
    <div className="rn-preview">
      <div className="rn-preview__media" style={{ aspectRatio: "16 / 9" }}>
        {cover ? (
          <Image
            src={cover}
            alt={property.title || "Property"}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            unoptimized={isSeedImage(cover)}
          />
        ) : (
          <div className="rn-preview__media-empty">
            <Building2 size={26} strokeWidth={1.5} />
          </div>
        )}
        {property.price != null && <div className="rn-preview__price-tag">{formatPrice(property.price, true)}</div>}
      </div>
      <div className="rn-preview__body" style={{ gap: 8, padding: "12px 14px 14px" }}>
        <h3 className="rn-preview__title" style={{ fontSize: 14 }}>
          {property.title || "Untitled"}
        </h3>
        <p className="rn-preview__loc">
          <MapPin size={12} />
          {property.location || "—"}
        </p>
        <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--text-3)" }}>
          {property.area != null && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Maximize2 size={12} /> {formatArea(property.area)}
            </span>
          )}
          {property.rooms != null && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <BedDouble size={12} /> {property.rooms}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
