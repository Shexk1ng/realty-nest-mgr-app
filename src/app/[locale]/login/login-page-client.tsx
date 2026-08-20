"use client";

// Ekran logowania: hasło, kod TOTP, kod e-mail i weryfikacja dwuskładnikowa z oceny ryzyka

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  FileSignature,
  GitBranch,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import {
  Alert,
  Button,
  InputGroup,
  InputOTP,
  REGEXP_ONLY_DIGITS,
} from "@heroui/react";
import { gqlVerify2FA } from "@/lib/graphql/auth";
import { useI18n } from "@/i18n/i18n-context";

function BrandMark({ step }: { step: Step }) {
  const { messages } = useI18n();
  const copy = messages.login;
  const stepLabels: Record<Step, string> = {
    credentials: copy.stepCredentials,
    totp: copy.stepTotp,
    "email-otp": copy.stepEmailOtp,
    "risk-2fa": copy.stepRisk,
    loading: copy.stepLoading,
    error: copy.stepError,
  };
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-7 w-7" aria-hidden="true" />
          <span className="pointer-events-none absolute inset-0 rounded-xl bg-primary/5 blur-sm" aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-foreground">Realty Nest</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">{copy.tagline}</p>
        </div>
      </div>
      <span className="shrink-0 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
        {stepLabels[step]}
      </span>
    </div>
  );
}

const STEP_PROGRESS: Record<Step, number> = {
  credentials: 30,
  totp: 75,
  "email-otp": 75,
  "risk-2fa": 80,
  loading: 95,
  error: 100,
};

function LoginProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-px w-full overflow-hidden rounded-full bg-border/60">
      <motion.div
        className="h-full rounded-full bg-linear-to-r from-primary to-primary/60"
        initial={{ width: "0%" }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
      />
    </div>
  );
}

function FloatingInput({
  id, name, type, placeholder, value, onChange, icon: Icon, autoFocus, disabled, readOnly, autoComplete,
}: {
  id: string;
  name?: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ComponentType<{ className?: string }>;
  autoFocus?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
}) {
  return (
    <InputGroup fullWidth isDisabled={disabled} className="h-12 border-white/15 bg-white/[0.04]">
      <InputGroup.Prefix>
        <Icon className="h-4 w-4 shrink-0 text-white/55" aria-hidden />
      </InputGroup.Prefix>
      <InputGroup.Input
        id={id}
        name={name ?? id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        disabled={disabled}
        readOnly={readOnly}
        autoComplete={autoComplete ?? (type === "email" ? "email" : type === "password" ? "current-password" : "one-time-code")}
        className="h-full py-3 text-white placeholder:text-white/35"
      />
    </InputGroup>
  );
}

const LOGIN_GLYPHS = [
  { Icon: Building2, x: "8%", y: "18%", size: 38, delay: 0 },
  { Icon: KeyRound, x: "88%", y: "14%", size: 30, delay: 0.3 },
  { Icon: Users, x: "10%", y: "78%", size: 32, delay: 0.6 },
  { Icon: ShieldCheck, x: "90%", y: "72%", size: 36, delay: 0.9 },
  { Icon: MapPin, x: "6%", y: "48%", size: 26, delay: 1.2 },
  { Icon: FileSignature, x: "92%", y: "44%", size: 26, delay: 1.5 },
  { Icon: GitBranch, x: "18%", y: "92%", size: 24, delay: 1.8 },
  { Icon: CalendarClock, x: "80%", y: "90%", size: 24, delay: 2.1 },
];

function OtpEntry({
  value,
  onChange,
  onComplete,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={(v) => {
        onChange(v);
        if (v.length === 6) onComplete?.(v);
      }}
      pattern={REGEXP_ONLY_DIGITS}
      autoFocus={autoFocus}
      className="justify-center gap-2"
    >
      <InputOTP.Group>
        {[0, 1, 2].map((i) => (
          <InputOTP.Slot key={i} index={i} />
        ))}
      </InputOTP.Group>
      <InputOTP.Separator />
      <InputOTP.Group>
        {[3, 4, 5].map((i) => (
          <InputOTP.Slot key={i} index={i} />
        ))}
      </InputOTP.Group>
    </InputOTP>
  );
}

function PulseLoader() {
  const { messages } = useI18n();
  const copy = messages.login;
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-primary/30"
          animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute inset-2 rounded-full border-2 border-primary/50"
          animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
        <div className="h-6 w-6 rounded-full bg-primary/20 ring-2 ring-primary/40" />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium text-foreground">{copy.loadingTitle}</p>
        <p className="text-xs text-muted-foreground">{copy.loadingSubtitle}</p>
      </div>
    </div>
  );
}

