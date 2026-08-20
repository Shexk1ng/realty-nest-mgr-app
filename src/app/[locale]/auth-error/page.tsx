// Ekran błędu uwierzytelnienia: mapuje kod błędu logowania na komunikat i akcję powrotu

import type { Metadata } from "next";
import { ArrowLeft, RefreshCw, ShieldAlert, ShieldOff, TimerOff, TriangleAlert } from "lucide-react";
import { Button } from "@heroui/react";
import { Header } from "@/components/header";
import { isLocale, localeHref } from "@/lib/i18n-routing";
import type { Locale } from "@/i18n/types";

export const metadata: Metadata = {
  title: "Authentication error — Realty Nest",
  robots: { index: false, follow: false },
};


interface ErrorInfo {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  title: string;
  body: string;
  showRetry: boolean;
}

const ERROR_MAP: Record<string, ErrorInfo> = {
  Configuration: {
    icon: ShieldAlert,
    iconColor: "text-destructive",
    iconBg: "bg-destructive/10 border-destructive/25",
    title: "Server configuration error",
    body: "There's a problem with the authentication server configuration. The team has been notified — please try again in a few minutes.",
    showRetry: false,
  },
  AccessDenied: {
    icon: ShieldOff,
    iconColor: "text-highlight",
    iconBg: "bg-highlight-soft border-highlight/25",
    title: "Access denied",
    body: "Your account doesn't have permission to access this workspace. Contact your Company Admin to check your role and status.",
    showRetry: false,
  },
  Verification: {
    icon: TimerOff,
    iconColor: "text-muted-foreground",
    iconBg: "bg-muted border-border/60",
    title: "Link expired",
    body: "The sign-in link has already been used or has expired. Request a new one and try again.",
    showRetry: true,
  },
  Default: {
    icon: TriangleAlert,
    iconColor: "text-destructive",
    iconBg: "bg-destructive/10 border-destructive/25",
    title: "Authentication failed",
    body: "Something went wrong while signing you in. This is usually a temporary issue — try again or contact support if it persists.",
    showRetry: true,
  },
};

function getErrorInfo(code: string | null): ErrorInfo & { code: string } {
  const key = code && code in ERROR_MAP ? code : "Default";
  return { ...ERROR_MAP[key]!, code: key };
}


export default async function AuthErrorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale: raw } = await params;
  const { error: errorCode = null } = await searchParams;

  const locale: Locale = isLocale(raw) ? (raw as Locale) : "en";
  const isPl = locale === "pl";
  const info = getErrorInfo(errorCode);
  const Icon = info.icon;

  const loginHref = localeHref(locale, "/login");
  const homeHref = localeHref(locale, "/");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-destructive/5 blur-3xl" />
        <div className="absolute -right-16 bottom-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="grid-subtle absolute inset-0 opacity-30" />
      </div>

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md">

          <div className="card-surface rounded-2xl p-8 sm:p-10">

            <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border ${info.iconBg}`}>
              <Icon className={`h-6 w-6 ${info.iconColor}`} aria-hidden />
            </div>

            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {info.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {info.body}
            </p>

            {process.env.NODE_ENV === "development" && errorCode && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Error code
                </span>
                <code className="font-mono text-xs text-foreground">{errorCode}</code>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {info.showRetry ? (
                <Button
                  variant="primary"
                  className="h-11 flex-1 rounded-xl gap-2 shadow-sm"
                  onPress={() => { window.location.href = loginHref; }}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  {isPl ? "Spróbuj ponownie" : "Try again"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-11 flex-1 rounded-xl"
                  onPress={() => { window.location.href = loginHref; }}
                >
                  {isPl ? "Powrót do logowania" : "Back to sign in"}
                </Button>
              )}

              <Button
                variant="ghost"
                className="h-11 rounded-xl gap-2 text-muted-foreground"
                onPress={() => { window.location.href = homeHref; }}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {isPl ? "Strona główna" : "Home"}
              </Button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {isPl
              ? "Jeśli problem się powtarza, skontaktuj się z administratorem systemu."
              : "If this keeps happening, contact your system administrator."}
          </p>
        </div>
      </main>
    </div>
  );
}
