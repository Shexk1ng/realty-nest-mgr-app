"use client";

// Powiadomienie dla asystenta bez przypisanego agenta, ukrywane do końca sesji

import { useState } from "react";
import { useSession } from "next-auth/react";
import { UserRoundCog, X } from "lucide-react";
import { Button } from "@heroui/react";
import { roleIs } from "@/lib/roles";
import { useI18n } from "@/i18n/i18n-context";

const DISMISSED_KEY = "rn_assistant_unassigned_seen";

export function AssistantUnassignedNotice() {
  const { t } = useI18n();
  const { data: session, status } = useSession();

  const [dismissed, setDismissed] = useState(false);

  const alreadySeen =
    typeof window !== "undefined" && sessionStorage.getItem(DISMISSED_KEY) === "1";

  if (status !== "authenticated" || dismissed || alreadySeen) return null;
  if (!roleIs.assistant(session?.user?.role)) return null;
  if (session?.user?.assignedAgentId) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-2"
    >
      <div className="rounded-xl border border-accent-val/30 bg-surface p-4 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-val/12">
            <UserRoundCog className="h-4.5 w-4.5 text-accent-val" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {t("dashboard.assistantUnassigned.title")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("dashboard.assistantUnassigned.body")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("dashboard.assistantUnassigned.hint")}
            </p>
            <div className="mt-3">
              <Button size="sm" variant="primary" onPress={dismiss}>
                {t("dashboard.assistantUnassigned.dismiss")}
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("dashboard.assistantUnassigned.dismiss")}
            className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
