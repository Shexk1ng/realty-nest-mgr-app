// Pośrednik żądań: routing języka, przepisanie ścieżek i kontrola dostępu do stron chronionych

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  defaultLocale,
  localeFromPathname,
  localeHref,
  pathnameHasExplicitLocale,
} from "@/lib/i18n-routing";
import { roleIs } from "@/lib/roles";

function isDashboardPath(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === `/${defaultLocale}/dashboard` ||
    pathname.startsWith(`/${defaultLocale}/dashboard/`) ||
    pathname === "/en/dashboard" ||
    pathname.startsWith("/en/dashboard/")
  );
}

function isCompaniesPath(pathname: string): boolean {
  return (
    pathname === "/companies" ||
    pathname.startsWith("/companies/") ||
    pathname === `/${defaultLocale}/companies` ||
    pathname.startsWith(`/${defaultLocale}/companies/`) ||
    pathname === "/en/companies" ||
    pathname.startsWith("/en/companies/")
  );
}

function isMyCompanyPath(pathname: string): boolean {
  return (
    pathname === "/company" ||
    pathname.startsWith("/company/") ||
    pathname === `/${defaultLocale}/company` ||
    pathname.startsWith(`/${defaultLocale}/company/`) ||
    pathname === "/en/company" ||
    pathname.startsWith("/en/company/")
  );
}

async function authGuardResponse(
  request: NextRequest,
  publicPathname: string,
): Promise<NextResponse | null> {
  const isProtected =
    isDashboardPath(publicPathname) ||
    isCompaniesPath(publicPathname) ||
    isMyCompanyPath(publicPathname);

  if (!isProtected) return null;

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  const locale = localeFromPathname(publicPathname);

  if (!token) { // brak sesji
    const loginUrl = new URL(localeHref(locale, "/login"), request.url);
    loginUrl.searchParams.set("callbackUrl", publicPathname);
    return NextResponse.redirect(loginUrl);
  }

  // strefa wszystkich firm wyłącznie dla administratora systemu
  if (isCompaniesPath(publicPathname) && !roleIs.systemAdmin(token.role as string)) {
    return NextResponse.redirect(
      new URL(localeHref(locale, "/dashboard"), request.url),
    );
  }

  // kierunek odwrotny: administrator systemu nie pracuje
  // w strefie pojedynczej firmy, lecz w widoku globalnym
  if (isMyCompanyPath(publicPathname) && roleIs.systemAdmin(token.role as string)) {
    return NextResponse.redirect(
      new URL(localeHref(locale, "/companies"), request.url),
    );
  }

  return null;
}

function withLocaleHeader(request: NextRequest, locale: string): NextResponse {
  const headers = new Headers(request.headers);
  headers.set("x-locale", locale);
  return NextResponse.next({ request: { headers } });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/")
  ) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_SITE_URL ?? "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (pathname === "/pl" || pathname.startsWith("/pl/")) {
    const stripped = pathname === "/pl" ? "/" : pathname.slice(3) || "/";
    return NextResponse.redirect(new URL(stripped, request.url));
  }

  const authResponse = await authGuardResponse(request, pathname);
  if (authResponse) return authResponse;

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return withLocaleHeader(request, "en");
  }

  if (!pathnameHasExplicitLocale(pathname)) {
    const internal = pathname === "/" ? "/pl" : `/pl${pathname}`;
    const response = NextResponse.rewrite(new URL(internal, request.url));
    response.headers.set("x-locale", "pl");
    return response;
  }

  return withLocaleHeader(request, "pl");
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
