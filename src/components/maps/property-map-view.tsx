"use client";

// Ładuje mapę ofert dopiero w przeglądarce, bo Leaflet nie działa przy renderowaniu serwerowym

import dynamic from "next/dynamic";
import type { Property } from "@/lib/graphql/queries/properties";

const PropertyMap = dynamic(() => import("@/components/maps/property-map"), {
  ssr: false,
  loading: () => <div className="rn-map rn-map--loading" style={{ height: 420 }} />,
});

export function PropertyMapView(props: {
  properties: Property[];
  height?: number | string;
  activeId?: string | null;
  className?: string;
}) {
  return <PropertyMap {...props} />;
}
