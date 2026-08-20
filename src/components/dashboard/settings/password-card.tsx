"use client";

// Zmiana hasła z oceną jego siły i sprawdzeniem w bazie wycieków HIBP

import { useEffect, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useSession } from "next-auth/react";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@heroui/react";
import { CHANGE_PASSWORD } from "@/lib/graphql/queries/account";
import { checkPasswordPwned } from "@/lib/security/pwned";
import { useI18n } from "@/i18n/i18n-context";

type Translate = (key: string) => string;

const STRENGTH_KEYS = ["strengthVeryWeak", "strengthWeak", "strengthFair", "strengthGood", "strengthStrong"];

function scorePassword(pw: string, t: Translate): { score: number; label: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  const key = STRENGTH_KEYS[s] ?? "strengthWeak";
  return { score: s, label: t(`dashboard.settingsPassword.${key}`) };
}
const STRENGTH_COLORS = ["var(--danger)", "var(--danger)", "var(--warn)", "var(--info)", "var(--accent)"];

type PwnedState = { status: "idle" | "checking" | "safe" | "pwned"; count: number };

function BreachBadge({ state }: { state: PwnedState }) {
  const { t, locale } = useI18n();

  if (state.status === "checking") {
    return <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> {t("dashboard.settingsPassword.breachChecking")}</span>;
  }
  if (state.status === "safe") {
    return <span className="flex items-center gap-1 text-accent-val"><ShieldCheck className="h-3 w-3" /> {t("dashboard.settingsPassword.breachSafe")}</span>;
  }
  if (state.status === "pwned") {
    return (
      <span className="flex items-center gap-1 text-danger">
        <ShieldAlert className="h-3 w-3" />{" "}
        {t("dashboard.settingsPassword.breachFound").replace(
          "{count}",
          state.count.toLocaleString(locale === "en" ? "en-GB" : "pl-PL"),
        )}
      </span>
    );
  }
  return null;
}

export function PasswordCard() {
  const { t, locale } = useI18n();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [runChange, { loading }] = useMutation(CHANGE_PASSWORD);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pwned, setPwned] = useState<PwnedState>({ status: "idle", count: 0 });

  const strength = scorePassword(next, t);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (next.length < 6) {
        setPwned({ status: "idle", count: 0 });
        return;
      }
      setPwned({ status: "checking", count: 0 });
      checkPasswordPwned(next)
        .then((count) => { if (active) setPwned({ status: count > 0 ? "pwned" : "safe", count }); })
        .catch(() => { if (active) setPwned({ status: "idle", count: 0 }); });
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setError(null);

    if (next.length < 8) {
      setStatus("error");
      setError(t("dashboard.settingsPassword.errTooShort"));
      return;
    }
    if (pwned.status === "pwned") {
      setStatus("error");
      setError(
        t("dashboard.settingsPassword.errPwned").replace(
          "{count}",
          pwned.count.toLocaleString(locale === "en" ? "en-GB" : "pl-PL"),
        ),
      );
      return;
    }
    if (next !== confirm) {
      setStatus("error");
      setError(t("dashboard.settingsPassword.errMismatch"));
      return;
    }
    if (!userId) {
      setStatus("error");
      setError(t("dashboard.settingsPassword.errSession"));
      return;
    }

    try {
      await runChange({ variables: { id: userId, currentPassword: current, newPassword: next } });
      setStatus("ok");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setStatus("error");
      setError(
        (err instanceof Error ? err.message : t("dashboard.settingsPassword.errChange")).replace(
          /^(ApolloError|Error):\s*/i,
          "",
        ),
      );
    }
  }

  return (
    <section className="space-y-4 rn-panel">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <KeyRound className="h-5 w-5 text-primary" aria-hidden /> {t("dashboard.settingsPassword.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.settingsPassword.subtitle")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="rn-field max-w-sm">
          <span className="rn-label">{t("dashboard.settingsPassword.currentLabel")}</span>
          <input
            type="password"
            className="rn-input"
            value={current}
            autoComplete="current-password"
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="rn-field">
            <span className="rn-label">{t("dashboard.settingsPassword.newLabel")}</span>
            <input
              type="password"
              className="rn-input"
              value={next}
              autoComplete="new-password"
              onChange={(e) => setNext(e.target.value)}
              required
            />
            {next && (
              <div style={{ animation: "fade-in-up 200ms var(--ease-out-quart) both" }}>
                <div className="mt-1 flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      style={{
                        height: 4,
                        flex: 1,
                        borderRadius: 999,
                        background: i < strength.score ? STRENGTH_COLORS[strength.score] : "var(--surface-hi)",
                        transition: "background 240ms var(--ease-out-quart)",
                      }}
                    />
                  ))}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span style={{ color: STRENGTH_COLORS[strength.score] }}>{strength.label}</span>
                  <BreachBadge state={pwned} />
                </div>
              </div>
            )}
            {!next && <span className="rn-hint">{t("dashboard.settingsPassword.hintMinLength")}</span>}
          </label>
          <label className="rn-field">
            <span className="rn-label">{t("dashboard.settingsPassword.confirmLabel")}</span>
            <input
              type="password"
              className="rn-input"
              value={confirm}
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>
        </div>

        {status === "error" && error && (
          <div className="rn-banner rn-banner--error">
            <AlertTriangle className="h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}
        {status === "ok" && (
          <div className="rn-banner rn-banner--success">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> <span>{t("dashboard.settingsPassword.successChanged")}</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="primary" type="submit" isDisabled={loading || pwned.status === "pwned" || pwned.status === "checking"}>
            {loading ? <span className="rn-spin" /> : null} {t("dashboard.settingsPassword.submit")}
          </Button>
        </div>
      </form>
    </section>
  );
}
