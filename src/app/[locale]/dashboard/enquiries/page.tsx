"use client";

// Ekran zapytań: lista leadów z filtrami, operacje CRUD, podgląd i kreator odpowiedzi

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Inbox, Sparkles, TrendingUp, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@heroui/react";
import { useQuery } from "@apollo/client/react";
import { CrudResource, type Column, type Field } from "@/components/dashboard/crud-resource";
import {
  ADD_ENQUIRY,
  DELETE_ENQUIRY,
  GET_ENQUIRIES,
  UPDATE_ENQUIRY,
  type Enquiry,
} from "@/lib/graphql/queries/enquiries";
import { fmtMoney } from "@/lib/dashboard-format";
import { StatusBadge, ENQUIRY_STATUS_COLORS, ENQUIRY_PRIORITY_COLORS } from "@/components/ui/status-badge";
import { EnquiryReplyComposer } from "@/components/dashboard/enquiry-reply-composer";
import { EnquiryPreview } from "@/components/dashboard/enquiry-preview";
import { CopyValue } from "@/components/ui/copy-value";
import { useI18n } from "@/i18n/i18n-context";

const STATUS_OPTIONS = ["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATING", "LOST"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const SOURCE_OPTIONS = ["PORTAL", "REFERRAL", "DIRECT", "SOCIAL", "AGENCY"];

const sourceLabel = (t: (k: string) => string, v: string) => t(`dashboard.enquiries.src${v}`);
const enumOpts = (t: (k: string) => string, values: string[]) =>
  values.map((v) => ({ value: v, label: t(`common.status.${v}`) }));
const sourceOpts = (t: (k: string) => string) =>
  SOURCE_OPTIONS.map((v) => ({ value: v, label: sourceLabel(t, v) }));

function buildColumns(t: (k: string) => string): Column<Enquiry>[] {
  return [
  {
    key: "name", label: t("dashboard.enquiries.colLead"), sortable: true,
    render: (r) => (
      <div className="min-w-0">
        <p className="font-medium text-foreground">{r.name}</p>
        {r.email || r.phone ? (
          <CopyValue
            className="text-[11px] text-muted-foreground"
            value={(r.email || r.phone) as string}
            label={r.email ? t("dashboard.enquiries.fieldEmail") : t("dashboard.enquiries.fieldPhone")}
          />
        ) : (
          <p className="text-[11px] text-muted-foreground">#{r.shortId}</p>
        )}
      </div>
    ),
  },
  { key: "propertyInterest", label: t("dashboard.enquiries.colInterest"), render: (r) => r.propertyInterest || r.location || "—" },
  { key: "budget", label: t("dashboard.enquiries.colBudget"), sortable: true, align: "right", render: (r) => fmtMoney(r.budget) },
  {
    key: "source", label: t("dashboard.enquiries.colSource"), sortable: true, filter: "select",
    filterOptions: sourceOpts(t),
    render: (r) => sourceLabel(t, r.source),
  },
  {
    key: "priority", label: t("dashboard.enquiries.colPriority"), sortable: true, filter: "select",
    filterOptions: enumOpts(t, PRIORITY_OPTIONS),
    render: (r) => <StatusBadge colorMap={ENQUIRY_PRIORITY_COLORS} value={r.priority} />,
  },
  {
    key: "status", label: t("dashboard.enquiries.colStatus"), sortable: true,
    render: (r) => <StatusBadge colorMap={ENQUIRY_STATUS_COLORS} value={r.status} />,
  },
  ];
}

function buildFields(t: (k: string) => string): Field[] {
  return [
  { name: "name", label: t("dashboard.enquiries.fieldName"), type: "text", required: true },
  { name: "email", label: t("dashboard.enquiries.fieldEmail"), type: "email" },
  { name: "phone", label: t("dashboard.enquiries.fieldPhone"), type: "text" },
  { name: "budget", label: t("dashboard.enquiries.fieldBudget"), type: "number" },
  { name: "propertyInterest", label: t("dashboard.enquiries.fieldInterest"), type: "text", full: true },
  { name: "location", label: t("dashboard.enquiries.fieldLocation"), type: "text" },
  { name: "source", label: t("dashboard.enquiries.colSource"), type: "select", options: sourceOpts(t) },
  { name: "priority", label: t("dashboard.enquiries.colPriority"), type: "select", options: enumOpts(t, PRIORITY_OPTIONS) },
  { name: "status", label: t("dashboard.enquiries.colStatus"), type: "select", options: enumOpts(t, STATUS_OPTIONS) },
  { name: "note", label: t("dashboard.common.notes"), type: "textarea", full: true },
  ];
}

interface LeadScore {
  score: number;
  tier: "HOT" | "WARM" | "COLD";
  factors: string[];
  nextAction: string;
  confidence: string;
  closureProbability: number;
  expectedCloseDays: number;
  scoredAt: string;
  enquiryId: string;
}

const TIER_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  HOT:  { bg: "color-mix(in oklab, oklch(0.62 0.22 25) 10%, var(--card))", text: "oklch(0.58 0.22 25)", border: "color-mix(in oklab, oklch(0.62 0.22 25) 35%, transparent)" },
  WARM: { bg: "color-mix(in oklab, oklch(0.72 0.18 60) 10%, var(--card))",  text: "oklch(0.60 0.18 60)",  border: "color-mix(in oklab, oklch(0.72 0.18 60) 35%, transparent)" },
  COLD: { bg: "color-mix(in oklab, var(--accent) 8%, var(--card))",          text: "var(--accent)",        border: "color-mix(in oklab, var(--accent) 30%, transparent)" },
};

