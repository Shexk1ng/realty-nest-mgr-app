"use client";

// Nagłówek strony marketingowej z nawigacją, menu mobilnym i przełącznikami języka oraz motywu

import Link from "next/link";
import {
  startTransition,
  useCallback,
  useEffect,
  useId,
  useState,
  type MouseEvent,
} from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Menu, X } from "lucide-react";
import { Button } from "@heroui/react";
import { useI18n } from "@/i18n/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

function normalizePath(path: string) {
  const trimmed = path.replace(/\/$/, "") || "/";
  return trimmed;
}

const menuEase = [0.16, 1, 0.3, 1] as const;

export function Header({
  className,
  overlay,
}: {
  className?: string;
  overlay?: boolean;
}) {
  const { t, localeHref } = useI18n();
  const pathname = usePathname();
  const homeHref = localeHref("/");
  const contactHref = localeHref("/#contact");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mobileNavId = useId();
  const reduceMotion = useReducedMotion();
  const isOverlay = overlay && !scrolled;

  const onHomeNavigate = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (normalizePath(pathname) === normalizePath(homeHref)) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [pathname, homeHref],
  );

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    startTransition(closeMobile);
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const onWiden = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onWiden);
    return () => mq.removeEventListener("change", onWiden);
  }, [mobileOpen]);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const navLinkClass =
    "shrink-0 rounded-md px-1 py-2 transition-colors hover:text-foreground md:py-0";
  const mobileLinkClass =
    "block rounded-lg px-3 py-3 text-base text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  const backdropTransition = reduceMotion
    ? { duration: 0.15 }
    : { duration: 0.22, ease: menuEase };
  const panelTransition = reduceMotion
    ? { duration: 0.15 }
    : { duration: 0.32, ease: menuEase };

  const iconTransition = { duration: 0.2, ease: menuEase };

  return (
    <header
      className={cn(
        "top-0 z-50 transition-colors duration-300",
        overlay ? "fixed inset-x-0" : "sticky",
        isOverlay
          ? "rn-header-overlay bg-transparent text-foreground"
          : "border-b border-border/60 bg-background/90 backdrop-blur-md",
        className,
      )}
    >
      <div className="relative z-50 mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:gap-6 sm:px-6">
        <Link
          href={homeHref}
          onClick={(e) => {
            onHomeNavigate(e);
            closeMobile();
          }}
          className={cn("flex items-center gap-2 text-lg font-semibold tracking-tight transition-opacity hover:opacity-80 text-foreground")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-8 w-8 shrink-0" aria-hidden="true" />
          {t("common.brand")}
        </Link>

        {!overlay && (
          <nav
            className="hidden max-w-xl flex-1 items-center justify-center gap-3 overflow-x-auto text-xs text-muted-foreground md:flex lg:max-w-none lg:gap-5 lg:text-sm"
            aria-label="Main"
          >
            <Link href={homeHref} onClick={onHomeNavigate} className={navLinkClass}>
              {t("common.navHome")}
            </Link>
            <Link href={contactHref} className={navLinkClass}>
              {t("common.navContact")}
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-1 sm:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          <span className="md:hidden">
            <ThemeToggle asIconBtn />
          </span>
          <Button
            variant="primary"
            size="sm"
            className="hidden rounded-md px-4 text-sm sm:inline-flex"
            onPress={() => { window.location.href = localeHref("/login"); }}
          >
            {t("common.navLogin")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            isIconOnly
            className={isOverlay ? "hidden" : "md:hidden"}
            aria-expanded={mobileOpen}
            aria-controls={mobileNavId}
            aria-label={
              mobileOpen ? t("common.navCloseMenu") : t("common.navOpenMenu")
            }
            onPress={() => setMobileOpen((open) => !open)}
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileOpen ? (
                <motion.span
                  key="close"
                  initial={reduceMotion ? false : { opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, rotate: 90 }}
                  transition={iconTransition}
                  className="inline-flex"
                >
                  <X className="h-5 w-5" aria-hidden />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={reduceMotion ? false : { opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, rotate: -90 }}
                  transition={iconTransition}
                  className="inline-flex"
                >
                  <Menu className="h-5 w-5" aria-hidden />
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>

      <AnimatePresence mode="sync">
        {mobileOpen ? (
          <>
            <motion.button
              key="mobile-backdrop"
              type="button"
              className="fixed inset-0 z-40 touch-none bg-black/40 md:hidden overscroll-none"
              aria-hidden
              tabIndex={-1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={backdropTransition}
              onClick={closeMobile}
              onWheel={(e) => e.preventDefault()}
              onTouchMove={(e) => e.preventDefault()}
            />
            <motion.nav
              key="mobile-nav"
              id={mobileNavId}
              className="relative z-50 max-h-[min(70vh,calc(100dvh-3.5rem))] overflow-y-auto overflow-x-hidden overscroll-contain border-t border-border bg-background shadow-lg md:hidden sm:max-h-[min(70vh,calc(100dvh-4rem))]"
              data-lenis-prevent
              aria-label="Main"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={panelTransition}
            >
              <div className="mx-auto max-w-6xl space-y-1 px-4 py-3 sm:px-6">
                <Link
                  href={homeHref}
                  className={mobileLinkClass}
                  onClick={(e) => {
                    onHomeNavigate(e);
                    closeMobile();
                  }}
                >
                  {t("common.navHome")}
                </Link>
                <Link
                  href={contactHref}
                  className={mobileLinkClass}
                  onClick={closeMobile}
                >
                  {t("common.navContact")}
                </Link>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    fullWidth
                    className="rounded-md"
                    onPress={() => { window.location.href = localeHref("/login"); closeMobile(); }}
                  >
                    {t("common.navLogin")}
                  </Button>
                </div>
              </div>
            </motion.nav>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