type EmailOtpDelivery = "resend" | "console";

function OtpHint({
  email, delivery, devOtp, redirectedTo, copy,
}: {
  email: string;
  delivery: EmailOtpDelivery;
  devOtp?: string;
  redirectedTo?: string;
  copy: { emailOtpSent: string; emailOtpDevConsole: string; emailOtpDevCode: string };
}) {
  const masked = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(b.length) + c);
  const isConsole = delivery === "console";
  return (
    <div className="space-y-3">
      <Alert status={isConsole ? "warning" : "accent"}>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>
            {isConsole
              ? copy.emailOtpDevConsole
              : copy.emailOtpSent.replace("{email}", masked)}
            {redirectedTo && !isConsole ? <> (dev: <strong>{redirectedTo}</strong>)</> : null}
          </Alert.Description>
        </Alert.Content>
      </Alert>
      {devOtp && (
        <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
            {copy.emailOtpDevCode}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-[0.35em] text-foreground">{devOtp}</p>
        </div>
      )}
    </div>
  );
}

type Step = "credentials" | "totp" | "email-otp" | "risk-2fa" | "loading" | "error";

type PendingUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  shortId: number;
  companyId: string | null;
  twoFactorEnabled: boolean;
};

const SLIDE_IN = { opacity: 0, x: 20 };
const SLIDE_OUT = { opacity: 0, x: -20 };
const VISIBLE = { opacity: 1, x: 0 };
const SPRING = { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const };