function LeadScoringPanel() {
  const { t, locale } = useI18n();
  const { data, loading } = useQuery<{ getEnquiries: { items: Enquiry[] } }>(GET_ENQUIRIES, {
    fetchPolicy: "cache-and-network",
    variables: { limit: 500 },
  });
  const [scores, setScores] = useState<Record<string, LeadScore | "loading" | "error">>({});
  const [expanded, setExpanded] = useState(false);

  const enquiries = data?.getEnquiries?.items ?? [];
  const activeEnquiries = enquiries.filter((e) => e.status !== "LOST");

  async function scoreEnquiry(e: Enquiry) {
    setScores((prev) => ({ ...prev, [e.id]: "loading" }));
    try {
      const res = await fetch("/api/ai/lead-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enquiry: e }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error ?? "Failed");
      }
      const score = await res.json() as LeadScore;
      setScores((prev) => ({ ...prev, [e.id]: score }));
    } catch {
      setScores((prev) => ({ ...prev, [e.id]: "error" }));
    }
  }

  async function scoreAll() {
    for (const e of activeEnquiries.slice(0, 20)) {
      await scoreEnquiry(e);
    }
  }

  const scoredCount = Object.values(scores).filter((s) => s !== "loading" && s !== "error").length;
  const hotCount = Object.values(scores).filter((s) => s !== "loading" && s !== "error" && (s as LeadScore).tier === "HOT").length;

  return (
    <div
      className="animate-entrance"
      style={{
        marginTop: 24, borderRadius: 16, border: "1px solid var(--border-soft)",
        background: "var(--card)", overflow: "hidden",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        style={{
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
          background: "color-mix(in oklab, var(--accent) 5%, var(--card))",
          borderBottom: expanded ? "1px solid var(--border-soft)" : "none",
          cursor: "pointer",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", flexShrink: 0 }}>
          <TrendingUp size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{t("dashboard.enquiries.scoringTitle")}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>
            {scoredCount > 0
              ? t("dashboard.enquiries.scoringSummary")
                  .replace("{scored}", String(scoredCount))
                  .replace("{hot}", String(hotCount))
              : t("dashboard.enquiries.scoringSubtitle")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!loading && activeEnquiries.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onPress={() => void scoreAll()}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Sparkles size={13} /> {t("dashboard.enquiries.scoreAll").replace("{count}", String(Math.min(activeEnquiries.length, 20)))}
            </Button>
          )}
          <span style={{ color: "var(--text-3)" }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 16 }}>
          {loading ? (
            <div style={{ display: "flex", gap: 8, padding: 12, color: "var(--text-3)", fontSize: 13 }}>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> {t("dashboard.enquiries.scoringLoading")}
            </div>
          ) : activeEnquiries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-3)", fontSize: 13 }}>{t("dashboard.enquiries.scoringEmpty")}</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {activeEnquiries.map((enq) => {
                const scoreEntry = scores[enq.id];
                const isLoading = scoreEntry === "loading";
                const isError = scoreEntry === "error";
                const score = scoreEntry && scoreEntry !== "loading" && scoreEntry !== "error" ? (scoreEntry as LeadScore) : null;
                const tierStyle = score ? TIER_STYLE[score.tier] : null;

                return (
                  <div
                    key={enq.id}
                    style={{
                      borderRadius: 12, border: `1px solid ${tierStyle?.border ?? "var(--border-soft)"}`,
                      background: tierStyle?.bg ?? "var(--surface)",
                      padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start",
                      transition: "background 300ms, border-color 300ms",
                    }}
                  >
                    <div style={{ flexShrink: 0, width: 44, height: 44, position: "relative" }}>
                      <svg width="44" height="44" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border-soft)" strokeWidth="4" />
                        {score && (
                          <circle
                            cx="22" cy="22" r="18" fill="none"
                            stroke={tierStyle?.text ?? "var(--accent)"}
                            strokeWidth="4" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 18}`}
                            strokeDashoffset={`${2 * Math.PI * 18 * (1 - score.score / 100)}`}
                            transform="rotate(-90 22 22)"
                            style={{ transition: "stroke-dashoffset 600ms var(--ease-out-quart)" }}
                          />
                        )}
                      </svg>
                      <div style={{
                        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: score ? 11 : 9, fontWeight: 800, color: tierStyle?.text ?? "var(--text-3)",
                      }}>
                        {isLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                          : score ? score.score
                          : isError ? "!" : "—"}
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{enq.name}</span>
                        {score && (
                          <span style={{
                            fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 5,
                            background: tierStyle?.text, color: "white", letterSpacing: "0.05em",
                          }}>
                            {t(`dashboard.enquiries.tier${score.tier}`)}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: "auto" }}>
                          {enq.budget ? `${Number(enq.budget).toLocaleString(locale === "en" ? "en-GB" : "pl-PL")} zł` : "—"} · {t(`common.status.${enq.status}`)}
                        </span>
                      </div>

                      {score && (
                        <>
                          <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-2)" }}>
                            <strong style={{ color: tierStyle?.text }}>{t("dashboard.enquiries.nextAction")}</strong> {score.nextAction}
                          </div>
                          <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                              {t("dashboard.enquiries.closeChance")}
                            </span>
                            <div style={{
                              position: "relative", flex: 1, minWidth: 40, maxWidth: 120, height: 4,
                              borderRadius: 999, background: "var(--muted)", overflow: "hidden",
                            }} aria-hidden>
                              <div style={{
                                width: `${score.closureProbability}%`, height: "100%",
                                borderRadius: 999, background: tierStyle?.text ?? "var(--accent)",
                              }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>
                              {score.closureProbability}%
                            </span>
                            <span style={{ fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                              {t("dashboard.enquiries.closeDays").replace("{days}", String(score.expectedCloseDays))}
                            </span>
                          </div>
                          <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {score.factors.slice(0, 3).map((f, i) => (
                              <span key={i} style={{
                                fontSize: 10, padding: "1px 6px", borderRadius: 4,
                                background: "var(--muted)", color: "var(--text-3)", border: "1px solid var(--border-soft)",
                              }}>
                                {f}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                      {isError && <div style={{ marginTop: 4, fontSize: 11, color: "oklch(0.58 0.22 25)" }}>{t("dashboard.enquiries.scoreError")}</div>}
                    </div>

                    {!score && !isLoading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => void scoreEnquiry(enq)}
                        style={{ flexShrink: 0, display: "flex", gap: 4, alignItems: "center", fontSize: 11 }}
                      >
                        <Sparkles size={12} /> {t("dashboard.enquiries.scoreOne")}
                      </Button>
                    )}
                    {isError && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => void scoreEnquiry(enq)}
                        style={{ flexShrink: 0, fontSize: 11 }}
                      >
                        {t("dashboard.enquiries.scoreRetry")}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p style={{ marginTop: 10, fontSize: 10, color: "var(--text-3)", textAlign: "right" }}>
            {t("dashboard.enquiries.scoringFootnote")}
          </p>
        </div>
      )}
    </div>
  );
}

function enquiryToForm(r: Enquiry): Record<string, unknown> {
  return {
    name: r.name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    budget: r.budget ?? "",
    propertyInterest: r.propertyInterest ?? "",
    location: r.location ?? "",
    source: r.source ?? "",
    priority: r.priority ?? "",
    status: r.status ?? "",
    note: r.note ?? "",
    shortId: r.shortId,
    createdAt: r.createdAt ?? "",
  };
}

function EnquiriesCrud({ autoOpenNew }: { autoOpenNew: boolean }) {
  const { t } = useI18n();
  const columns = buildColumns(t);
  const fields = buildFields(t);

  return (
    <CrudResource<Enquiry>
      title={t("dashboard.enquiries.title")}
      description={t("dashboard.enquiries.description")}
      icon={Inbox}
      addLabel={t("dashboard.enquiries.add")}
      newTitle={t("dashboard.enquiries.newTitle")}
      editTitle={t("dashboard.enquiries.editTitle")}
      emptyLabel={t("dashboard.enquiries.empty")}
      emptyHintKey="dashboard.enquiries.emptyHint"
      query={GET_ENQUIRIES}
      queryRoot="getEnquiries"
      createMutation={ADD_ENQUIRY}
      updateMutation={UPDATE_ENQUIRY}
      deleteMutation={DELETE_ENQUIRY}
      columns={columns}
      fields={fields}
      defaults={{ source: "DIRECT", priority: "MEDIUM", status: "NEW" }}
      searchKeys={["name", "email", "propertyInterest", "location"]}
      searchPlaceholder={t("dashboard.enquiries.search")}
      statusKey="status"
      statusOptions={STATUS_OPTIONS}
      defaultSort={{ key: "shortId", dir: "desc" }}
      autoOpenNew={autoOpenNew}
      toForm={enquiryToForm}
      preview={(values, mode) => <EnquiryPreview values={values} mode={mode} />}
    />
  );
}

function EnquiriesCrudWithQuery() {
  const params = useSearchParams();
  return <EnquiriesCrud autoOpenNew={params.get("new") === "1"} />;
}

export default function DashboardEnquiriesPage() {
  return (
    <>
      <EnquiryReplyComposer />
      <Suspense fallback={<EnquiriesCrud autoOpenNew={false} />}>
        <EnquiriesCrudWithQuery />
      </Suspense>
      <LeadScoringPanel />
    </>
  );
}
