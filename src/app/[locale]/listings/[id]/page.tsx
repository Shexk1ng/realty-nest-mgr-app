// Publiczna strona opublikowanej oferty, generowana statycznie z odświeżaniem co 5 minut

import { notFound } from "next/navigation";
import { MapPin, BedDouble, Bath, Maximize2 } from "lucide-react";
import { gqlPublic } from "@/lib/graphql/public-fetch";
import { formatArea, formatPrice, labelOf } from "@/lib/property-options";
import { PropertyGallery } from "@/components/dashboard/property-gallery";

export const dynamic = "force-static";
export const revalidate = 300;

interface PublicProperty {
  id: string;
  shortId: number;
  title: string;
  description: string | null;
  price: number;
  location: string;
  transactionType: string | null;
  propertyType: string | null;
  area: number | null;
  rooms: number | null;
  bathrooms: number | null;
  imageUrl: string | null;
  images: string[] | null;
  features: string[] | null;
}

const QUERY = `
  query PublicProperty($id: ID!) {
    getPublicProperty(id: $id) {
      id shortId title description price location transactionType propertyType
      area rooms bathrooms imageUrl images features
    }
  }
`;

export default async function PublicListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await gqlPublic<{ getPublicProperty: PublicProperty | null }>(QUERY, { id });
  const property = data?.getPublicProperty;
  if (!property) notFound();

  const gallery = [property.imageUrl, ...(property.images ?? [])]
    .filter((src): src is string => Boolean(src))
    .filter((src, i, all) => all.indexOf(src) === i);
  const isRent = property.transactionType === "RENT";

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <PropertyGallery images={gallery} alt={property.title} />
        <div className="space-y-5 p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {property.transactionType ? labelOf("transactionType", property.transactionType) : ""}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-foreground sm:text-3xl">{property.title}</h1>
            {property.location && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin size={14} aria-hidden /> {property.location}
              </p>
            )}
          </div>

          {property.price != null && (
            <p className="font-display text-3xl font-bold text-foreground">
              {formatPrice(property.price)}
              {isRent && <span className="ml-1 text-base font-medium text-muted-foreground">/mc</span>}
            </p>
          )}

          <div className="flex flex-wrap gap-4 border-y border-border/60 py-4 text-sm text-foreground">
            {property.area != null && (
              <span className="flex items-center gap-1.5"><Maximize2 size={15} aria-hidden /> {formatArea(property.area)}</span>
            )}
            {property.rooms != null && (
              <span className="flex items-center gap-1.5"><BedDouble size={15} aria-hidden /> {property.rooms} pok.</span>
            )}
            {property.bathrooms != null && (
              <span className="flex items-center gap-1.5"><Bath size={15} aria-hidden /> {property.bathrooms} łaz.</span>
            )}
          </div>

          {property.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{property.description}</p>
          )}

          {property.features && property.features.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {property.features.map((f) => (
                <span key={f} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {labelOf("feature", f)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
