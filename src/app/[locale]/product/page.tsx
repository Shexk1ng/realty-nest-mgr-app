// Trasa produktowa serwisu przekierowująca na stronę główną w bieżącym języku

import { redirect } from "next/navigation";
import { isLocale, localeHref } from "@/lib/i18n-routing";
import type { Locale } from "@/i18n/types";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "pl") as Locale;
  redirect(localeHref(locale, "/"));
}
