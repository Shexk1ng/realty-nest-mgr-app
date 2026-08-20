"use client";

// Mapa Leaflet ze znacznikami ofert, dopasowaniem widoku i kafelkami zależnymi od motywu

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useTheme } from "next-themes";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { useI18n } from "@/i18n/i18n-context";
import { formatPrice } from "@/lib/property-options";
import { PropertyPreviewCompact } from "@/components/dashboard/property-preview";
import { usePropertyCoords, type MappedProperty } from "@/components/maps/use-property-coords";
import type { Property } from "@/lib/graphql/queries/properties";

const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  dark:  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const POLAND_CENTER: [number, number] = [52.06, 19.48];

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function photoIcon(label: string, imageUrl: string | null | undefined, active: boolean) {
  const img = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="" class="rn-pin-photo__img" loading="lazy" />`
    : `<span class="rn-pin-photo__placeholder"></span>`;
  return L.divIcon({
    className: "rn-pin-photo-wrap",
    html: `<div class="rn-pin-photo${active ? " rn-pin-photo--active" : ""}">
      ${img}
      <span class="rn-pin-photo__price">${escapeHtml(label)}</span>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function FitBounds({ points }: { points: MappedProperty[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0]!.lat, points[0]!.lng], 14, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export default function PropertyMap({
  properties,
  height = 420,
  activeId,
  className,
}: {
  properties: Property[];
  height?: number | string;
  activeId?: string | null;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const { localeHref } = useI18n();
  const { mapped, resolving } = usePropertyCoords(properties);
  const isDark = resolvedTheme === "dark";

  const markers = useMemo(
    () =>
      mapped.map((m) => (
        <Marker
          key={m.property.id}
          position={[m.lat, m.lng]}
          icon={photoIcon(
            m.property.price != null ? formatPrice(m.property.price, true) : "•",
            m.property.imageUrl ?? m.property.images?.[0] ?? null,
            m.property.id === activeId,
          )}
        >
          <Popup className="rn-map-popup" maxWidth={280} minWidth={240} closeButton={false}>
            <Link href={localeHref(`/dashboard/properties/${m.property.id}`)} className="rn-map-popup__link">
              <PropertyPreviewCompact property={m.property} />
            </Link>
          </Popup>
        </Marker>
      )),
    [mapped, activeId, localeHref],
  );

  return (
    <div className={`rn-map ${className ?? ""}`} style={{ height }}>
      <MapContainer
        center={POLAND_CENTER}
        zoom={6}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: "var(--surface-2, #e9eef3)" }}
        attributionControl
      >
        <TileLayer attribution={ATTRIBUTION} url={isDark ? TILES.dark : TILES.light} subdomains="abcd" detectRetina />
        {markers}
        <FitBounds points={mapped} />
      </MapContainer>

      {resolving && (
        <span className="rn-map__hint">Locating properties…</span>
      )}
      {!resolving && mapped.length === 0 && (
        <span className="rn-map__empty">Brak ofert z adresem — dodaj adres, aby zobaczyć pinezki.</span>
      )}
    </div>
  );
}
