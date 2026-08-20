"use client";

// Szybkie wyszukiwanie rekordów z górnego paska, z podpowiedziami wyników

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Building2, Inbox, Search } from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import { Avatar } from "@/components/ui/avatar";
import { GET_PROPERTIES } from "@/lib/graphql/queries/properties";
import { GET_CONTACTS } from "@/lib/graphql/queries/contacts";
import { GET_ENQUIRIES } from "@/lib/graphql/queries/enquiries";
import { useClickOutside } from "@/lib/hooks/use-click-outside";

interface SearchProperty { id: string; title?: string | null; location?: string | null; status?: string | null; propertyType?: string | null; price?: number | null }
interface SearchContact  { id: string; name: string; email?: string | null; kind?: string | null; phone?: string | null }
interface SearchEnquiry  { id: string; name: string; propertyInterest?: string | null; status?: string | null; priority?: string | null }

const TYPE_PILL: Record<string, string> = {
  APARTMENT: "rgba(99,102,241,.12)", HOUSE: "rgba(16,185,129,.12)", STUDIO: "rgba(245,158,11,.12)",
  COMMERCIAL: "rgba(239,68,68,.12)", OFFICE: "rgba(139,92,246,.12)",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

type Translate = (key: string) => string;

function resultsLabel(t: Translate, count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const key =
    count === 1
      ? "resultsOne"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "resultsFew"
        : "resultsMany";
  return t(`dashboard.topbarSearch.${key}`).replace("{count}", String(count));
}

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

export function TopbarSearch() {
  const { t, localeHref } = useI18n();
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const debouncedQ = useDebounce(searchQuery, 220);

  const [isMac] = useState(() =>
    typeof navigator !== "undefined"
      ? navigator.platform.startsWith("Mac") || /Mac/.test(navigator.userAgent)
      : false
  );
  const kbdLabel = isMac ? "⌘K" : "Ctrl+K";

  const activeQ = debouncedQ.trim();
  const searchActive = activeQ.length >= 2;

  const { data: propsData } = useQuery<{ getProperties: { items: SearchProperty[] } }>(GET_PROPERTIES, {
    fetchPolicy: "cache-and-network",
    skip: !searchActive,
    variables: { search: activeQ, limit: 4 },
  });
  const { data: contactsData } = useQuery<{ getContacts: { items: SearchContact[] } }>(GET_CONTACTS, {
    fetchPolicy: "cache-and-network",
    skip: !searchActive,
    variables: { search: activeQ, limit: 3 },
  });
  const { data: enqData } = useQuery<{ getEnquiries: { items: SearchEnquiry[] } }>(GET_ENQUIRIES, {
    fetchPolicy: "cache-and-network",
    skip: !searchActive,
    variables: { search: activeQ, limit: 3 },
  });

  const searchResults = useMemo(() => {
    if (!searchActive) return null;
    const props = (propsData?.getProperties?.items ?? []).slice(0, 4);
    const contacts = (contactsData?.getContacts?.items ?? []).slice(0, 3);
    const enqs = (enqData?.getEnquiries?.items ?? []).slice(0, 3);
    return { props, contacts, enqs, total: props.length + contacts.length + enqs.length };
  }, [searchActive, propsData, contactsData, enqData]);

  const closeSearch = useCallback(() => { setSearchOpen(false); setSearchQuery(""); }, []);
  useClickOutside(searchRef, closeSearch);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      if (e.key === "Escape") closeSearch();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [closeSearch]);

  return (
    <div ref={searchRef} className="topbar-search" style={{ position: "relative" }} onClick={() => { setSearchOpen(true); searchInputRef.current?.focus(); }}>
      <Search className="s-icon" size={14} />
      <input
        ref={searchInputRef}
        type="search"
        placeholder={t("dashboard.topbarSearch.placeholder")}
        aria-label={t("dashboard.topbarSearch.ariaLabel")}
        value={searchQuery}
        onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
        onFocus={() => setSearchOpen(true)}
      />
      <kbd style={{ opacity: searchQuery ? 0 : 1, transition: "opacity 150ms" }}>{kbdLabel}</kbd>

      {searchOpen && searchResults && (
        <div data-lenis-prevent style={{ ...panelStyle, right: "unset", left: 0, width: 400, maxHeight: 480, overflowY: "auto" }}>
          {searchResults.total === 0 ? (
            <div style={{ padding: "28px 20px", textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>
              {t("dashboard.topbarSearch.noResults").replace("{query}", debouncedQ)}
            </div>
          ) : (
            <>
              {searchResults.props.length > 0 && (
                <div>
                  <div style={{ padding: "10px 16px 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>
                    {t("dashboard.topbarSearch.groupProperties")}
                  </div>
                  {searchResults.props.map((p) => (
                    <Link
                      key={p.id}
                      href={localeHref(`/dashboard/properties`)}
                      onClick={closeSearch}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", textDecoration: "none", borderRadius: 0 }}
                      className="search-result-row"
                    >
                      <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: TYPE_PILL[p.propertyType ?? ""] ?? "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Building2 size={13} style={{ color: "var(--accent)" }} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{p.location} {p.price != null ? `· ${Number(p.price).toLocaleString("pl-PL")} zł` : ""}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: p.status === "ACTIVE" ? "rgba(16,185,129,.12)" : "var(--muted)", color: "var(--text-3)", flexShrink: 0 }}>{p.status ? t(`common.status.${p.status}`) : ""}</span>
                    </Link>
                  ))}
                </div>
              )}

              {searchResults.contacts.length > 0 && (
                <div style={{ borderTop: searchResults.props.length ? "1px solid var(--border-soft)" : "none" }}>
                  <div style={{ padding: "10px 16px 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>
                    {t("dashboard.topbarSearch.groupContacts")}
                  </div>
                  {searchResults.contacts.map((c) => (
                    <Link
                      key={c.id}
                      href={localeHref("/dashboard/contacts")}
                      onClick={closeSearch}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", textDecoration: "none" }}
                      className="search-result-row"
                    >
                      <div style={{ flexShrink: 0, borderRadius: 8, overflow: "hidden" }}><Avatar name={c.name} size={28} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{c.email ?? c.phone ?? (c.kind ? t(`common.status.${c.kind}`) : null)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {searchResults.enqs.length > 0 && (
                <div style={{ borderTop: (searchResults.props.length + searchResults.contacts.length) > 0 ? "1px solid var(--border-soft)" : "none" }}>
                  <div style={{ padding: "10px 16px 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>
                    {t("dashboard.topbarSearch.groupEnquiries")}
                  </div>
                  {searchResults.enqs.map((e) => (
                    <Link
                      key={e.id}
                      href={localeHref("/dashboard/enquiries")}
                      onClick={closeSearch}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", textDecoration: "none" }}
                      className="search-result-row"
                    >
                      <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: "rgba(245,158,11,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Inbox size={13} style={{ color: "oklch(0.7 0.18 60)" }} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{e.propertyInterest ?? (e.status ? t(`common.status.${e.status}`) : null)}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "var(--muted)", color: "var(--text-3)", flexShrink: 0 }}>{e.priority ? t(`common.status.${e.priority}`) : ""}</span>
                    </Link>
                  ))}
                </div>
              )}

              <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border-soft)", fontSize: 10, color: "var(--text-3)", textAlign: "right" }}>
                {resultsLabel(t, searchResults.total)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
