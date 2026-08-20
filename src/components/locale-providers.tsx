"use client";

// Osadza drzewo strony w dostawcy tłumaczeń dla wybranego języka

import { I18nProvider } from "@/i18n/i18n-context";
import type { Locale } from "@/i18n/types";

export function LocaleProviders({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
