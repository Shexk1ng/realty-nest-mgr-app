"use client";

// Zamienia adresy ofert na współrzędne geograficzne i zapisuje wynik w pamięci przeglądarki

import { useEffect, useRef, useState } from "react";
import type { Property } from "@/lib/graphql/queries/properties";

export interface MappedProperty {
  property: Property;
  lat: number;
  lng: number;
}

function addressQuery(p: Property): string | null {
  const a = p.address;
  const parts = [a?.street, a?.city, a?.postalCode, a?.country].filter(Boolean);
  const q = parts.length ? parts.join(", ") : p.location;
  return q && q.trim().length >= 3 ? q.trim() : null;
}

const LS_PREFIX = "rn-geo:";

function readCache(q: string): { lat: number; lng: number } | null | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(LS_PREFIX + q.toLowerCase());
  if (raw == null) return undefined;
  if (raw === "null") return null;
  try {
    return JSON.parse(raw) as { lat: number; lng: number };
  } catch {
    return undefined;
  }
}

function writeCache(q: string, val: { lat: number; lng: number } | null) {
  try {
    window.localStorage.setItem(LS_PREFIX + q.toLowerCase(), val ? JSON.stringify(val) : "null");
  } catch {
  }
}

export function usePropertyCoords(properties: Property[]): {
  mapped: MappedProperty[];
  resolving: boolean;
} {
  const [resolved, setResolved] = useState<Record<string, { lat: number; lng: number }>>({});
  const [resolving, setResolving] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    const missing = properties.filter(
      (p) => !(typeof p.address?.lat === "number" && typeof p.address?.lng === "number"),
    );
    if (missing.length === 0) return;

    (async () => {
      setResolving(true);
      for (const p of missing) {
        if (cancelled.current) break;
        const q = addressQuery(p);
        if (!q) continue;

        const cached = readCache(q);
        if (cached !== undefined) {
          if (cached) setResolved((s) => ({ ...s, [p.id]: cached }));
          continue;
        }
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
          if (res.ok) {
            const { lat, lng } = (await res.json()) as { lat: number; lng: number };
            writeCache(q, { lat, lng });
            if (!cancelled.current) setResolved((s) => ({ ...s, [p.id]: { lat, lng } }));
          } else if (res.status === 404) {
            writeCache(q, null);
          }
        } catch {
        }
      }
      if (!cancelled.current) setResolving(false);
    })();

    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.map((p) => p.id).join(",")]);

  const mapped: MappedProperty[] = [];
  for (const p of properties) {
    if (typeof p.address?.lat === "number" && typeof p.address?.lng === "number") {
      mapped.push({ property: p, lat: p.address.lat, lng: p.address.lng });
    } else if (resolved[p.id]) {
      mapped.push({ property: p, lat: resolved[p.id]!.lat, lng: resolved[p.id]!.lng });
    }
  }
  return { mapped, resolving };
}
