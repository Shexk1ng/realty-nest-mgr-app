"use client";

// Stopka strony marketingowej z opisem serwisu i odnośnikami nawigacyjnymi

import Link from "next/link";
import { useI18n } from "@/i18n/i18n-context";

export function Footer() {
  const { messages, localeHref } = useI18n();
  const f = messages.home.footer;

  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-md">
          <p className="text-lg font-semibold tracking-tight text-foreground">
            {messages.common.brand}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{f.blurb}</p>
        </div>

        <nav aria-label={f.columnProduct}>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {f.columnProduct}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link
                href={localeHref("/")}
                className="text-foreground/90 transition-colors hover:text-foreground"
              >
                {f.linkHome}
              </Link>
            </li>
            <li>
              <Link
                href={localeHref("/login")}
                className="text-foreground/90 transition-colors hover:text-foreground"
              >
                {f.linkLogin}
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <span>{f.copyright}</span>
        </div>
      </div>
    </footer>
  );
}
