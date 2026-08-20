// Wybiera zestaw metadanych stron odpowiadający kodowi języka

import type { Locale, LocaleMetadataBundle } from "../types";
import { metadataEn } from "./en";
import { metadataPl } from "./pl";

export const metadataByLocale: Record<Locale, LocaleMetadataBundle> = {
  en: metadataEn,
  pl: metadataPl,
};

export function getLocaleMetadata(locale: Locale): LocaleMetadataBundle {
  return metadataByLocale[locale];
}
