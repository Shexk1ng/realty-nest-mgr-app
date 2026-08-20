"use client";

// Kontekst React udostępniający aktywny język, słownik tekstów i funkcję tłumaczącą t

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { en } from "./messages/en";
import { pl } from "./messages/pl";
import type { Locale, Messages } from "./types";
import {
  localeHref as buildLocaleHref,
  stripLocalePrefix,
} from "@/lib/i18n-routing";

const STORAGE_KEY = "realty-nest-locale";

const catalog: Record<Locale, Messages> = { en, pl };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Messages;
  t: (path: string) => string;
  localeHref: (path?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function I18nProvider({
  children,
  locale: localeFromRoute,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [locale, setLocaleState] = useState<Locale>(localeFromRoute);

  useEffect(() => {
    startTransition(() => setLocaleState(localeFromRoute));
  }, [localeFromRoute]);

  const setLocale = useCallback(
    (next: Locale) => {
      window.localStorage.setItem(STORAGE_KEY, next);
      const pathWithoutLocale = stripLocalePrefix(pathname);
      router.push(buildLocaleHref(next, pathWithoutLocale));
    },
    [pathname, router],
  );

  const messages = catalog[locale];

  const t = useCallback(
    (path: string) => {
      const direct = getByPath(messages, path);
      if (direct !== undefined) return direct;
      return path;
    },
    [messages],
  );

  const localeHref = useCallback(
    (path = "/") => buildLocaleHref(locale, path),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      messages,
      t,
      localeHref,
    }),
    [locale, setLocale, messages, t, localeHref],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
