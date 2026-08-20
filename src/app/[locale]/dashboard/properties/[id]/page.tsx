"use client";

// Podgląd oferty tylko do odczytu z przejściem do edycji i strony publicznej

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { useSession } from "next-auth/react";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { Button, Spinner } from "@heroui/react";
import { GET_PROPERTY_BY_ID, type Property } from "@/lib/graphql/queries/properties";
import { PropertyPreview } from "@/components/dashboard/property-preview";
import { canManagePropShare } from "@/lib/roles";
import { useI18n } from "@/i18n/i18n-context";

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, localeHref } = useI18n();
  const router = useRouter();
  const { data: session } = useSession();

  const { data, loading, error } = useQuery<{ getPropertyById: Property }>(GET_PROPERTY_BY_ID, {
    variables: { id },
    fetchPolicy: "cache-and-network",
  });

  const property = data?.getPropertyById;

  if (loading && !property) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="rn-panel p-8 text-center">
        <p className="text-sm text-muted-foreground">{t("dashboard.properties.notFound")}</p>
        <Button className="mt-4" variant="ghost" size="sm" onPress={() => router.push(localeHref("/dashboard/properties"))}>
          <ArrowLeft className="h-4 w-4" /> {t("dashboard.properties.backToList")}
        </Button>
      </div>
    );
  }

  const isPublished = Boolean(property.contentApprovedAt);
  const mayShare = canManagePropShare(session?.user, property);

  return (
    <div className="space-y-5 pb-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onPress={() => router.push(localeHref("/dashboard/properties"))}>
          <ArrowLeft className="h-4 w-4" /> {t("dashboard.properties.backToList")}
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {isPublished && (
            <a
              href={localeHref(`/listings/${property.id}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
            >
              <ExternalLink className="h-3.5 w-3.5" /> {t("dashboard.properties.publicPreview")}
            </a>
          )}
          {mayShare && (
            <Button
              variant="primary"
              size="sm"
              onPress={() => router.push(localeHref(`/dashboard/properties/${property.id}/edit`))}
            >
              <Pencil className="h-3.5 w-3.5" /> {t("dashboard.properties.editListing")}
            </Button>
          )}
        </div>
      </header>

      <PropertyPreview property={property} />
    </div>
  );
}
