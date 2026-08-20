"use client";

// Podgląd członka zespołu z jego rolą i przypisanym agentem prowadzącym

import {
  CalendarPlus,
  KeyRound,
  LogIn,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { fmtDate, fmtDateTime, type BadgeColor } from "@/lib/dashboard-format";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

const DASH = "—";

export const ROLE_COLORS: Record<string, BadgeColor> = {
  COMPANY_ADMIN: "violet",
  MANAGER: "blue",
  AGENT: "green",
  AGENT_ASSISTANT: "slate",
};

export interface AgentOption {
  value: string;
  label: string;
}

function str(raw: unknown): string {
  if (raw == null) return "";
  return typeof raw === "string" ? raw.trim() : String(raw).trim();
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-b-0">
      <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-text-3">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </span>
      <span className="min-w-0 break-words text-right text-sm text-foreground">{value}</span>
    </div>
  );
}

export function TeamMemberPreview({
  values,
  mode,
  agents,
}: {
  values: Record<string, unknown>;
  mode: "new" | "edit";
  agents: AgentOption[];
}) {
  const { t } = useI18n();

  const name = str(values.name);
  const role = str(values.role);
  const isActive = Boolean(values.isActive);
  const assignedAgentId = str(values.assignedAgentId);
  const email = str(values.email);
  const shortId = str(values.shortId);
  const lastLoginAt = str(values.lastLoginAt);
  const createdAt = str(values.createdAt);

  const isAssistant = role === "AGENT_ASSISTANT";
  const leadAgent = agents.find((a) => a.value === assignedAgentId);
  const leadAgentMissing = isAssistant && !assignedAgentId;

  const dict = (key: string): string => {
    const out = t(key);
    return out === key ? "" : out;
  };
  const roleLabel = role ? dict(`roles.${role}.label`) : "";
  const roleDesc = role ? dict(`roles.${role}.description`) : "";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary/25 to-primary/5 text-sm font-semibold text-primary ring-1 ring-primary/20">
          {initialsOf(name) || <UserRound className="h-5 w-5" aria-hidden />}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <h3
            className={cn(
              "break-words font-display text-lg font-semibold leading-tight",
              name ? "text-foreground" : "text-text-3",
            )}
          >
            {name || t("dashboard.settingsTeam.previewNoName")}
          </h3>
          <p className="break-all text-[11px] text-text-3">{email || DASH}</p>
        </div>

        {mode === "edit" && shortId ? (
          <span className="shrink-0 font-mono text-[11px] text-text-3">#{shortId}</span>
        ) : null}
      </div>

      {mode === "new" && !name ? (
        <p className="text-xs leading-relaxed text-text-3">
          {t("dashboard.settingsTeam.previewNewHint")}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge colorMap={ROLE_COLORS} value={role || null} label={roleLabel || undefined} />
        <StatusBadge
          colorMap={{ true: "green", false: "red" }}
          value={String(isActive)}
          label={
            isActive
              ? t("dashboard.settingsTeam.statusActive")
              : t("dashboard.settingsTeam.statusInactive")
          }
        />
      </div>

      <section className="rounded-xl border border-border bg-surface p-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">
          <KeyRound className="h-3.5 w-3.5" aria-hidden />
          {t("dashboard.settingsTeam.previewSectionRole")}
        </p>
        <p className={cn("text-sm leading-relaxed", roleDesc ? "text-text-2" : "text-text-3")}>
          {roleDesc || t("dashboard.settingsTeam.previewRoleUnknown")}
        </p>
      </section>

      <section
        className={cn(
          "flex items-start gap-2.5 rounded-xl border p-3",
          isActive ? "border-success/40 bg-success-soft" : "border-danger",
        )}
        style={isActive ? undefined : { background: "var(--danger-soft)" }}
      >
        {isActive ? (
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        ) : (
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
        )}
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            {isActive
              ? t("dashboard.settingsTeam.previewAccessOpen")
              : t("dashboard.settingsTeam.previewAccessBlocked")}
          </p>
          <p className="text-[11px] leading-relaxed text-text-3">
            {isActive
              ? t("dashboard.settingsTeam.previewAccessOpenHint")
              : t("dashboard.settingsTeam.previewAccessBlockedHint")}
          </p>
        </div>
      </section>

      {isAssistant && (
        <section
          className={cn(
            "flex items-start gap-2.5 rounded-xl border p-3",
            leadAgentMissing ? "border-danger" : "border-border bg-surface",
          )}
          style={leadAgentMissing ? { background: "var(--danger-soft)" } : undefined}
        >
          <UsersRound
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              leadAgentMissing ? "text-danger" : "text-text-3",
            )}
            aria-hidden
          />
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-3">
              {t("dashboard.settingsTeam.fieldLeadAgent")}
            </p>
            <p
              className={cn(
                "break-words text-sm font-semibold",
                leadAgentMissing ? "text-danger" : "text-foreground",
              )}
            >
              {leadAgentMissing
                ? t("dashboard.settingsTeam.leadAgentNone")
                : (leadAgent?.label ?? assignedAgentId)}
            </p>
            <p
              className={cn(
                "text-[11px] leading-relaxed",
                leadAgentMissing ? "text-danger" : "text-text-3",
              )}
            >
              {leadAgentMissing
                ? t("dashboard.settingsTeam.previewLeadMissingHint")
                : t("dashboard.settingsTeam.previewLeadHint")}
            </p>
          </div>
        </section>
      )}

      {mode === "edit" && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-3">
            {t("dashboard.settingsTeam.previewSectionHistory")}
          </p>
          <MetaRow
            icon={LogIn}
            label={t("dashboard.settingsTeam.colLastLogin")}
            value={lastLoginAt ? fmtDateTime(lastLoginAt) : t("dashboard.settingsTeam.never")}
          />
          <MetaRow
            icon={CalendarPlus}
            label={t("dashboard.settingsTeam.previewCreated")}
            value={createdAt ? fmtDate(createdAt) : DASH}
          />
        </div>
      )}
    </div>
  );
}
