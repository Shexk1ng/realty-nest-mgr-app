"use client";

// Strona 404 tras językowych z powrotem na stronę główną

import { useParams } from "next/navigation";
import { FileQuestion } from "lucide-react";
import { Button } from "@heroui/react";
import { en } from "@/i18n/messages/en";
import { pl } from "@/i18n/messages/pl";
import { isLocale, localeHref } from "@/lib/i18n-routing";
import type { Locale } from "@/i18n/types";

function pickLocale(raw: unknown): Locale {
  return typeof raw === "string" && isLocale(raw) ? raw : "en";
}

export default function LocaleNotFound() {
  const params = useParams();
  const locale = pickLocale(params?.locale);
  const messages = locale === "pl" ? pl : en;
  const c = messages.common;

  return (
    <div className="flex min-h-[min(100dvh,720px)] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/80 bg-muted/50 shadow-sm">
        <FileQuestion className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
      <p className="font-mono text-sm tabular-nums text-muted-foreground">
        404
      </p>
      <h1 className="font-display mt-2 max-w-md text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {c.notFoundTitle}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
        {c.notFoundDescription}
      </p>
      <Button
        variant="primary"
        className="mt-8 rounded-xl"
        onPress={() => { window.location.href = localeHref(locale, "/"); }}
      >
        {c.notFoundBackHome}
      </Button>
    </div>
  );
}
