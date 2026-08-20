"use client";

// Rama pulpitu: menu boczne, górny pasek, nawigacja mobilna i pasek postępu przejść

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  BadgeDollarSign,
  BarChart2,
  Building2,
  CalendarClock,
  CalendarDays,
  FileText,
  GitBranch,
  Home,
  Inbox,
  Keyboard,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings2,
  Share2,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  Users,
  X,
} from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@apollo/client/react";
import { useTheme } from "next-themes";
import { useIsClient } from "@/components/theme-toggle";
import { useI18n } from "@/i18n/i18n-context";
import { TwoFactorSetupModal } from "@/components/dashboard/two-factor-setup-modal";
import { AssistantUnassignedNotice } from "@/components/dashboard/assistant-unassigned-notice";
import { AiAssistantProvider, useAiAssistant } from "@/components/dashboard/ai-assistant";
import { NlSearch } from "@/components/dashboard/nl-search";
import { TopbarSearch } from "@/components/dashboard/topbar-search";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { ShortcutsProvider, useShortcuts } from "@/components/dashboard/keyboard-shortcuts";
import { Avatar } from "@/components/ui/avatar";
import { ME, type MeUser } from "@/lib/graphql/queries/account";
import { GET_PROPSHARE_LISTINGS, GET_ALLOCATION_QUEUE, scoreMatch, type PropShareProperty, type AllocationAgent } from "@/lib/graphql/queries/propshare";
import { GET_ENQUIRIES } from "@/lib/graphql/queries/enquiries";
import { roleIs, type Role } from "@/lib/roles";
import { useClickOutside } from "@/lib/hooks/use-click-outside";

type NavItem = {
  id: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  href: string;
  badge?: number;
};

type Translate = (key: string) => string;
type LocaleHref = (path?: string) => string;

type Presence = "online" | "away" | "offline";

const PRESENCE_KEYS: Record<Presence, string> = {
  online: "presenceOnline",
  away: "presenceAway",
  offline: "presenceOffline",
};

