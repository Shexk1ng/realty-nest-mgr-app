"use client";

// Wyszukiwanie ofert językiem naturalnym z podglądem zapytania GraphQL i filtrowaniem wyników

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useQuery } from "@apollo/client/react";
import { X, Sparkles, Building2, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { Button, TextArea } from "@heroui/react";
import { useI18n } from "@/i18n/i18n-context";
import { GET_PROPERTIES } from "@/lib/graphql/queries/properties";
import type { NL2GQLEntity, NL2GQLFilters, NL2GQLResponse } from "@/app/api/ai/nl2gql/route";

interface SearchProperty {
  id: string;
  title?: string | null;
  location?: string | null;
  price?: number | null;
  propertyType?: string | null;
  status?: string | null;
  area?: number | null;
  rooms?: number | null;
  condition?: string | null;
}

type Translate = (key: string) => string;

function buildTypeLabels(t: Translate): Record<string, string> {
  return {
    APARTMENT: t("dashboard.nlSearch.typeAPARTMENT"),
    HOUSE: t("dashboard.nlSearch.typeHOUSE"),
    STUDIO: t("dashboard.nlSearch.typeSTUDIO"),
    COMMERCIAL: t("dashboard.nlSearch.typeCOMMERCIAL"),
    OFFICE: t("dashboard.nlSearch.typeOFFICE"),
    LAND: t("dashboard.nlSearch.typeLAND"),
  };
}

function buildExamples(t: Translate): string[] {
  return [
    t("dashboard.nlSearch.example1"),
    t("dashboard.nlSearch.example2"),
    t("dashboard.nlSearch.example3"),
    t("dashboard.nlSearch.example4"),
  ];
}

const ENTITY_COLOR: Record<string, string> = {
  location:     "var(--accent)",
  price_max:    "oklch(0.72 0.18 55)",
  price_min:    "oklch(0.72 0.18 55)",
  rooms:        "oklch(0.65 0.18 280)",
  propertyType: "oklch(0.65 0.18 230)",
  status:       "oklch(0.62 0.18 20)",
  area_max:     "oklch(0.65 0.15 140)",
  area_min:     "oklch(0.65 0.15 140)",
  condition:    "oklch(0.65 0.18 310)",
  keyword:      "var(--accent)",
};

function applyFilters(props: SearchProperty[], filters: NL2GQLFilters): SearchProperty[] {
  return props.filter((p) => {
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      if (!p.location?.toLowerCase().includes(loc) && !p.title?.toLowerCase().includes(loc)) return false;
    }
    if (filters.priceMax != null && (p.price ?? Infinity) > filters.priceMax) return false;
    if (filters.priceMin != null && (p.price ?? 0) < filters.priceMin) return false;
    if (filters.rooms != null && p.rooms != null && p.rooms !== filters.rooms) return false;
    if (filters.propertyType && p.propertyType !== filters.propertyType) return false;
    if (filters.status && p.status !== filters.status) return false;
    if (filters.areaMax != null && (p.area ?? Infinity) > filters.areaMax) return false;
    if (filters.areaMin != null && (p.area ?? 0) < filters.areaMin) return false;
    if (filters.condition && p.condition !== filters.condition) return false;
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      if (!p.title?.toLowerCase().includes(kw) && !p.location?.toLowerCase().includes(kw)) return false;
    }
    return true;
  });
}

