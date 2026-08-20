"use client";

// Panel bezpieczeństwa: ryzyko logowań, zdarzenia DLP, dziennik audytu i skan anomalii AI

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@apollo/client/react";
import { Button } from "@heroui/react";
import {
  AlertTriangle,
  Bot,
  Database,
  Download,
  FileClock,
  Fingerprint,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Siren,
} from "lucide-react";
import {
  AUDIT_CHAIN_STATUS,
  AUDIT_STATS,
  GET_AUDIT_LOGS,
  type AuditChainStatus,
  type AuditLog,
  type AuditStat,
} from "@/lib/graphql/queries/audit";
import type { SecurityAnomaly } from "@/app/api/ai/security/anomalies/route";
import { GET_BACKUPS, type Backup } from "@/lib/graphql/queries/backup";
import { Skeleton } from "@/components/ui/skeleton";
import { badge, fmtBytes, type BadgeColor } from "@/lib/dashboard-format";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/i18n/i18n-context";

type Translate = (key: string) => string;

const numberLocale = (locale: string) => (locale === "en" ? "en-GB" : "pl-PL");
const fmtInt = (n: number, locale: string) => n.toLocaleString(numberLocale(locale));

type FeedState = "loading" | "ready" | "error";

const SUCCESS_INK = "color-mix(in oklch, var(--success) 70%, var(--text))";