function NavBtn({ item, active }: { item: NavItem; active: boolean }) {
  const { t } = useI18n();
  return (
    <Link href={item.href} className={`nav-btn${active ? " active" : ""}`} aria-label={item.label} style={{ position: "relative" }}>
      <item.icon size={18} strokeWidth={1.8} />
      {item.badge != null && item.badge > 0 && (
        <span
          className="nav-badge"
          aria-label={t("dashboard.shell.navBadgeMatches").replace("{count}", String(item.badge))}
        >
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
      <span className="nav-label">{item.label}</span>
      <span className="nav-tip">{item.label}</span>
    </Link>
  );
}

function presenceStatus(lastAllocatedAt: string | null | undefined): Presence {
  if (!lastAllocatedAt) return "offline";
  const hours = (Date.now() - new Date(lastAllocatedAt).getTime()) / (1000 * 60 * 60);
  if (hours < 8) return "online";
  if (hours < 24) return "away";
  return "offline";
}

function buildMainNav(t: Translate, localeHref: LocaleHref, propShareBadge: number): NavItem[] {
  return [
    { id: "dashboard",  icon: LayoutDashboard, label: t("dashboard.nav.overview"),   href: localeHref("/dashboard") },
    { id: "properties", icon: Building2,       label: t("dashboard.nav.properties"), href: localeHref("/dashboard/properties") },
    { id: "pipeline",   icon: GitBranch,       label: t("dashboard.nav.pipeline"),   href: localeHref("/dashboard/pipeline") },
    { id: "contacts",   icon: Users,           label: t("dashboard.nav.contacts"),   href: localeHref("/dashboard/contacts") },
    { id: "enquiries",  icon: Inbox,           label: t("dashboard.nav.enquiries"),  href: localeHref("/dashboard/enquiries") },
    { id: "propshare",  icon: Share2,          label: "PropShare",                   href: localeHref("/dashboard/propshare"), badge: propShareBadge || undefined },
    { id: "commission", icon: BadgeDollarSign, label: t("dashboard.nav.commission"), href: localeHref("/dashboard/commission") },
    { id: "stats",      icon: BarChart2,       label: t("dashboard.nav.stats"),      href: localeHref("/dashboard/stats") },
    { id: "viewings",   icon: CalendarClock,   label: t("dashboard.shell.navViewings"),     href: localeHref("/dashboard/viewings") },
    { id: "transactions", icon: Receipt,       label: t("dashboard.shell.navTransactions"), href: localeHref("/dashboard/transactions") },
    { id: "tasks",      icon: ListChecks,      label: t("dashboard.shell.navTasks"),        href: localeHref("/dashboard/tasks") },
    { id: "documents",  icon: FileText,        label: t("dashboard.nav.documents"),  href: localeHref("/dashboard/documents") },
    { id: "marketing",  icon: Megaphone,       label: t("dashboard.nav.marketing"),  href: localeHref("/dashboard/marketing") },
    { id: "calendar",   icon: CalendarDays,    label: t("dashboard.nav.calendar"),   href: localeHref("/dashboard/calendar") },
  ];
}

function buildExtraNav(
  t: Translate,
  localeHref: LocaleHref,
  { isAdmin, isSystemAdmin }: { isAdmin: boolean; isSystemAdmin: boolean },
): NavItem[] {
  return [
    ...(isAdmin ? [{ id: "security", icon: ShieldCheck, label: t("dashboard.shell.security"), href: localeHref("/dashboard/security") } as NavItem] : []),
    { id: "settings", icon: Settings2, label: t("dashboard.nav.settings"), href: localeHref("/dashboard/settings") },
    ...(!isSystemAdmin
      ? [{ id: "company",   icon: Store,       label: t("dashboard.shell.myCompany"),  href: localeHref("/company") } as NavItem]
      : [{ id: "companies", icon: Store, label: t("dashboard.shell.companies"), href: localeHref("/companies") } as NavItem]
    ),
  ];
}

function buildTitleMap(t: Translate): Record<string, string> {
  return {
    dashboard:  t("dashboard.nav.overview"),
    properties: t("dashboard.nav.properties"),
    pipeline:   t("dashboard.nav.pipeline"),
    contacts:   t("dashboard.nav.contacts"),
    enquiries:  t("dashboard.nav.enquiries"),
    propshare:  "PropShare",
    commission: t("dashboard.nav.commission"),
    stats:      t("dashboard.nav.stats"),
    documents:  t("dashboard.nav.documents"),
    marketing:  t("dashboard.nav.marketing"),
    calendar:   t("dashboard.nav.calendar"),
    settings:   t("dashboard.nav.settings"),
    viewings:     t("dashboard.shell.navViewings"),
    transactions: t("dashboard.shell.navTransactions"),
    tasks:        t("dashboard.shell.navTasks"),
    new:          t("dashboard.shell.titleNewProperty"),
    edit:         t("dashboard.shell.titleEditProperty"),
    security:     t("dashboard.shell.security"),
    company:      t("dashboard.shell.myCompany"),
    companies:    t("dashboard.shell.companies"),
    admin:        t("dashboard.shell.admin"),
  };
}

function NavUserCard({
  userName,
  userRole,
  avatarUrl,
  companyName,
}: {
  userName: string;
  userRole: string;
  avatarUrl: string | null;
  companyName: string | null;
}) {
  const { t, localeHref } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ bottom: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: teamData } = useQuery<{ getAllocationQueue: AllocationAgent[] }>(
    GET_ALLOCATION_QUEUE,
    { skip: !isOpen, fetchPolicy: "cache-and-network" },
  );
  const team = teamData?.getAllocationQueue ?? [];

  function openCard() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ bottom: Math.max(12, window.innerHeight - rect.bottom), left: rect.right + 10 });
    }
    setIsOpen(true);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setIsOpen(false), 130);
  }

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  const card = (
    <div
      className="presence-card"
      style={{ position: "fixed", bottom: pos.bottom, left: pos.left, zIndex: 9999 }}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <div className="presence-card__me">
        <div className="presence-avatar-wrap" style={{ flexShrink: 0 }}>
          <Avatar src={avatarUrl} name={userName} size={40} />
          <span className="presence-dot presence-dot--lg presence-dot--online" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="presence-card__name">{userName}</div>
          <div className="presence-card__sub">{userRole}</div>
          {companyName && <div className="presence-card__company">{companyName}</div>}
        </div>
      </div>

      {team.length > 0 && (
        <>
          <div className="presence-card__sep" />
          <div className="presence-card__label">{t("dashboard.shell.presenceTeam")}</div>
          {team.map((agent) => {
            const status = presenceStatus(agent.lastAllocatedAt);
            return (
              <div key={agent.agentId} className="presence-card__row">
                <div className="presence-avatar-wrap" style={{ flexShrink: 0 }}>
                  <Avatar src={agent.avatarUrl ?? null} name={agent.name} size={28} />
                  <span className={`presence-dot presence-dot--sm presence-dot--${status}`} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="presence-card__member-name">{agent.name}</div>
                  <div className="presence-card__member-role">{agent.role}</div>
                </div>
                <span className={`presence-pill presence-pill--${status}`}>
                  {t(`dashboard.shell.${PRESENCE_KEYS[status]}`)}
                </span>
              </div>
            );
          })}
        </>
      )}

      <div className="presence-card__sep" />
      <button
        type="button"
        className="presence-card__signout"
        onClick={() => signOut({ callbackUrl: localeHref("/login") })}
      >
        <LogOut size={13} strokeWidth={1.8} />
        {t("dashboard.shell.signOut")}
      </button>
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className="nav-user"
        title={`${userName} · ${userRole}`}
        onMouseEnter={openCard}
        onMouseLeave={scheduleClose}
      >
        <div className="presence-avatar-wrap nav-avatar-wrap">
          <Avatar src={avatarUrl} name={userName} size={32} className="nav-avatar" />
          <span className="presence-dot presence-dot--nav presence-dot--online" aria-hidden />
        </div>
        <div className="nav-user__meta">
          <span className="nav-user__name">{userName}</span>
          <span className="nav-user__role">{userRole}</span>
        </div>
      </div>
      {isOpen && typeof document !== "undefined" && createPortal(card, document.body)}
    </>
  );
}

