// Główny dokument HTML: czcionki, metadane, paleta wczytana z ciasteczka i wspólne konteksty

import { Providers } from "@/components/providers";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { cookies, headers } from "next/headers";
import {
  PALETTE_COOKIE,
  buildPaletteCss,
  resolvePaletteId,
} from "@/dashboard/dashboard-palettes";
import "./globals.css";

const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-serif",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  robots: { index: true, follow: true },
  appleWebApp: {
    title: "Realty Nest",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a7a4f",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [hdrs, cookieStore] = await Promise.all([headers(), cookies()]);
  const locale = hdrs.get("x-locale") ?? "pl";
  const paletteId = resolvePaletteId(cookieStore.get(PALETTE_COOKIE)?.value);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <style id="rn-palette-vars" dangerouslySetInnerHTML={{ __html: buildPaletteCss(paletteId) }} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-ink focus:shadow-lg"
        >
          {locale === "pl" ? "Przejdź do treści" : "Skip to content"}
        </a>
        <Providers paletteId={paletteId}>{children}</Providers>
      </body>
    </html>
  );
}
