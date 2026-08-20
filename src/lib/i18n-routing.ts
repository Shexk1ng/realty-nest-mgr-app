// Rozpoznaje język z adresu URL oraz buduje odnośniki i alternatywy językowe stron

import type { Locale } from "@/i18n/types";

export const locales = ["en", "pl"] as const;

export const defaultLocale: Locale = "pl";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

function normalizePath(path: string): string {
  if (path === "" || path === "/") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

export function localeHref(locale: Locale, path = "/"): string {
  const normalized = normalizePath(path);
  if (locale === defaultLocale) {
    return normalized || "/";
  }
  return `/${locale}${normalized}`;
}

export function localeFromPathname(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  return first && isLocale(first) ? first : defaultLocale;
}

export function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] && isLocale(segments[0])) {
    const rest = segments.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname || "/";
}

export function pathnameHasExplicitLocale(pathname: string): boolean {
  return locales.some(
    (locale) =>
      pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

const siteUrlFallback = "http://localhost:3000";

export function absoluteLocaleUrl(
  locale: Locale,
  path = "/",
  base = process.env.NEXT_PUBLIC_SITE_URL ?? siteUrlFallback,
): string {
  const origin = base.replace(/\/$/, "");
  return `${origin}${localeHref(locale, path)}`;
}

export function localeLanguageAlternates(path = "/", base?: string) {
  const siteUrl = base ?? process.env.NEXT_PUBLIC_SITE_URL ?? siteUrlFallback;
  return {
    pl: absoluteLocaleUrl("pl", path, siteUrl),
    en: absoluteLocaleUrl("en", path, siteUrl),
    "x-default": absoluteLocaleUrl(defaultLocale, path, siteUrl),
  };
}
