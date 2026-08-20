"use client";

// Podsumowanie portfela firmy: wszystkie oferty na jednej mapie oraz łączne wskaźniki

import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { MapPin } from "lucide-react";
import { GET_PROPERTIES, type Property } from "@/lib/graphql/queries/properties";
import { formatPrice } from "@/lib/property-options";
import { PropertyMapView } from "@/components/maps/property-map-view";

export function CompanyPropertiesMap() {
  const { data, loading } = useQuery<{ getProperties: { items: Property[] } }>(GET_PROPERTIES, {
    fetchPolicy: "cache-and-network",
    variables: { limit: 500 },
  });
  const properties = useMemo(() => data?.getProperties?.items ?? [], [data]);

  const totalValue = properties.reduce((sum, p) => sum + (p.price ?? 0), 0);
  const active = properties.filter((p) => p.status === "ACTIVE").length;

  return (
    <section className="card-surface overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border/60 px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <MapPin className="h-4 w-4 text-primary" aria-hidden /> Portfolio overview
        </h2>
        <div className="ml-auto flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-muted-foreground">Oferty: <strong className="text-foreground">{properties.length}</strong></span>
          <span className="text-muted-foreground">Aktywne: <strong className="text-foreground">{active}</strong></span>
          <span className="text-muted-foreground">Wartość łączna: <strong className="text-foreground">{formatPrice(totalValue, true)}</strong></span>
        </div>
      </div>
      {!loading || properties.length > 0 ? (
        <PropertyMapView properties={properties} height={420} className="rn-map--flush" />
      ) : (
        <div className="rn-map rn-map--flush rn-map--loading" style={{ height: 420 }} />
      )}
    </section>
  );
}
