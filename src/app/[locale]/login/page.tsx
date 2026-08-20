// Trasa logowania: metadane bez indeksowania i osadzenie ekranu logowania

import type { Metadata } from "next";
import { LoginPageClient } from "./login-page-client";
import { isLocale, localeHref, localeLanguageAlternates } from "@/lib/i18n-routing";
import type { Locale } from "@/i18n/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw as Locale;
  const isPl = locale === "pl";

  return {
    title: isPl ? "Logowanie" : "Sign in",
    description: isPl
      ? "Zaloguj się do Realty Nest, aby zarządzać leadami i ofertami."
      : "Sign in to Realty Nest to manage leads and listings.",
    alternates: {
      canonical: localeHref(locale, "/login"),
      languages: localeLanguageAlternates("/login", siteUrl),
    },
    robots: { index: false, follow: true },
  };
}

export default function LoginPage() {
  return <LoginPageClient />;
}