function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rn-panel rn-panel--flush">
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-muted-foreground" /> {title}
        </h2>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Note({
  tone = "muted",
  icon: Icon,
  children,
}: {
  tone?: "muted" | "good" | "danger";
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const toneCls = tone === "danger" ? "text-danger" : tone === "good" ? "" : "text-muted-foreground";
  return (
    <p
      className={`flex items-center justify-center gap-1.5 py-4 text-center text-sm ${toneCls}`}
      style={tone === "good" ? { color: SUCCESS_INK } : undefined}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}

function FeedNote({ state, t, emptyText }: { state: FeedState; t: Translate; emptyText: string }) {
  if (state === "loading") return <Note>{t("dashboard.security.loading")}</Note>;
  if (state === "error") return <Note tone="danger" icon={AlertTriangle}>{t("dashboard.security.feedError")}</Note>;
  return <Note>{emptyText}</Note>;
}

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "good" | "bad";
}) {
  const toneCls = tone === "bad" ? "text-danger" : tone === "good" ? "" : "text-foreground";
  return (
    <div className="rn-panel">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={`mt-1 font-display text-2xl font-semibold tabular-nums ${toneCls}`}
        style={tone === "good" ? { color: SUCCESS_INK } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

const SEV_COLOR: Record<string, BadgeColor> = {
  CRITICAL: "red",
  HIGH: "red",
  MEDIUM: "amber",
  LOW: "blue",
};

const SEV_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

function severityLabel(t: Translate, severity: string): string {
  if (severity === "CRITICAL") return t("dashboard.security.sevCRITICAL");
  if (severity === "LOW" || severity === "MEDIUM" || severity === "HIGH") return t(`common.status.${severity}`);
  return severity;
}

function SevBadge({ severity }: { severity: string }) {
  const { t } = useI18n();
  return (
    <span
      className={`${badge(SEV_COLOR[severity] ?? "slate")} shrink-0`}
      style={
        severity === "CRITICAL"
          ? { boxShadow: "inset 0 0 0 1.5px color-mix(in oklab, var(--rn-red) 45%, transparent)" }
          : undefined
      }
    >
      {severityLabel(t, severity)}
    </span>
  );
}

function BackupPanel() {
  const { t, locale } = useI18n();
  const backupsQ = useQuery<{ getBackups: Backup[] }>(GET_BACKUPS, { fetchPolicy: "cache-and-network" });
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      toast.success(
        t("dashboard.security.backupCreated")
          .replace("{id}", String(body.shortId))
          .replace("{count}", String(body.docCount)),
      );
      await backupsQ.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard.security.backupCreateFailed"));
    } finally {
      setCreating(false);
    }
  };

  const backups = backupsQ.data?.getBackups ?? [];

  return (
    <Panel
      title={t("dashboard.security.backupsTitle")}
      icon={Database}
      action={
        <Button variant="ghost" size="sm" onPress={() => void create()} isDisabled={creating}>
          {creating ? t("dashboard.security.backupCreating") : t("dashboard.security.backupCreate")}
        </Button>
      }
    >
      {backups.length === 0 ? (
        backupsQ.loading ? (
          <Note>{t("dashboard.security.loading")}</Note>
        ) : backupsQ.error ? (
          <Note tone="danger" icon={AlertTriangle}>{t("dashboard.security.backupsError")}</Note>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">{t("dashboard.security.backupsEmpty")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.security.backupsEmptyHint")}</p>
          </div>
        )
      ) : (
        <ul className="-mx-4 -my-4 divide-y divide-border/60">
          {backups.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  #{b.shortId}
                  <span className={badge(b.status === "COMPLETE" ? "green" : "red")}>
                    {b.status === "COMPLETE"
                      ? t("dashboard.security.backupComplete")
                      : t("dashboard.security.backupFailed")}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {b.status === "COMPLETE"
                    ? t("dashboard.security.backupMeta")
                        .replace("{docs}", fmtInt(b.docCount, locale))
                        .replace("{collections}", String(b.collectionsCount))
                        .replace("{size}", fmtBytes(b.sizeBytes))
                        .replace("{ago}", timeAgo(b.createdAt ?? null, t, locale))
                    : (b.errorMessage ?? t("dashboard.security.backupUnknownError"))}
                </div>
                {b.createdByName && (
                  <div className="text-xs text-muted-foreground">
                    {t("dashboard.security.backupAuthor").replace("{name}", b.createdByName)}
                  </div>
                )}
              </div>
              {b.status === "COMPLETE" && (
                <a
                  href={`/api/admin/backup-download?id=${b.id}`}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />{" "}
                  {t("dashboard.security.backupDownload")}
                  <span className="sr-only"> #{b.shortId}</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function timeAgo(iso: string | null, t: Translate, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("dashboard.security.timeNow");
  if (m < 60) return t("dashboard.security.timeMinutes").replace("{n}", String(m));
  const h = Math.floor(m / 60);
  if (h < 24) return t("dashboard.security.timeHours").replace("{n}", String(h));
  return d.toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL");
}

interface OpsEvents {
  dlp: { id: string; timestamp: string; actorIp: string; dataType: string; recordCount: number; severity: string; blocked: boolean; details: string }[];
  honeypot: { id: string; timestamp: string; ip: string; method: string; endpoint: string; severity: string; userAgent: string }[];
  risk: { id: string; timestamp: string; account: string | null; ip: string; score: number; level: string; factors: string[]; stepUpRequired: boolean }[];
}

const DLP_TYPE_KEY: Record<string, string> = {
  contacts: "dashboard.security.dlpTypeContacts",
  properties: "dashboard.security.dlpTypeProperties",
  enquiries: "dashboard.security.dlpTypeEnquiries",
  documents: "dashboard.security.dlpTypeDocuments",
};

function dlpTypeLabel(t: Translate, dataType: string): string {
  const key = DLP_TYPE_KEY[dataType];
  return key ? t(key) : dataType;
}

function scanErrorKey(status: number): string {
  if (status === 503) return "dashboard.security.scanUnavailable";
  if (status === 429) return "dashboard.security.scanRateLimited";
  if (status === 401 || status === 403) return "dashboard.security.scanForbidden";
  return "dashboard.security.scanFailed";
}

export default function SecurityDashboardPage() {
  const { t, locale } = useI18n();
  const { data: session, status: sessionStatus } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "SYSTEM_ADMIN" || role === "COMPANY_ADMIN";
  const isSystemAdmin = role === "SYSTEM_ADMIN";

  const logsQ = useQuery<{ getAuditLogs: AuditLog[] }>(GET_AUDIT_LOGS, {
    variables: { limit: 50 },
    skip: !isAdmin,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const statsQ = useQuery<{ auditStats: AuditStat[] }>(AUDIT_STATS, {
    skip: !isAdmin,
    errorPolicy: "all",
  });
  const chainQ = useQuery<{ auditChainStatus: AuditChainStatus }>(AUDIT_CHAIN_STATUS, {
    skip: !isSystemAdmin,
    errorPolicy: "all",
  });

  const [ops, setOps] = useState<OpsEvents | null>(null);
  const [opsState, setOpsState] = useState<FeedState>("loading");

  const loadOps = useCallback(() => {
    fetch("/api/security/events")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<OpsEvents>;
      })
      .then((d) => {
        setOps(d);
        setOpsState("ready");
      })
      .catch(() => setOpsState("error"));
  }, []);

  const retryOps = useCallback(() => {
    setOpsState("loading");
    loadOps();
  }, [loadOps]);

  useEffect(() => {
    if (isAdmin) loadOps();
  }, [isAdmin, loadOps]);

  const [anomalies, setAnomalies] = useState<SecurityAnomaly[] | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [scanState, setScanState] = useState<"idle" | "loading" | "error">("idle");
  const [scanError, setScanError] = useState<string | null>(null);

  const runScan = useCallback(async () => {
    setScanState("loading");
    setScanError(null);
    try {
      const res = await fetch("/api/ai/security/anomalies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      let body: { anomalies?: SecurityAnomaly[]; logCount?: number } = {};
      try {
        body = (await res.json()) as typeof body;
      } catch {
      }
      if (!res.ok) {
        setScanError(t(scanErrorKey(res.status)));
        setScanState("error");
        return;
      }
      const found = [...(body.anomalies ?? [])].sort(
        (a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0),
      );
      setAnomalies(found);
      setScannedCount(body.logCount ?? 0);
      setScanState("idle");
    } catch {
      setScanError(t("dashboard.security.scanFailed"));
      setScanState("error");
    }
  }, [locale, t]);

  if (sessionStatus === "loading") {
    return (
      <div className="space-y-6 pb-10">
        <Skeleton variant="text" className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rn-panel mx-auto max-w-md text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
        <h1 className="font-display text-lg font-semibold text-foreground">{t("dashboard.security.deniedTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.security.deniedBody")}</p>
      </div>
    );
  }

  const stats = statsQ.data?.auditStats ?? [];
  const total = stats.find((s) => s.key === "TOTAL")?.count ?? 0;
  const last24 = stats.find((s) => s.key === "LAST_24H")?.count ?? 0;
  const chain = chainQ.data?.auditChainStatus;
  const logs = logsQ.data?.getAuditLogs ?? [];

  const statsUnknown = statsQ.loading || Boolean(statsQ.error);
  const auditFailed = Boolean(logsQ.error) && logs.length === 0;
  const auditPending = logsQ.loading && logs.length === 0;
  const opsUnknown = opsState !== "ready";
  const chainFailed = Boolean(chainQ.error) && !chain;

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2.5 font-display text-3xl font-semibold tracking-tight text-foreground">
            <ShieldCheck className="h-7 w-7 text-primary" aria-hidden /> {t("dashboard.security.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSystemAdmin ? t("dashboard.security.description") : t("dashboard.security.descriptionCompany")}
          </p>
        </div>
        <Button variant="primary" onPress={runScan} isDisabled={scanState === "loading"}>
          <Bot className="h-4 w-4" aria-hidden />
          {scanState === "loading" ? t("dashboard.security.scanning") : t("dashboard.security.scanButton")}
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label={t("dashboard.security.statAuditEvents")}
          value={statsUnknown && total === 0 ? "—" : fmtInt(total, locale)}
        />
        <StatTile
          label={t("dashboard.security.statLast24h")}
          value={statsUnknown && last24 === 0 ? "—" : fmtInt(last24, locale)}
        />
        <StatTile
          label={t("dashboard.security.statDlp")}
          value={opsUnknown ? "—" : fmtInt(ops?.dlp.length ?? 0, locale)}
          tone={ops?.dlp.some((e) => e.blocked) ? "bad" : "default"}
        />
        <StatTile
          label={t("dashboard.security.statHoneypot")}
          value={opsUnknown ? "—" : fmtInt(ops?.honeypot.length ?? 0, locale)}
          tone={(ops?.honeypot.length ?? 0) > 0 ? "bad" : "default"}
        />
      </div>

      {isSystemAdmin && (
        <div
          className={`rn-panel flex items-center gap-3 ${
            chainFailed
              ? "border-border"
              : chain?.ok === false
                ? "border-danger/45 bg-danger/8"
                : "border-success/45 bg-success/8"
          }`}
          role={chain?.ok === false ? "alert" : undefined}
        >
          {chainFailed ? (
            <ShieldQuestion className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <Fingerprint
              className={`h-5 w-5 shrink-0 ${chain?.ok === false ? "text-danger" : "text-success"}`}
              aria-hidden
            />
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">
              {chainFailed
                ? t("dashboard.security.chainUnavailable")
                : chain == null
                  ? t("dashboard.security.chainChecking")
                  : chain.ok
                    ? t("dashboard.security.chainOk")
                    : t("dashboard.security.chainBroken")}
            </div>
            <div className="text-xs text-muted-foreground">
              {chainFailed
                ? t("dashboard.security.chainUnavailableDetail")
                : chain
                  ? chain.ok
                    ? t("dashboard.security.chainOkDetail").replace("{count}", fmtInt(chain.total, locale))
                    : t("dashboard.security.chainBrokenDetail")
                        .replace("{seq}", String(chain.brokenAtSeq ?? "?"))
                        .replace("{reason}", chain.reason ?? t("dashboard.security.chainHashMismatch"))
                  : " "}
            </div>
          </div>
          {chainFailed && (
            <Button variant="secondary" size="sm" className="ml-auto" onPress={() => void chainQ.refetch()}>
              {t("common.crud.retry")}
            </Button>
          )}
        </div>
      )}

      {isSystemAdmin && <BackupPanel />}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title={t("dashboard.security.auditTitle")}
          icon={FileClock}
          action={
            <button
              type="button"
              onClick={() => void logsQ.refetch()}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${logsQ.loading ? "animate-spin" : ""}`} aria-hidden />{" "}
              {t("dashboard.security.refresh")}
            </button>
          }
        >
          {auditPending ? (
            <div className="space-y-2.5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="text" className="h-5 w-full" />
              ))}
            </div>
          ) : auditFailed ? (
            <div className="py-4 text-center">
              <Note tone="danger" icon={AlertTriangle}>{t("dashboard.security.auditError")}</Note>
              <Button variant="secondary" size="sm" onPress={() => void logsQ.refetch()}>
                {t("common.crud.retry")}
              </Button>
            </div>
          ) : logs.length === 0 ? (
            <Note>{t("dashboard.security.auditEmpty")}</Note>
          ) : (
            <ul className="max-h-[520px] space-y-1.5 overflow-auto pr-1">
              {logs.map((l) => (
                <li key={l.id} className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60">
                  <span className="mt-0.5 shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    #{l.seq ?? "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-accent-on-soft">{l.category}</span>
                      <span className="font-medium text-foreground">{l.type}</span>
                      {l.actorName && <span className="text-muted-foreground">· {l.actorName}</span>}
                    </div>
                    {l.fallbackText && <p className="truncate text-xs text-muted-foreground">{l.fallbackText}</p>}
                  </div>
                  <div className="shrink-0 text-right text-[11px] text-muted-foreground">
                    <div>{timeAgo(l.createdAt, t, locale)}</div>
                    {l.ipAddress && <div className="font-mono opacity-70">{l.ipAddress}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title={t("dashboard.security.anomaliesTitle")} icon={ShieldAlert}>
            <div aria-live="polite">
              {scanState === "error" && scanError && (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-danger/35 bg-danger/8 px-3 py-2 text-xs text-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
                  <span>{scanError}</span>
                </div>
              )}
              {scanState === "loading" ? (
                <Note>{t("dashboard.security.scanning")}</Note>
              ) : anomalies == null ? (
                <Note>{t("dashboard.security.anomaliesHint")}</Note>
              ) : scannedCount === 0 ? (
                <Note>{t("dashboard.security.anomaliesNoData")}</Note>
              ) : anomalies.length === 0 ? (
                <div className="py-2 text-center">
                  <Note tone="good" icon={ShieldCheck}>{t("dashboard.security.anomaliesNone")}</Note>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.security.scanSummary").replace("{count}", fmtInt(scannedCount, locale))}
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-2.5 text-xs text-muted-foreground">
                    {t("dashboard.security.scanSummary").replace("{count}", fmtInt(scannedCount, locale))}
                  </p>
                  <ul className="space-y-2.5">
                    {anomalies.map((a, i) => (
                      <li key={`${a.type}-${i}`} className="rounded-lg border border-border/60 bg-muted/40 p-3">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <SevBadge severity={a.severity} />
                          <span className="text-sm font-semibold text-foreground">{a.type}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{a.description}</p>
                        {a.recommendation && <p className="mt-1 text-xs font-medium text-foreground">→ {a.recommendation}</p>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </Panel>

          <Panel
            title={t("dashboard.security.dlpTitle")}
            icon={Database}
            action={opsState === "error" ? <RetryLink t={t} onRetry={retryOps} /> : undefined}
          >
            {!ops || ops.dlp.length === 0 ? (
              <FeedNote state={opsState} t={t} emptyText={t("dashboard.security.dlpEmpty")} />
            ) : (
              <ul className="space-y-2">
                {ops.dlp.slice(0, 8).map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-xs">
                    <SevBadge severity={e.severity} />
                    <span className="min-w-0 flex-1 text-foreground">
                      {t("dashboard.security.dlpRecords")
                        .replace("{count}", fmtInt(e.recordCount, locale))
                        .replace("{type}", dlpTypeLabel(t, e.dataType))}{" "}
                      {e.blocked && (
                        <span className="font-semibold text-danger">{t("dashboard.security.dlpBlocked")}</span>
                      )}
                    </span>
                    <span className="shrink-0 font-mono text-muted-foreground">{e.actorIp}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title={t("dashboard.security.honeypotTitle")}
            icon={Siren}
            action={opsState === "error" ? <RetryLink t={t} onRetry={retryOps} /> : undefined}
          >
            {!ops || ops.honeypot.length === 0 ? (
              <FeedNote state={opsState} t={t} emptyText={t("dashboard.security.honeypotEmpty")} />
            ) : (
              <ul className="space-y-2">
                {ops.honeypot.slice(0, 8).map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-xs">
                    <SevBadge severity={e.severity} />
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      <span className="font-mono">{e.method}</span> {e.endpoint}
                    </span>
                    <span className="shrink-0 font-mono text-muted-foreground">{e.ip}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title={t("dashboard.security.riskTitle")}
            icon={ShieldAlert}
            action={opsState === "error" ? <RetryLink t={t} onRetry={retryOps} /> : undefined}
          >
            {!ops || ops.risk.length === 0 ? (
              <FeedNote state={opsState} t={t} emptyText={t("dashboard.security.riskEmpty")} />
            ) : (
              <ul className="space-y-2.5">
                {ops.risk.slice(0, 8).map((e) => (
                  <li key={e.id} className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <SevBadge severity={e.level} />
                      <span className="min-w-0 flex-1 truncate text-foreground">{e.account ?? "—"}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-foreground">
                        {t("dashboard.security.riskPoints").replace("{score}", String(e.score))}
                      </span>
                      <span className="shrink-0 font-mono text-muted-foreground">{e.ip}</span>
                    </div>
                    <p className="pl-1 text-[11px] text-muted-foreground">
                      {e.factors.length > 0 ? e.factors.join(" · ") : t("dashboard.security.riskNoFactors")}
                      {e.stepUpRequired && (
                        <span className="ml-1.5 font-semibold text-danger">
                          → {t("dashboard.security.riskStepUp")}
                        </span>
                      )}
                      <span className="ml-1.5">({timeAgo(e.timestamp, t, locale)})</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function RetryLink({ t, onRetry }: { t: Translate; onRetry: () => void | Promise<void> }) {
  return (
    <button
      type="button"
      onClick={() => void onRetry()}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <RefreshCw className="h-3.5 w-3.5" aria-hidden /> {t("common.crud.retry")}
    </button>
  );
}
