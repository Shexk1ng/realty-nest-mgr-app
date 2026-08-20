"use client";

// Lista nieruchomości ograniczona rolą użytkownika z przejściem do dodawania oferty

import { Building2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { PropertiesTable } from "@/components/dashboard/properties-table";
import { useI18n } from "@/i18n/i18n-context";

export default function PropertiesPage() {
  const { localeHref, t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const router = useRouter();

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 font-display text-3xl font-semibold tracking-tight text-foreground">
            <Building2 className="h-5.5 w-5.5 text-primary" aria-hidden />
            {tf("dashboard.properties.pageTitle", "Nieruchomości")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tf("dashboard.properties.pageSubtitle", "Wszystkie oferty widoczne dla Twojej roli — administratorzy widzą całe portfolio, agenci tylko swoje.")}
          </p>
        </div>

        <Button variant="primary" onPress={() => router.push(localeHref("/dashboard/properties/new"))}>
          <Plus size={15} /> {tf("dashboard.properties.addProperty", "Dodaj ofertę")}
        </Button>
      </header>

      <PropertiesTable />
    </>
  );
}
