"use client";

// Ustawienia logowania dwuskładnikowego: aplikacja TOTP oraz kody wysyłane e-mailem

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useSession, signOut } from "next-auth/react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Mail,
  Shield,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { Button } from "@heroui/react";
import {
  CONFIRM_TWO_FACTOR,
  DISABLE_TWO_FACTOR,
  INIT_TWO_FACTOR,
  TWO_FACTOR_STATUS,
  type TwoFactorSetupPayload,
  type TwoFactorStatus,
} from "@/lib/graphql/queries/account";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";

function clean(err: unknown, fallback: string): string {
  return (err instanceof Error ? err.message : fallback).replace(/^(ApolloError|Error):\s*/i, "") || fallback;
}

function Badge({ on }: { on: boolean }) {
  const { t } = useI18n();
  return (
    <span className={cn("rn-badge", on ? "rn-badge--green" : "rn-badge--slate")}>
      {on ? t("dashboard.settingsTwoFactor.badgeOn") : t("dashboard.settingsTwoFactor.badgeOff")}
    </span>
  );
}

function Modal({ children, onClose, busy }: { children: React.ReactNode; onClose: () => void; busy?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      style={{ animation: "fade-in-up 200ms var(--ease-out-quart) both" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border/80 bg-card shadow-xl"
        style={{ animation: "entrance 280ms var(--ease-spring) both" }}
        data-lenis-prevent
      >
        {children}
      </div>
    </div>
  );
}

function TotpSetupModal({ onClose, onEnabled }: { onClose: () => void; onEnabled: () => void }) {
  const { t } = useI18n();
  const [runInit] = useMutation<{ initTwoFactor: TwoFactorSetupPayload }>(INIT_TWO_FACTOR);
  const [runConfirm, { loading: confirming }] = useMutation<{ confirmTwoFactor: TwoFactorStatus }>(CONFIRM_TWO_FACTOR);

  const [setup, setSetup] = useState<TwoFactorSetupPayload | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [initError, setInitError] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    runInit()
      .then((res) => { if (active) setSetup(res.data?.initTwoFactor ?? null); })
      .catch((err: unknown) => { if (active) setInitError(err); })
      .finally(() => { if (active) setLoadingInit(false); });
    return () => { active = false; };
  }, [runInit]);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await runConfirm({ variables: { code: code.replace(/\s/g, "") } });
      onEnabled();
    } catch (err) {
      setError(clean(err, t("dashboard.settingsTwoFactor.errInvalidCode")));
    }
  }

  function copyBackup() {
    if (!setup) return;
    void navigator.clipboard.writeText(setup.backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadBackup() {
    if (!setup) return;
    const blob = new Blob(
      [`${t("dashboard.settingsTwoFactor.backupFileHeading")}\n\n${setup.backupCodes.join("\n")}\n`],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "realty-nest-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal onClose={onClose} busy={confirming}>
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <Smartphone className="h-5 w-5 text-primary" /> {t("dashboard.settingsTwoFactor.setupTitle")}
        </h2>
        <Button variant="ghost" size="sm" isIconOnly onPress={onClose} aria-label={t("dashboard.settingsTwoFactor.close")}>
          <X className="h-4.5 w-4.5" />
        </Button>
      </div>

      <div className="space-y-5 p-5">
        {loadingInit ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("dashboard.settingsTwoFactor.setupGenerating")}
          </div>
        ) : !setup ? (
          <div className="rn-banner rn-banner--error">
            <AlertTriangle className="h-4 w-4 shrink-0" />{" "}
            <span>
              {initError !== null
                ? clean(initError, t("dashboard.settingsTwoFactor.errInit"))
                : t("dashboard.settingsTwoFactor.setupFailed")}
            </span>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm font-semibold text-foreground">{t("dashboard.settingsTwoFactor.step1Title")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("dashboard.settingsTwoFactor.step1Desc")}
              </p>
              <div className="mt-3 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setup.qrCodeDataUrl}
                  alt={t("dashboard.settingsTwoFactor.qrAlt")}
                  width={180}
                  height={180}
                  className="rounded-xl border border-border/60 bg-white p-2"
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">{t("dashboard.settingsTwoFactor.step2Title")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("dashboard.settingsTwoFactor.step2Desc")}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl border border-border/60 bg-muted/40 p-3 font-mono text-xs text-foreground">
                {setup.backupCodes.map((c) => <span key={c}>{c}</span>)}
              </div>
              <div className="mt-2 flex gap-2">
                <Button variant="ghost" size="sm" onPress={copyBackup}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{" "}
                  {copied ? t("dashboard.settingsTwoFactor.copied") : t("dashboard.settingsTwoFactor.copy")}
                </Button>
                <Button variant="ghost" size="sm" onPress={downloadBackup}>
                  <Download className="h-3.5 w-3.5" /> {t("dashboard.settingsTwoFactor.download")}
                </Button>
              </div>
            </div>

            <form onSubmit={confirm} className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("dashboard.settingsTwoFactor.step3Title")}</p>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="rn-input mt-2 text-center font-mono text-lg tracking-[0.4em]"
                />
              </div>

              {error && (
                <div className="rn-banner rn-banner--error">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onPress={onClose} isDisabled={confirming}>{t("common.crud.cancel")}</Button>
                <Button variant="primary" size="sm" type="submit" isDisabled={confirming || code.length !== 6}>
                  {confirming ? <span className="rn-spin" /> : null} {t("dashboard.settingsTwoFactor.verifyEnable")}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
}

function EmailToggleModal({ enabled, onClose, onToggled }: { enabled: boolean; onClose: () => void; onToggled: (v: boolean) => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(enabled ? "/api/auth/2fa/email/disable" : "/api/auth/2fa/email/enable", { method: "POST" });
      if (!res.ok) throw new Error(t("dashboard.settingsTwoFactor.errEmailToggle"));
      onToggled(!enabled);
      onClose();
    } catch (err) {
      setError(clean(err, t("dashboard.settingsTwoFactor.errGeneric")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} busy={busy}>
      <div className="p-6">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--info)_14%,transparent)] text-info">
          <Mail className="h-5 w-5" />
        </div>
        <h3 className="font-display text-base font-semibold text-foreground">
          {enabled
            ? t("dashboard.settingsTwoFactor.emailDisableTitle")
            : t("dashboard.settingsTwoFactor.emailEnableTitle")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {enabled
            ? t("dashboard.settingsTwoFactor.emailDisableBody")
            : t("dashboard.settingsTwoFactor.emailEnableBody")}
        </p>

        {error && (
          <div className="rn-banner rn-banner--error mt-4">
            <AlertTriangle className="h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onPress={onClose} isDisabled={busy}>{t("common.crud.cancel")}</Button>
          <Button
            variant={enabled ? "danger" : "primary"}
            size="sm"
            onPress={() => void toggle()}
            isDisabled={busy}
          >
            {busy ? <span className="rn-spin" /> : null}{" "}
            {enabled ? t("dashboard.settingsTwoFactor.disable") : t("dashboard.settingsTwoFactor.enable")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TotpDisableModal({ onClose, onDisabled }: { onClose: () => void; onDisabled: () => void }) {
  const { t } = useI18n();
  const [runDisable, { loading }] = useMutation(DISABLE_TWO_FACTOR);
  const [error, setError] = useState<string | null>(null);

  async function disable() {
    setError(null);
    try {
      await runDisable({ variables: { reason: "User disabled from settings" } });
      onDisabled();
    } catch (err) {
      setError(clean(err, t("dashboard.settingsTwoFactor.errDisableTotp")));
    }
  }

  return (
    <Modal onClose={onClose} busy={loading}>
      <div className="p-6">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-danger">
          <Shield className="h-5 w-5" />
        </div>
        <h3 className="font-display text-base font-semibold text-foreground">
          {t("dashboard.settingsTwoFactor.totpDisableTitle")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.settingsTwoFactor.totpDisableBody")}
        </p>

        {error && (
          <div className="rn-banner rn-banner--error mt-4">
            <AlertTriangle className="h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onPress={onClose} isDisabled={loading}>{t("common.crud.cancel")}</Button>
          <Button variant="danger" size="sm" onPress={() => void disable()} isDisabled={loading}>
            {loading ? <span className="rn-spin" /> : null} {t("dashboard.settingsTwoFactor.disableTwoFactor")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function MethodRow({
  icon: Icon,
  iconClass,
  title,
  desc,
  enabled,
  children,
}: {
  icon: typeof Mail;
  iconClass: string;
  title: string;
  desc: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <Badge on={enabled} />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}

export function TwoFactorCard() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const { data: totpData, loading: totpLoading, refetch: refetchTotp } =
    useQuery<{ twoFactorStatus: TwoFactorStatus }>(TWO_FACTOR_STATUS, { fetchPolicy: "cache-and-network" });
  const totpEnabled = totpData?.twoFactorStatus.enabled ?? false;

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailLoading, setEmailLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/auth/2fa/email/status?userId=${userId}`);
        if (active && res.ok) setEmailEnabled(((await res.json()) as { enabled: boolean }).enabled);
      } catch {
      } finally {
        if (active) setEmailLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  const [modal, setModal] = useState<"totp-setup" | "totp-disable" | "email" | null>(null);
  const [justEnabled, setJustEnabled] = useState(false);

  const loading = totpLoading && !totpData;
  const anyEnabled = totpEnabled || emailEnabled;

  return (
    <>
      <section id="security" className="space-y-5 rn-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden /> {t("dashboard.settingsTwoFactor.title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("dashboard.settingsTwoFactor.description")}
            </p>
          </div>
          {!loading && <Badge on={anyEnabled} />}
        </div>

        {justEnabled && (
          <div className="rn-banner rn-banner--success">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> <span>{t("dashboard.settingsTwoFactor.enabledBanner")}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("dashboard.settingsTwoFactor.loading")}
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-xl border border-border/60">
            <MethodRow
              icon={Smartphone}
              iconClass="bg-[color-mix(in_oklab,var(--violet)_14%,transparent)] text-violet"
              title={t("dashboard.settingsTwoFactor.totpTitle")}
              desc={t("dashboard.settingsTwoFactor.totpDesc")}
              enabled={totpEnabled}
            >
              {totpEnabled ? (
                <Button variant="ghost" size="sm" onPress={() => setModal("totp-disable")} className="shrink-0">{t("dashboard.settingsTwoFactor.disable")}</Button>
              ) : (
                <Button variant="primary" size="sm" onPress={() => { setJustEnabled(false); setModal("totp-setup"); }} className="shrink-0">{t("dashboard.settingsTwoFactor.setUp")}</Button>
              )}
            </MethodRow>

            <MethodRow
              icon={Mail}
              iconClass="bg-[color-mix(in_oklab,var(--info)_14%,transparent)] text-info"
              title={t("dashboard.settingsTwoFactor.emailTitle")}
              desc={t("dashboard.settingsTwoFactor.emailDesc")}
              enabled={emailEnabled}
            >
              <Button
                variant={emailEnabled ? "ghost" : "primary"}
                size="sm"
                isDisabled={emailLoading}
                onPress={() => setModal("email")}
                className="shrink-0"
              >
                {emailEnabled ? t("dashboard.settingsTwoFactor.disable") : t("dashboard.settingsTwoFactor.enable")}
              </Button>
            </MethodRow>
          </div>
        )}

        {!anyEnabled && !loading && (
          <div className="rn-banner rn-banner--error" style={{ background: "var(--warn-soft)", color: "var(--warn-on-soft)", borderColor: "color-mix(in oklab, var(--warn) 30%, transparent)" }}>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{t("dashboard.settingsTwoFactor.warnNoMethod")}</span>
          </div>
        )}
      </section>

      {modal === "totp-setup" && (
        <TotpSetupModal
          onClose={() => setModal(null)}
          onEnabled={() => { setModal(null); setJustEnabled(true); void refetchTotp(); }}
        />
      )}
      {modal === "totp-disable" && (
        <TotpDisableModal
          onClose={() => setModal(null)}
          onDisabled={() => { setModal(null); void signOut({ callbackUrl: "/login?error=session_expired" }); }}
        />
      )}
      {modal === "email" && (
        <EmailToggleModal
          enabled={emailEnabled}
          onClose={() => setModal(null)}
          onToggled={(v) => setEmailEnabled(v)}
        />
      )}
    </>
  );
}
