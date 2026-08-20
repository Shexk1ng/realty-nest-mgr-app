"use client";

// Zestaw dostawców po stronie klienta: sesja, motyw, paleta pulpitu, Apollo i powiadomienia

import { ApolloProvider } from "@/components/providers/ApolloProvider";
import { LenisProvider } from "@/components/providers/LenisProvider";
import { Toaster } from "@/components/ui/toast";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { DashboardPaletteProvider } from "@/dashboard/dashboard-palette-context";
import type { DashboardPaletteId } from "@/dashboard/dashboard-palettes";

export function Providers({
  children,
  paletteId,
}: {
  children: React.ReactNode;
  paletteId: DashboardPaletteId;
}) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <DashboardPaletteProvider initialPaletteId={paletteId}>
          <ApolloProvider>
            <LenisProvider>
              {children}
              <Toaster />
            </LenisProvider>
          </ApolloProvider>
        </DashboardPaletteProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
