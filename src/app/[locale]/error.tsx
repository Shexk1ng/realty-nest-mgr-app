"use client";

// Granica błędu tras językowych: komunikat w języku trasy i ponowna próba renderowania

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@heroui/react";
import { en } from "@/i18n/messages/en";
import { pl } from "@/i18n/messages/pl";
import { isLocale, localeHref } from "@/lib/i18n-routing";
import type { Locale } from "@/i18n/types";

function pickLocale(raw: unknown): Locale {
  return typeof raw === "string" && isLocale(raw) ? raw : "en";
}

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = pickLocale(params?.locale);
  const messages = locale === "pl" ? pl : en;
  const c = messages.common;

  useEffect(() => {
    console.error("[locale]/error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[min(100dvh,720px)] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 shadow-sm">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
      </div>
      <h1 className="font-display max-w-md text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {c.errorTitle}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
        {c.errorDescription}
      </p>
      {process.env.NODE_ENV === "development" && error.message ? (
        <pre className="mt-6 max-h-40 max-w-lg overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-left text-xs text-muted-foreground">
          {error.message}
        </pre>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" className="rounded-xl" onPress={() => reset()}>
          {c.errorRetry}
        </Button>
        <Button variant="outline" className="rounded-xl" onPress={() => { window.location.href = localeHref(locale, "/"); }}>
          {c.notFoundBackHome}
        </Button>
      </div>
    </div>
  );
}
