// Układ tras językowych: metadane SEO, dostawcy kontekstu i język dokumentu

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentLang } from "@/components/document-lang";
import { LocaleProviders } from "@/components/locale-providers";
import { getLocaleMetadata } from "@/i18n/metadata";
import {
  absoluteLocaleUrl,
  isLocale,
  localeHref,
  localeLanguageAlternates,
  locales,
} from "@/lib/i18n-routing";
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
  const m = getLocaleMetadata(locale).root;

  return {
    title: {
      default: m.titleDefault,
      template: m.titleTemplate,
    },
    description: m.description,
    alternates: {
      canonical: localeHref(locale, "/"),
      languages: localeLanguageAlternates("/", siteUrl),
    },
    openGraph: {
      type: "website",
      url: absoluteLocaleUrl(locale, "/", siteUrl),
      siteName: m.siteName,
      locale: locale === "pl" ? "pl_PL" : "en_US",
      alternateLocale: locale === "pl" ? ["en_US"] : ["pl_PL"],
      images: [`${siteUrl}/opengraph-image.png`],
    },
    twitter: {
      card: "summary_large_image",
      images: [`${siteUrl}/twitter-image.png`],
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <>
      <DocumentLang locale={locale} />
      <LocaleProviders locale={locale}>
        <main id="main-content" tabIndex={-1} className="outline-none flex flex-col flex-1">
          {children}
        </main>
      </LocaleProviders>
    </>
  );
}
