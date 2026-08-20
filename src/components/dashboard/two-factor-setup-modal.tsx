"use client";

// Zachęta do włączenia logowania dwuskładnikowego po zalogowaniu, z wyborem metody

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/i18n-context";
import { motion } from "motion/react";
import { useSession } from "next-auth/react";
import { CheckCircle2, Mail, ShieldCheck, Smartphone, X } from "lucide-react";
import { Button, Chip, Modal } from "@heroui/react";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "rn_2fa_setup_seen";

function OptionCard({
  icon: Icon,
  iconBg,
  title,
  description,
  badge,
  selected,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  title: string;
  description: string;
  badge?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-200",
        selected
          ? "border-primary/60 bg-primary/5 shadow-[0_0_0_2px_rgba(29,78,216,0.15)]"
          : "border-border/70 bg-card hover:border-border hover:bg-muted/40",
      )}
    >
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconBg)}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {badge && (
            <Chip size="sm" variant="soft" color="success" className="uppercase">
              {badge}
            </Chip>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {selected && (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      )}
    </button>
  );
}

type SetupChoice = "email" | "totp" | null;

export function TwoFactorSetupModal() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const [prompt, setPrompt] = useState(false);
  const [visible, setVisible] = useState(false);
  const [choice, setChoice] = useState<SetupChoice>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user) return;
    const alreadyDismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (alreadyDismissed) return;

    const hasTOTP = session.user.twoFactorEnabled;
    if (hasTOTP) {
      sessionStorage.setItem(DISMISSED_KEY, "1");
      return;
    }

    fetch(`/api/auth/2fa/email/status?userId=${session.user.id}`)
      .then((r) => r.json())
      .then(({ enabled }: { enabled: boolean }) => {
        if (!enabled) setPrompt(true);
        else sessionStorage.setItem(DISMISSED_KEY, "1");
      })
      .catch(() => setPrompt(true));
  }, [session?.user]);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
    setPrompt(false);
  }

  async function handleEnable() {
    if (!choice) return;
    setLoading(true);
    setError("");

    try {
      if (choice === "email") {
        const res = await fetch("/api/auth/2fa/email/enable", { method: "POST" });
        if (!res.ok) throw new Error(t("dashboard.twoFactorSetup.errorEmail"));
        setDone(true);
        sessionStorage.setItem(DISMISSED_KEY, "1");
      } else {
        sessionStorage.setItem(DISMISSED_KEY, "1");
        setVisible(false);
        window.location.href = "/dashboard/settings#security";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.twoFactorSetup.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  if (!prompt && !visible) return null;

  return (
    <>
      {prompt && !visible && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="rounded-xl border border-warn/30 bg-surface p-4 shadow-lg ring-1 ring-black/5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warn/12">
                <ShieldCheck className="h-4.5 w-4.5 text-warn" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {t("dashboard.twoFactorNudge.title")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("dashboard.twoFactorNudge.body")}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" variant="primary" onPress={() => setVisible(true)}>
                    {t("dashboard.twoFactorNudge.enable")}
                  </Button>
                  <Button size="sm" variant="ghost" onPress={dismiss}>
                    {t("dashboard.twoFactorNudge.later")}
                  </Button>
                </div>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label={t("dashboard.twoFactorNudge.later")}
                className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={visible} onOpenChange={(open) => { if (!open) setVisible(false); }}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog aria-labelledby="2fa-setup-title">
            <div className="relative bg-linear-to-br from-indigo-600 via-blue-500 to-cyan-500 px-6 py-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30">
                <ShieldCheck className="h-6 w-6 text-white" aria-hidden />
              </div>
              <Modal.CloseTrigger className="absolute right-4 top-4 text-white/80 hover:text-white" />
              <p id="2fa-setup-title" className="mt-4 text-xl font-bold text-white">
                {t("dashboard.twoFactorSetup.title")}
              </p>
              <p className="mt-1 text-sm text-white/75">
                {t("dashboard.twoFactorSetup.subtitle")}
              </p>
            </div>

            <div className="p-6">
              {done ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-3 py-4 text-center"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {t("dashboard.twoFactorSetup.doneTitle")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.twoFactorSetup.doneBody")}
                  </p>
                  <Button type="button" variant="primary" onPress={dismiss} className="mt-2 w-full">
                    {t("dashboard.twoFactorSetup.doneAction")}
                  </Button>
                </motion.div>
              ) : (
                <>
                  <p className="mb-4 text-sm font-medium text-foreground">
                    {t("dashboard.twoFactorSetup.chooseMethod")}
                  </p>

                  <div className="space-y-3">
                    <OptionCard
                      icon={Mail}
                      iconBg="bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                      title={t("dashboard.twoFactorSetup.emailTitle")}
                      description={t("dashboard.twoFactorSetup.emailDescription")}
                      badge={t("dashboard.twoFactorSetup.emailBadge")}
                      selected={choice === "email"}
                      onClick={() => setChoice("email")}
                    />
                    <OptionCard
                      icon={Smartphone}
                      iconBg="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400"
                      title={t("dashboard.twoFactorSetup.totpTitle")}
                      description={t("dashboard.twoFactorSetup.totpDescription")}
                      badge={t("dashboard.twoFactorSetup.totpBadge")}
                      selected={choice === "totp"}
                      onClick={() => setChoice("totp")}
                    />
                  </div>

                  {error && (
                    <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                      {error}
                    </p>
                  )}

                  <div className="mt-6 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      isDisabled={!choice || loading}
                      onPress={handleEnable}
                      className="w-full"
                    >
                      {loading
                        ? t("dashboard.twoFactorSetup.submitting")
                        : choice === "totp"
                          ? t("dashboard.twoFactorSetup.submitTotp")
                          : t("dashboard.twoFactorSetup.submitEmail")}
                    </Button>
                    <Button type="button" variant="ghost" onPress={dismiss} className="w-full">
                      {t("dashboard.twoFactorSetup.cancel")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
    </>
  );
}
