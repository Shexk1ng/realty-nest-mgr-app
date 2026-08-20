"use client";

// Ekran edycji oferty z przełącznikiem publikacji i formularzem nieruchomości

import { use } from "react";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { PropertyForm } from "@/components/dashboard/property-form";
import { PropertyPublishToggle } from "@/components/dashboard/property-publish-toggle";
import { useI18n } from "@/i18n/i18n-context";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditPropertyPage({ params }: Props) {
  const { id } = use(params);
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const resolved = t(key);
    return resolved === key ? fallback : resolved;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header className="page-header" style={{ marginBottom: 0 }}>
        <Link href="../../properties" className="realty-nest__btn realty-nest__btn--quiet realty-nest__btn--sm" style={{ marginBottom: 8, marginLeft: -8 }}>
          <ArrowLeft size={14} /> {tf("dashboard.properties.allListings", "Wszystkie oferty")}
        </Link>
        <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Building2 size={22} style={{ color: "var(--accent)" }} />
          {tf("dashboard.properties.editTitle", "Edycja oferty")}
        </h1>
        <p>{tf("dashboard.properties.editSubtitle", "Zaktualizuj dane i wygeneruj opis — podgląd odświeża się na bieżąco.")}</p>
      </header>

      <PropertyPublishToggle id={id} />
      <PropertyForm id={id} />
    </div>
  );
}
