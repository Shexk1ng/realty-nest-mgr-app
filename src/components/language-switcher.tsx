"use client";

// Przełącznik języka interfejsu między wersją polską i angielską

import { ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { useI18n } from "@/i18n/i18n-context";
import type { Locale } from "@/i18n/types";

const locales: Locale[] = ["en", "pl"];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <ToggleButtonGroup
      size="sm"
      aria-label={t("common.language")}
      selectionMode="single"
      selectedKeys={[locale]}
      onSelectionChange={(keys) => {
        const next = [...keys][0];
        if (typeof next === "string") setLocale(next as Locale);
      }}
    >
      {locales.map((code) => (
        <ToggleButton key={code} id={code}>
          {code.toUpperCase()}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