export function LoginPageClient() {
  const searchParams = useSearchParams();
  const { messages, localeHref } = useI18n();
  const copy = messages.login;
  const reduce = useReducedMotion();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [credError, setCredError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [totpCode, setTotpCode] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailOtpTokenId, setEmailOtpTokenId] = useState("");

  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null);
  const [riskFactors, setRiskFactors] = useState<string[]>([]);

  const [errorMsg, setErrorMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(false);
  const [emailOtpDelivery, setEmailOtpDelivery] = useState<EmailOtpDelivery>("resend");
  const [emailOtpDevCode, setEmailOtpDevCode] = useState<string | undefined>();
  const [emailOtpRedirectTo, setEmailOtpRedirectTo] = useState<string | undefined>();
  const [emailOtpNotice, setEmailOtpNotice] = useState("");

  const rawCallbackUrl = searchParams.get("callbackUrl") ?? localeHref("/dashboard");
  const callbackUrl = rawCallbackUrl.split("?")[0].split("#")[0] || localeHref("/dashboard");

  async function establishSession(accessToken: string, user: PendingUser): Promise<boolean> {
    const signInResult = await signIn("credentials", {
      redirect: false,
      callbackUrl,
      verifiedToken: accessToken,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      userShortId: String(user.shortId),
      userCompanyId: user.companyId ?? "",
      userTwoFactorEnabled: String(user.twoFactorEnabled),
    });

    if (signInResult?.error) {
      setErrorMsg(copy.sessionError);
      setStep("error");
      return false;
    }

    window.location.assign(callbackUrl);
    return true;
  }

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setCredError("");
    setSubmitting(true);
    setStep("loading");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = (await res.json()) as {
        error?: string;
        twoFactorRequired?: boolean;
        method?: "email";
        pendingToken?: string;
        accessToken?: string;
        user?: PendingUser;
        riskRequired?: boolean;
        riskFactors?: string[];
        tokenId?: string;
        delivery?: "resend" | "console";
        devOtp?: string;
        redirectedTo?: string;
      };

      if (!res.ok || payload.error) {
        setCredError(payload.error ?? copy.invalidCredentials);
        setErrorMsg(payload.error ?? copy.invalidCredentials);
        setStep("error");
        return;
      }

      if (payload.twoFactorRequired && payload.pendingToken && payload.user) {
        setPendingToken(payload.pendingToken);
        setPendingUser(payload.user);
        setStep("totp");
        return;
      }

      if (payload.twoFactorRequired && payload.method === "email" && payload.tokenId && payload.user) {
        setEmailOtpTokenId(payload.tokenId);
        setEmailOtpDelivery(payload.delivery ?? "resend");
        setEmailOtpDevCode(payload.devOtp);
        setEmailOtpRedirectTo(payload.redirectedTo);
        setPendingUser(payload.user);
        setErrorMsg("");
        setEmailOtpNotice("");
        setEmailOtpCode("");
        setStep("email-otp");
        return;
      }

      if (payload.riskRequired && payload.tokenId && payload.user) {
        setEmailOtpTokenId(payload.tokenId);
        setEmailOtpDelivery(payload.delivery ?? "resend");
        setEmailOtpDevCode(payload.devOtp);
        setEmailOtpRedirectTo(payload.redirectedTo);
        setRiskFactors(payload.riskFactors ?? []);
        setPendingUser(payload.user);
        setErrorMsg("");
        setEmailOtpCode("");
        setStep("risk-2fa");
        return;
      }

      if (!payload.accessToken || !payload.user) {
        setErrorMsg(copy.loginIncomplete);
        setStep("error");
        return;
      }

      const statusRes = await fetch(`/api/auth/2fa/email/status?userId=${payload.user.id}`);
      if (!statusRes.ok) {
        setErrorMsg(copy.emailOtpSendFailed);
        setStep("error");
        return;
      }

      const { enabled } = (await statusRes.json()) as { enabled: boolean };
      if (enabled) {
        const sendRes = await fetch("/api/auth/2fa/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: payload.user.id,
            email: payload.user.email,
            userName: payload.user.name,
            userRole: payload.user.role,
            userShortId: payload.user.shortId,
            userCompanyId: payload.user.companyId,
            userTwoFactorEnabled: payload.user.twoFactorEnabled,
            accessToken: payload.accessToken,
          }),
        });
        const sendPayload = (await sendRes.json()) as {
          error?: string;
          tokenId?: string;
          delivery?: EmailOtpDelivery;
          devOtp?: string;
          redirectedTo?: string;
        };

        if (!sendRes.ok || sendPayload.error || !sendPayload.tokenId) {
          setErrorMsg(sendPayload.error ?? copy.emailOtpSendFailed);
          setStep("error");
          return;
        }

        setEmailOtpTokenId(sendPayload.tokenId);
        setEmailOtpDelivery(sendPayload.delivery ?? "resend");
        setEmailOtpDevCode(sendPayload.devOtp);
        setEmailOtpRedirectTo(sendPayload.redirectedTo);
        setErrorMsg("");
        setEmailOtpNotice("");
        setPendingUser(payload.user);
        setStep("email-otp");
        return;
      }

      await establishSession(payload.accessToken, payload.user);
    } catch {
      setErrorMsg(copy.genericError);
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  };

  const submitTotp = async (code: string) => {
    if (!code.trim() || !pendingUser) return;
    setStep("loading");
    try {
      const result = await gqlVerify2FA(pendingToken, code, useBackupCode);
      if (result.errors?.length || !result.data?.verifyTwoFactorLogin?.accessToken) {
        void fetch("/api/auth/totp-failed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: pendingUser.email }),
        }).catch(() => {});
        setErrorMsg(result.errors?.[0]?.message ?? copy.invalidCode);
        setTotpCode("");
        setStep("totp");
        return;
      }
      const verified = result.data.verifyTwoFactorLogin;
      await establishSession(verified.accessToken, {
        id: pendingUser.id,
        name: pendingUser.name,
        email: pendingUser.email,
        role: pendingUser.role,
        shortId: pendingUser.shortId,
        companyId: pendingUser.companyId,
        twoFactorEnabled: true,
      });
    } catch {
      setErrorMsg(copy.genericError);
      setStep("error");
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitTotp(totpCode);
  };

  const submitEmailOtp = async (code: string) => {
    if (!code.trim()) return;
    setStep("loading");
    try {
      const res = await fetch("/api/auth/2fa/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: emailOtpTokenId, otp: code.trim() }),
      });
      const payload = (await res.json()) as {
        error?: string;
        accessToken?: string;
        user?: PendingUser;
      };
      if (!res.ok || payload.error) {
        setErrorMsg(payload.error ?? copy.invalidCode);
        setEmailOtpCode("");
        setStep(step === "risk-2fa" ? "risk-2fa" : "email-otp");
        return;
      }
      await establishSession(payload.accessToken!, payload.user!);
    } catch {
      setErrorMsg(copy.genericError);
      setStep("error");
    }
  };

  const handleEmailOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitEmailOtp(emailOtpCode);
  };

  const handleResendEmailOtp = async () => {
    if (!emailOtpTokenId || resendCooldown) return;
    setResendCooldown(true);
    setTimeout(() => setResendCooldown(false), 60_000);
    setEmailOtpNotice("");
    setErrorMsg("");

    try {
      const sendRes = await fetch("/api/auth/2fa/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: emailOtpTokenId }),
      });
      const sendPayload = (await sendRes.json()) as {
        error?: string;
        tokenId?: string;
        delivery?: EmailOtpDelivery;
        devOtp?: string;
        redirectedTo?: string;
      };

      if (!sendRes.ok || sendPayload.error) {
        setErrorMsg(sendPayload.error ?? copy.emailOtpResendFailed);
        return;
      }

      if (sendPayload.tokenId) setEmailOtpTokenId(sendPayload.tokenId);
      setEmailOtpDelivery(sendPayload.delivery ?? "resend");
      setEmailOtpDevCode(sendPayload.devOtp);
      setEmailOtpRedirectTo(sendPayload.redirectedTo);
      setEmailOtpCode("");
      setEmailOtpNotice(copy.emailOtpResendOk);
    } catch {
      setErrorMsg(copy.emailOtpResendFailed);
    }
  };

  const animProps = reduce
    ? {}
    : { initial: SLIDE_IN, animate: VISIBLE, exit: SLIDE_OUT, transition: SPRING };

  const progress = STEP_PROGRESS[step];

  return (
    <div className="dark relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0b0f1a] px-4 py-12 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(1000px 620px at 50% 8%, #1c2437, #0b0f1a 70%)",
          }}
        />
        <div className="absolute -left-32 top-16 h-96 w-96 rounded-full bg-violet-600/14 blur-3xl motion-safe:animate-[float_18s_ease-in-out_infinite]" />
        <div className="absolute -right-20 bottom-12 h-80 w-80 rounded-full bg-blue-600/14 blur-3xl motion-safe:animate-[float_22s_ease-in-out_infinite_reverse]" />

        {LOGIN_GLYPHS.map(({ Icon, x, y, size, delay }, i) => (
          <motion.div
            key={i}
            className="absolute text-violet-200/70"
            style={{ left: x, top: y }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={
              reduce
                ? { opacity: 0.55, scale: 1 }
                : { opacity: [0.35, 0.7, 0.35], scale: [0.92, 1.08, 0.92], y: [0, -14, 0] }
            }
            transition={{ delay, duration: 7 + (i % 4), repeat: Infinity, ease: "easeInOut" }}
          >
            <Icon style={{ width: size, height: size }} strokeWidth={1.4} />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduce ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] as const }}
        className="relative w-full max-w-md"
      >
        <div className="rn-panel overflow-hidden p-8 sm:p-10">
          <div className="space-y-6">
          <BrandMark step={step} />
          <LoginProgressBar progress={progress} />

          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {step === "totp"
                ? copy.totpTitle
                : step === "email-otp"
                ? copy.emailOtpTitle
                : step === "risk-2fa"
                ? copy.riskTitle
                : copy.title}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {step === "totp"
                ? copy.totpSubtitle
                : step === "email-otp"
                ? copy.emailOtpSubtitle
                : step === "risk-2fa"
                ? copy.riskSubtitle
                : copy.subtitle}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === "credentials" && (
              <motion.form
                key="credentials"
                {...animProps}
                onSubmit={handleCredentialsSubmit}
                className="space-y-5"
                autoComplete="on"
                noValidate
              >
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    {copy.email}
                  </label>
                  <FloatingInput
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder={copy.emailPlaceholder}
                    value={email}
                    onChange={(v) => { setEmail(v); if (credError) setCredError(""); }}
                    icon={Mail}
                    autoFocus
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    {copy.password}
                  </label>
                  <FloatingInput
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(v) => { setPassword(v); if (credError) setCredError(""); }}
                    icon={Lock}
                    disabled={submitting}
                  />
                </div>

                {credError && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {credError}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isDisabled={!email.trim() || !password || submitting}
                  className="h-12 rounded-xl text-sm font-medium"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : copy.submit}
                </Button>
              </motion.form>
            )}

            {step === "totp" && (
              <motion.form key="totp" {...animProps} onSubmit={handleTotpSubmit} className="space-y-5" noValidate>
                <Alert status="accent">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{copy.totpEnabledNotice}</Alert.Description>
                  </Alert.Content>
                </Alert>

                {errorMsg && step === "totp" && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{errorMsg}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}

                <div className="space-y-2">
                  <p className="text-center text-sm font-medium text-foreground">
                    {useBackupCode ? copy.backupCodeLabel : copy.totpCodeLabel}
                  </p>
                  {useBackupCode ? (
                    <FloatingInput
                      id="totp"
                      type="text"
                      placeholder="XXXX-XXXX"
                      value={totpCode}
                      onChange={setTotpCode}
                      icon={KeyRound}
                      autoFocus
                    />
                  ) : (
                    <OtpEntry value={totpCode} onChange={setTotpCode} onComplete={submitTotp} autoFocus />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { setUseBackupCode((b) => !b); setTotpCode(""); }}
                  className="mx-auto flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  {useBackupCode ? copy.useTotpApp : copy.useBackupCode}
                </button>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isDisabled={!totpCode.trim()}
                  className="h-12 rounded-xl text-sm font-medium"
                >
                  {copy.verify}
                </Button>
              </motion.form>
            )}

            {step === "email-otp" && (
              <motion.form key="email-otp" {...animProps} onSubmit={handleEmailOtpSubmit} className="space-y-5" noValidate>
                {errorMsg && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{errorMsg}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
                {emailOtpNotice && (
                  <Alert status="success">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{emailOtpNotice}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
                <OtpHint
                  email={pendingUser?.email ?? email}
                  delivery={emailOtpDelivery}
                  devOtp={emailOtpDevCode}
                  redirectedTo={emailOtpRedirectTo}
                  copy={copy}
                />

                <div className="space-y-2">
                  <p className="text-center text-sm font-medium text-foreground">{copy.emailCodeLabel}</p>
                  <OtpEntry value={emailOtpCode} onChange={setEmailOtpCode} onComplete={submitEmailOtp} autoFocus />
                </div>

                <button
                  type="button"
                  onClick={handleResendEmailOtp}
                  disabled={resendCooldown}
                  className="mx-auto flex items-center text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  {resendCooldown ? copy.resendWait : copy.resendCode}
                </button>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isDisabled={emailOtpCode.trim().replace(/\s/g, "").length < 6}
                  className="h-12 rounded-xl text-sm font-medium"
                >
                  {copy.verifyCode}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setEmailOtpCode(""); }}
                  className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {copy.backToLogin}
                </button>
              </motion.form>
            )}

            {step === "risk-2fa" && (
              <motion.form key="risk-2fa" {...animProps} onSubmit={handleEmailOtpSubmit} className="space-y-5" noValidate>
                <Alert status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>{copy.riskDetectedTitle}</Alert.Title>
                    <Alert.Description>{copy.riskAlertBody}</Alert.Description>
                  </Alert.Content>
                </Alert>

                {riskFactors.length > 0 && (
                  <ul className="space-y-1.5 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                    {riskFactors.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}

                {errorMsg && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{errorMsg}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}

                <OtpHint
                  email={pendingUser?.email ?? email}
                  delivery={emailOtpDelivery}
                  devOtp={emailOtpDevCode}
                  redirectedTo={emailOtpRedirectTo}
                  copy={copy}
                />

                <div className="space-y-2">
                  <p className="text-center text-sm font-medium text-foreground">{copy.riskCodeLabel}</p>
                  <OtpEntry value={emailOtpCode} onChange={setEmailOtpCode} onComplete={submitEmailOtp} autoFocus />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isDisabled={emailOtpCode.trim().replace(/\s/g, "").length < 6}
                  className="h-12 rounded-xl text-sm font-medium"
                >
                  {copy.verifyAndLogin}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setEmailOtpCode(""); }}
                  className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {copy.backToLogin}
                </button>
              </motion.form>
            )}

            {step === "loading" && (
              <motion.div key="loading" {...animProps}>
                <PulseLoader />
              </motion.div>
            )}

            {step === "error" && (
              <motion.div key="error" {...animProps} className="space-y-5">
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{errorMsg}</Alert.Description>
                  </Alert.Content>
                </Alert>
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  className="h-12 rounded-xl"
                  onPress={() => { setPassword(""); setStep("credentials"); }}
                >
                  {copy.retry}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3 text-center">
            <p className="text-xs text-muted-foreground">{copy.footer}</p>
            <Link
              href={localeHref("/")}
              className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              {copy.back}
            </Link>
          </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