function GqlBlock({ code }: { code: string }) {
  const highlighted = code.split("\n").map((line, li) => {
    const parts: React.ReactNode[] = [];
    let rest = line;
    let k = 0;
    while (rest.length > 0) {
      if (rest.startsWith("#")) {
        parts.push(<span key={k++} style={{ color: "var(--text-4)" }}>{rest}</span>);
        rest = "";
        continue;
      }
      const kw = rest.match(/^(query|mutation|getProperties|getContacts|getEnquiries)\b/);
      if (kw) { parts.push(<span key={k++} style={{ color: "var(--accent)", fontWeight: 600 }}>{kw[0]}</span>); rest = rest.slice(kw[0].length); continue; }
      const field = rest.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(\s*[:({])/);
      if (field) {
        parts.push(<span key={k++} style={{ color: "var(--text)" }}>{field[1]}</span>);
        parts.push(<span key={k++} style={{ color: "var(--text-3)" }}>{field[2]}</span>);
        rest = rest.slice(field[0].length); continue;
      }
      const str = rest.match(/^"[^"]*"/);
      if (str) { parts.push(<span key={k++} style={{ color: "oklch(0.65 0.15 140)" }}>{str[0]}</span>); rest = rest.slice(str[0].length); continue; }
      const num = rest.match(/^\d+(\.\d+)?/);
      if (num) { parts.push(<span key={k++} style={{ color: "oklch(0.65 0.18 280)" }}>{num[0]}</span>); rest = rest.slice(num[0].length); continue; }
      parts.push(<span key={k++} style={{ color: "var(--text-3)" }}>{rest[0]}</span>);
      rest = rest.slice(1);
    }
    return <span key={li} style={{ display: "block" }}>{parts}{"\n"}</span>;
  });
  return <>{highlighted}</>;
}

interface NlSearchProps {
  open: boolean;
  onClose: () => void;
}

type Phase = "idle" | "loading" | "typing-gql" | "done" | "error";

export function NlSearch({ open, onClose }: NlSearchProps) {
  const { t, localeHref } = useI18n();

  const { data: propsData } = useQuery<{ getProperties: { items: SearchProperty[]; totalCount: number } }>(GET_PROPERTIES, {
    fetchPolicy: "cache-and-network",
    skip: !open,
    variables: { limit: 500 },
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<NL2GQLResponse | null>(null);
  const [typedGql, setTypedGql] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [showGql, setShowGql] = useState(false);
  const [isMac] = useState(() =>
    typeof window !== "undefined" && typeof navigator !== "undefined"
      ? navigator.platform.startsWith("Mac") || /Mac/.test(navigator.userAgent)
      : false
  );

  useEffect(() => {
    if (open) {
      startTransition(() => {
        setQuery(""); setPhase("idle"); setResult(null); setTypedGql(""); setErrMsg(""); setShowGql(false);
      });
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (phase !== "typing-gql" || !result?.gqlQuery) return;
    let i = 0;
    startTransition(() => setTypedGql(""));
    const id = setInterval(() => {
      i++;
      setTypedGql(result.gqlQuery.slice(0, i));
      if (i >= result.gqlQuery.length) { clearInterval(id); setPhase("done"); }
    }, 10);
    return () => clearInterval(id);
  }, [phase, result]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q || phase === "loading") return;
    setPhase("loading"); setResult(null); setTypedGql(""); setErrMsg(""); setShowGql(false);
    try {
      const res = await fetch("/api/ai/nl2gql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) throw new Error("AI error");
      const data = (await res.json()) as NL2GQLResponse;
      setResult(data);
      setPhase("typing-gql");
    } catch {
      setErrMsg(t("dashboard.nlSearch.error"));
      setPhase("error");
    }
  }, [query, phase, t]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSubmit(); }
  };

  const filteredProps = useMemo(() => {
    if (!result?.filters || !propsData?.getProperties) return [];
    return applyFilters(propsData.getProperties.items, result.filters).slice(0, 9);
  }, [result, propsData]);

  const confidencePct = Math.round((result?.confidence ?? 0) * 100);
  const nlKbd = isMac ? "⌘⇧K" : "Ctrl+⇧K";
  const typeLabels = buildTypeLabels(t);
  const examples = buildExamples(t);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { startTransition(() => setMounted(true)); }, []);
  if (!mounted) return null;

  const portal = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="nl-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "7vh",
            paddingBottom: "4vh",
            overflowY: "auto",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: "min(780px, 94vw)",
              background: "var(--card)",
              border: "1px solid var(--border-soft)",
              borderRadius: 18,
              boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px 12px",
              borderBottom: "1px solid var(--border-soft)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{t("dashboard.nlSearch.title")}</span>
                <span style={{
                  fontSize: 10, padding: "2px 7px", borderRadius: 99,
                  background: "var(--accent-soft)", color: "var(--accent)",
                  fontWeight: 600, letterSpacing: "0.04em",
                }}>{t("dashboard.nlSearch.beta")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <kbd style={{
                  fontSize: 10, padding: "2px 6px", borderRadius: 4,
                  background: "var(--surface)", border: "1px solid var(--border-soft)",
                  color: "var(--text-3)", fontFamily: "inherit",
                }}>{nlKbd}</kbd>
                <Button variant="ghost" size="sm" isIconOnly onPress={onClose} aria-label={t("dashboard.nlSearch.close")}>
                  <X size={16} />
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-soft)" }}>
              <TextArea
                ref={inputRef}
                fullWidth
                rows={2}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={phase === "loading" || phase === "typing-gql"}
                placeholder={t("dashboard.nlSearch.placeholder")}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                  {t("dashboard.nlSearch.hintKeys")}
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isDisabled={!query.trim() || phase === "loading" || phase === "typing-gql"}
                >
                  <Sparkles size={13} />
                  {t("dashboard.nlSearch.submit")}
                </Button>
              </div>
            </form>

            <AnimatePresence mode="wait">

              {phase === "idle" && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: "16px 18px" }}>
                  <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                    {t("dashboard.nlSearch.examplesTitle")}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {examples.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => { setQuery(ex); setTimeout(() => inputRef.current?.focus(), 0); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "8px 12px", borderRadius: 8,
                          background: "none", border: "1px solid transparent",
                          cursor: "pointer", textAlign: "left", width: "100%",
                          fontSize: 13, color: "var(--text-2)",
                          transition: "background 100ms, border-color 100ms",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-soft)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; }}
                      >
                        <span style={{ color: "var(--accent)", flexShrink: 0 }}>›</span>
                        {ex}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {phase === "loading" && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ padding: "40px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div style={{ position: "relative", width: 40, height: 40 }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid var(--border-soft)", borderTopColor: "var(--accent)" }}
                    />
                    <Sparkles size={14} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "var(--accent)" }} />
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>{t("dashboard.nlSearch.loadingTitle")}</p>
                  <p style={{ fontSize: 11, color: "var(--text-3)" }}>{t("dashboard.nlSearch.loadingSubtitle")}</p>
                </motion.div>
              )}

              {phase === "error" && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ padding: "28px 18px", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "var(--danger, oklch(0.62 0.22 25))" }}>{errMsg}</p>
                </motion.div>
              )}

              {(phase === "typing-gql" || phase === "done") && result && (
                <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "18px 18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <p style={{ fontSize: 13, color: "var(--text-2)", flex: 1 }}>{result.explanation}</p>
                    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 64, height: 4, borderRadius: 2, background: "var(--border-soft)", overflow: "hidden" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${confidencePct}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          style={{ height: "100%", borderRadius: 2, background: "var(--accent)" }}
                        />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", minWidth: 32 }}>{confidencePct}%</span>
                    </div>
                  </div>

                  {result.entities.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {result.entities.map((ent: NL2GQLEntity, i: number) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0.88 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05, duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "3px 9px", borderRadius: 6,
                            background: `color-mix(in oklab, ${ENTITY_COLOR[ent.type] ?? "var(--accent)"} 10%, var(--surface))`,
                            border: `1px solid color-mix(in oklab, ${ENTITY_COLOR[ent.type] ?? "var(--accent)"} 25%, transparent)`,
                            fontSize: 11,
                          }}
                        >
                          <span style={{ color: "var(--text-3)", fontWeight: 500 }}>{ent.label}:</span>
                          <span style={{ color: ENTITY_COLOR[ent.type] ?? "var(--accent)", fontWeight: 700 }}>{ent.display}</span>
                        </motion.span>
                      ))}
                    </div>
                  )}

                  <div>
                    <button
                      onClick={() => setShowGql((v) => !v)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 11, color: "var(--text-3)", padding: "2px 0",
                        fontFamily: "inherit",
                      }}
                    >
                      {showGql ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {t("dashboard.nlSearch.gqlToggle")}
                    </button>
                    <AnimatePresence>
                      {showGql && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={{
                            marginTop: 8,
                            background: "var(--surface)",
                            border: "1px solid var(--border-soft)",
                            borderRadius: 8,
                            padding: "12px 14px",
                            fontFamily: "'Geist Mono', 'Fira Code', monospace",
                            fontSize: 11,
                            lineHeight: 1.7,
                            overflowX: "auto",
                            whiteSpace: "pre",
                            color: "var(--text-2)",
                          }}>
                            {phase === "typing-gql"
                              ? <>{typedGql}<motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }}>▌</motion.span></>
                              : <GqlBlock code={result.gqlQuery} />
                            }
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {phase === "done" && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                          {t("dashboard.nlSearch.resultsCount").replace("{count}", String(filteredProps.length))}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                          {t("dashboard.nlSearch.resultsTotal").replace("{total}", String(propsData?.getProperties?.totalCount ?? 0))}
                        </span>
                      </div>

                      {filteredProps.length === 0 ? (
                        <div style={{
                          padding: "24px", textAlign: "center",
                          border: "1px dashed var(--border-soft)", borderRadius: 10,
                        }}>
                          <p style={{ fontSize: 13, color: "var(--text-3)" }}>{t("dashboard.nlSearch.emptyTitle")}</p>
                          <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 4 }}>{t("dashboard.nlSearch.emptyHint")}</p>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 8 }}>
                          {filteredProps.map((p, i) => (
                            <motion.div
                              key={p.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04, duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                            >
                              <Link href={localeHref("/dashboard/properties")} style={{ textDecoration: "none", display: "block" }}>
                                <div
                                  style={{
                                    padding: "10px 12px",
                                    borderRadius: 10,
                                    background: "var(--surface)",
                                    border: "1px solid var(--border-soft)",
                                    transition: "border-color 120ms, background 120ms",
                                    cursor: "pointer",
                                  }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLDivElement).style.background = "var(--accent-soft)"; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-soft)"; (e.currentTarget as HTMLDivElement).style.background = "var(--surface)"; }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                    <span style={{
                                      fontSize: 10, padding: "1px 6px", borderRadius: 4,
                                      background: "var(--accent-soft)", color: "var(--accent)", fontWeight: 600,
                                    }}>
                                      {typeLabels[p.propertyType ?? ""] ?? p.propertyType}
                                    </span>
                                    {p.status === "ACTIVE" && (
                                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "oklch(0.65 0.18 140)", display: "inline-block" }} />
                                    )}
                                  </div>
                                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {p.title}
                                  </p>
                                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                                    <MapPin size={9} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                                    <span style={{ fontSize: 11, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.location}</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                                      {p.price != null ? `${Number(p.price).toLocaleString("pl-PL")} zł` : "—"}
                                    </span>
                                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>
                                      {[
                                        p.rooms != null && t("dashboard.nlSearch.roomsCount").replace("{count}", String(p.rooms)),
                                        p.area != null && `${p.area} m²`,
                                      ].filter(Boolean).join(" · ")}
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{
              padding: "9px 18px",
              borderTop: "1px solid var(--border-soft)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 10, color: "var(--text-4)" }}>
                {t("dashboard.nlSearch.footer")}
              </span>
              <Building2 size={11} style={{ color: "var(--text-4)" }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(portal, document.body);
}