function Sidebar({
  navItems,
  bottomItems,
  pathName,
  userName,
  userRole,
  avatarUrl,
  companyName,
  brandName,
  brandMark,
  brandLogoUrl,
  expanded,
  onToggle,
}: {
  navItems: NavItem[];
  bottomItems: NavItem[];
  pathName: string;
  userName: string;
  userRole: string;
  avatarUrl: string | null;
  companyName: string | null;
  brandName: string;
  brandMark: string;
  brandLogoUrl: string | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t, localeHref } = useI18n();

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <Link
          href={localeHref("/dashboard")}
          className={`brand-mark${brandLogoUrl ? " brand-mark--logo" : ""}`}
          aria-label={brandName}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandLogoUrl || "/logo.svg"}
            alt={brandLogoUrl ? "" : brandMark}
            className="brand-logo-img"
          />
        </Link>
        <span className="sidebar-wordmark">{brandName}</span>
      </div>

      <nav className="nav-group" aria-label={t("dashboard.shell.navMain")}>
        <button
          type="button"
          className="nav-btn"
          onClick={onToggle}
          aria-label={expanded ? t("dashboard.shell.collapseSidebar") : t("dashboard.shell.expandSidebar")}
          aria-expanded={expanded}
        >
          {expanded ? (
            <PanelLeftClose size={18} strokeWidth={1.8} />
          ) : (
            <PanelLeftOpen size={18} strokeWidth={1.8} />
          )}
          <span className="nav-label">{expanded ? t("dashboard.shell.collapse") : t("dashboard.shell.expand")}</span>
          <span className="nav-tip">{t("dashboard.shell.expand")}</span>
        </button>

        <div className="nav-divider" />

        {navItems.map((item) => (
          <NavBtn key={item.id} item={item} active={pathName === item.id} />
        ))}

        {bottomItems.length > 0 && <div className="nav-divider" />}
        {bottomItems.map((item) => (
          <NavBtn key={item.id} item={item} active={pathName === item.id} />
        ))}
      </nav>

      <div className="nav-bottom">
        <NavUserCard
          userName={userName}
          userRole={userRole}
          avatarUrl={avatarUrl}
          companyName={companyName}
        />
      </div>
    </aside>
  );
}

