// Typy słowników tłumaczeń, kodów języka oraz metadanych stron dla warstwy i18n

import type { en } from "./messages/en";

export type Locale = "en" | "pl";

export type MarketingSubpageSlug = "product" | "trust" | "stories";

export type Messages = typeof en;

export type MarketingSubpageCopy = Messages["pages"][MarketingSubpageSlug];

export interface LocaleRootMetadataCopy {
  titleDefault: string;
  titleTemplate: string;
  description: string;
  siteName: string;
}

export interface LocalePageMetadataCopy {
  title: string;
  description: string;
}

export interface LocaleMetadataBundle {
  root: LocaleRootMetadataCopy;
  dashboard: { title: string; description: string };
  pages: Record<MarketingSubpageSlug, LocalePageMetadataCopy>;
}
