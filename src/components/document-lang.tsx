"use client";

// Ustawia atrybut lang dokumentu HTML zgodnie z aktywnym językiem interfejsu

import { useEffect } from "react";
import type { Locale } from "@/i18n/types";

export function DocumentLang({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale === "pl" ? "pl" : "en";
  }, [locale]);

  return null;
}