function Topbar({
  pathName,
  pageTitle,
  avatarUrl,
  onOpenMobileMenu,
}: {
  pathName: string;
  pageTitle: string;
  avatarUrl: string | null;
  onOpenMobileMenu: () => void;
}) {
  const { t, localeHref, messages } = useI18n();
  const { data: session } = useSession();
  const ai = useAiAssistant();
  const shortcuts = useShortcuts();
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();
  const isDark = isClient && resolvedTheme === "dark";
  const [nlOpen, setNlOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const user = session?.user;
  const userRole = (user?.role ?? "AGENT") as Role;
  const roleLabel = messages.roles[userRole]?.label ?? userRole;
  const isAdmin = roleIs.adminLevel(userRole);
  const name =
    `${user?.name ?? ""} ${(user as Record<string, unknown>)?.surname ?? ""}`.trim() ||
    user?.email || t("dashboard.shell.userFallback");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setNlOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") { setUserOpen(false); setNlOpen(false); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const userRef  = useRef<HTMLDivElement>(null);
  useClickOutside(userRef, () => setUserOpen(false));

  const panelStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    zIndex: 9000,
    background: "var(--card)",
    border: "1px solid var(--border-soft)",
    borderRadius: 14,
    boxShadow: "0 8px 32px rgba(0,0,0,.13), 0 2px 8px rgba(0,0,0,.07)",
    animation: "entrance 180ms var(--ease-spring) both",
    overflow: "hidden",
  };

  return (
    <header className="topbar">
      <button
        type="button"
        className="hamburger-btn icon-btn"
        onClick={onOpenMobileMenu}
        aria-label={t("dashboard.shell.openNavMenu")}
      >
        <Menu size={19} strokeWidth={1.8} />
      </button>

      <nav className="topbar-breadcrumb" aria-label={t("dashboard.shell.breadcrumb")}>
        <Link href={localeHref("/dashboard")} style={{ textDecoration: "none", color: "inherit" }}>
          <Home size={13} />
        </Link>
        {pathName !== "dashboard" && (
          <>
            <span className="sep">/</span>
            <span className="active">{pageTitle}</span>
          </>
        )}
      </nav>

      <TopbarSearch />

      <NlSearch open={nlOpen} onClose={() => setNlOpen(false)} />

      <div className="topbar-actions">
        <NotificationsPanel isAdmin={isAdmin} />

        <Link
          href={localeHref("/dashboard/enquiries?new=1")}
          className="realty-nest__btn realty-nest__btn--primary realty-nest__btn--sm"
          aria-label={t("dashboard.shell.newEnquiry")}
        >
          <Inbox size={14} />
          <span className="topbar-btn-label">{t("dashboard.shell.newEnquiry")}</span>
        </Link>

        {user && (
          <div ref={userRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="user-chip"
              aria-label={t("dashboard.shell.openUserMenu").replace("{name}", name)}
              aria-expanded={userOpen}
              onClick={() => setUserOpen((v) => !v)}
            >
              <Avatar src={avatarUrl} name={name} size={26} className="av" />
              <span className="topbar-username">{name}</span>
            </button>

            {userOpen && (
              <div style={{ ...panelStyle, width: 230, minWidth: 200 }}>
                <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border-soft)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flexShrink: 0 }}><Avatar src={avatarUrl} name={name} size={36} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{roleLabel}</div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: "4px 0 6px" }}>
                  <button
                    type="button"
                    onClick={() => { setUserOpen(false); setTheme(isDark ? "light" : "dark"); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", width: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text)", textAlign: "left" }}
                    className="search-result-row"
                  >
                    {isDark ? <Sun size={15} strokeWidth={1.8} style={{ color: "var(--text-3)", flexShrink: 0 }} /> : <Moon size={15} strokeWidth={1.8} style={{ color: "var(--text-3)", flexShrink: 0 }} />}
                    {isDark ? t("dashboard.shell.themeLight") : t("dashboard.shell.themeDark")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUserOpen(false); setNlOpen(true); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", width: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text)", textAlign: "left" }}
                    className="search-result-row"
                  >
                    <Sparkles size={15} strokeWidth={1.8} style={{ color: "oklch(0.82 0.22 165)", flexShrink: 0 }} />
                    {t("dashboard.shell.aiSearch")}
                    <kbd style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-4)", background: "var(--surface-hi)", border: "1px solid var(--border-soft)", borderRadius: 4, padding: "1px 5px", fontFamily: "var(--font-mono)" }}>⌘⇧K</kbd>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUserOpen(false); ai.open(); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", width: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text)", textAlign: "left" }}
                    className="search-result-row"
                  >
                    <Sparkles size={15} strokeWidth={1.8} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                    {t("dashboard.shell.aiAssistant")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUserOpen(false); shortcuts.openHelp(); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", width: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text)", textAlign: "left" }}
                    className="search-result-row"
                  >
                    <Keyboard size={15} strokeWidth={1.8} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                    {t("dashboard.shortcuts.title")}
                    <kbd style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-4)", background: "var(--surface-hi)", border: "1px solid var(--border-soft)", borderRadius: 4, padding: "1px 5px", fontFamily: "var(--font-mono)" }}>?</kbd>
                  </button>
                </div>
                <div style={{ borderTop: "1px solid var(--border-soft)" }} />

                {[
                  { id: "settings", icon: Settings2,   label: t("dashboard.nav.settings"),      href: localeHref("/dashboard/settings") },
                  { id: "company",  icon: Store,       label: t("dashboard.shell.myCompany"),   href: localeHref("/company"),             hide: roleIs.systemAdmin(userRole) },
                  { id: "security", icon: ShieldCheck, label: t("dashboard.shell.security"),    href: localeHref("/dashboard/security"),  hide: !isAdmin },
                ].filter((item) => !item.hide).map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setUserOpen(false)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", textDecoration: "none", fontSize: 13, color: "var(--text)" }}
                    className="search-result-row"
                  >
                    <item.icon size={15} strokeWidth={1.8} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                    {item.label}
                  </Link>
                ))}

                <div style={{ borderTop: "1px solid var(--border-soft)", marginTop: 4, padding: "4px 0 6px" }}>
                  <button
                    type="button"
                    onClick={() => { setUserOpen(false); void signOut({ callbackUrl: localeHref("/login") }); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", width: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "oklch(0.58 0.22 25)", textAlign: "left" }}
                    className="search-result-row"
                  >
                    <LogOut size={15} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                    {t("dashboard.shell.signOut")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function BottomNav({ items, pathName }: { items: NavItem[]; pathName: string }) {
  const { t } = useI18n();
  const visible = items.slice(0, 5);
  return (
    <nav className="mobile-nav" aria-label={t("dashboard.shell.navMobile")}>
      <div className="mobile-nav__items">
        {visible.map((item) => {
          const isActive = pathName === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`mobile-nav__btn${isActive ? " active" : ""}`}
            >
              {item.badge != null && item.badge > 0 && (
                <span
                  className="mobile-nav__badge"
                  aria-label={t("dashboard.shell.navBadgeNotifications").replace("{count}", String(item.badge))}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
              <item.icon size={20} strokeWidth={1.6} aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MobileNavDrawer({
  isOpen,
  onClose,
  navItems,
  extraItems,
  pathName,
  userName,
  userRole,
  avatarUrl,
  brandName,
  brandLogoUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  extraItems: NavItem[];
  pathName: string;
  userName: string;
  userRole: string;
  avatarUrl: string | null;
  brandName: string;
  brandLogoUrl: string | null;
}) {
  const { t, localeHref } = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const renderItem = (item: NavItem) => {
    const isActive = pathName === item.id;
    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={onClose}
        aria-current={isActive ? "page" : undefined}
        className={`mobile-drawer__item${isActive ? " active" : ""}`}
      >
        <item.icon size={18} strokeWidth={1.8} aria-hidden />
        <span>{item.label}</span>
        {item.badge != null && item.badge > 0 && (
          <span className="mobile-drawer__badge">{item.badge > 99 ? "99+" : item.badge}</span>
        )}
      </Link>
    );
  };

  return createPortal(
    <div className="mobile-drawer-root">
      <div className="mobile-drawer-backdrop" onClick={onClose} aria-hidden />
      <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label={t("dashboard.shell.navDrawer")}>
        <div className="mobile-drawer__head">
          <Link href={localeHref("/dashboard")} onClick={onClose} className="mobile-drawer__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brandLogoUrl || "/logo.svg"} alt="" className="mobile-drawer__brand-logo" />
            <span>{brandName}</span>
          </Link>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t("dashboard.shell.closeMenu")}>
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="mobile-drawer__user">
          <Avatar src={avatarUrl} name={userName} size={34} />
          <div style={{ minWidth: 0 }}>
            <div className="mobile-drawer__user-name">{userName}</div>
            <div className="mobile-drawer__user-role">{userRole}</div>
          </div>
        </div>

        <nav className="mobile-drawer__nav" aria-label={t("dashboard.shell.navMain")}>
          {navItems.map(renderItem)}
          {extraItems.length > 0 && <div className="mobile-drawer__sep" />}
          {extraItems.map(renderItem)}
        </nav>
      </div>
    </div>,
    document.body,
  );
}

function RouteBar() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9990,
        height: "2px",
        background:
          "linear-gradient(to right, var(--accent), color-mix(in oklab, var(--accent) 55%, var(--info)))",
        boxShadow: "0 0 10px color-mix(in oklab, var(--accent) 55%, transparent)",
        animation: "rn-route 680ms var(--ease-out-quart) forwards",
        transformOrigin: "left center",
      }}
      onAnimationEnd={() => setVisible(false)}
    />
  );
}

function RouteProgress() {
  const pathname = usePathname();
  return <RouteBar key={pathname} />;
}

function DashboardChrome({ children, initialExpanded }: { children: React.ReactNode; initialExpanded: boolean }) {
  const pathname = usePathname();
  const { t, localeHref, messages } = useI18n();
  const { data: session } = useSession();

  const [expanded, setExpanded] = useState(initialExpanded);
  const [animate, setAnimate] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setExpanded(false);
      setAnimate(false);
      setMobileMenuOpen(false);
    });
  }, [pathname]);

  const toggleSidebar = () => {
    const next = !expanded;
    setAnimate(true);
    setExpanded(next);
    document.cookie = `rn-sidebar=${next ? "1" : "0"}; path=/; max-age=31536000; SameSite=Lax`;
  };

  const segments = pathname.split("/");
  const pathName = segments[segments.length - 1] || "dashboard";

  const userRole = (session?.user?.role ?? "AGENT") as Role;
  const isSystemAdmin = roleIs.systemAdmin(userRole);
  const isAdmin = roleIs.adminLevel(userRole);
  const user = session?.user;

  const { data: meData } = useQuery<{ me: MeUser | null }>(ME, {
    fetchPolicy: "cache-and-network",
    skip: !user,
  });
  const me = meData?.me ?? null;
  const avatarUrl = me?.profile.avatarUrl ?? null;

  const company = !isSystemAdmin ? me?.company ?? null : null;
  const brandName = company?.name ?? "Realty Nest";
  const brandLogoUrl = company?.logoUrl ?? null;
  const brandMark = company
    ? (company.name.replace(/[^a-zA-Z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "RN")
    : "RN";

  const name =
    me?.profile.fullName ||
    `${user?.name ?? ""} ${(user as Record<string, unknown>)?.surname ?? ""}`.trim() ||
    user?.email ||
    t("dashboard.shell.userFallback");
  const roleLabel = messages.roles[userRole]?.label ?? userRole;

  const { data: psData } = useQuery<{ getPropShareListings: PropShareProperty[] }>(
    GET_PROPSHARE_LISTINGS,
    { fetchPolicy: "cache-and-network", skip: !user || isSystemAdmin },
  );
  const { data: eqData } = useQuery<{ getEnquiries: { items: { id: string; budget: number | null; location: string | null; propertyInterest: string | null }[] } }>(
    GET_ENQUIRIES,
    {
      fetchPolicy: "cache-and-network",
      skip: !user || isSystemAdmin,
      variables: { limit: 30 },
    },
  );
  const propShareMatchCount = useMemo(() => {
    const listings = psData?.getPropShareListings ?? [];
    const enquiries = eqData?.getEnquiries?.items ?? [];
    return listings.filter((p) => enquiries.some((e) => scoreMatch(p, e) > 0)).length;
  }, [psData, eqData]);

  const mainNav = buildMainNav(t, localeHref, propShareMatchCount);
  const extraNav = buildExtraNav(t, localeHref, { isAdmin, isSystemAdmin });

  const pageTitle = buildTitleMap(t)[pathName] ?? pageTitleFromSlug(pathName);

  return (
    <div className={`app${expanded ? " sidebar-expanded" : ""}${!animate ? " app--no-transition" : ""}`}>
      <RouteProgress />

      <Sidebar
        navItems={mainNav}
        bottomItems={extraNav}
        pathName={pathName}
        userName={name}
        userRole={roleLabel}
        avatarUrl={avatarUrl}
        companyName={company?.name ?? null}
        brandName={brandName}
        brandMark={brandMark}
        brandLogoUrl={brandLogoUrl}
        expanded={expanded}
        onToggle={toggleSidebar}
      />

      <MobileNavDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navItems={mainNav}
        extraItems={extraNav}
        pathName={pathName}
        userName={name}
        userRole={roleLabel}
        avatarUrl={avatarUrl}
        brandName={brandName}
        brandLogoUrl={brandLogoUrl}
      />

      <div className="main">
        <Topbar
          pathName={pathName}
          pageTitle={pageTitle}
          avatarUrl={avatarUrl}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main className="page-body" data-lenis-prevent>
          {children}
        </main>
        <BottomNav items={mainNav} pathName={pathName} />
      </div>
    </div>
  );
}

function pageTitleFromSlug(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function DashboardShell({ children, initialExpanded = false }: { children: React.ReactNode; initialExpanded?: boolean }) {
  return (
    <AiAssistantProvider>
      <ShortcutsProvider>
        <DashboardChrome initialExpanded={initialExpanded}>{children}</DashboardChrome>
      </ShortcutsProvider>
      <TwoFactorSetupModal />
      <AssistantUnassignedNotice />
    </AiAssistantProvider>
  );
}
