// Buduje mapę witryny z adresami stron publicznych w każdej obsługiwanej wersji językowej

import type { MetadataRoute } from "next";
import { absoluteLocaleUrl, locales } from "@/lib/i18n-routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  const paths = ["", "login", "dashboard"] as const;

  for (const locale of locales) {
    for (const segment of paths) {
      const path = segment === "" ? "/" : `/${segment}`;
      const priority =
        segment === ""
          ? 0.9
          : segment === "dashboard"
            ? 0.3
            : 0.4;

      entries.push({
        url: absoluteLocaleUrl(locale, path, base),
        lastModified,
        changeFrequency: segment === "dashboard" ? "weekly" : "monthly",
        priority,
      });
    }
  }

  return entries;
}
