"use client";

// Zarządzanie członkami zespołu firmy, ich rolami i przypisaniem do agentów

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@apollo/client/react";
import { Users2 } from "lucide-react";
import { CrudResource, type Column, type Field } from "@/components/dashboard/crud-resource";
import {
  ROLE_COLORS,
  TeamMemberPreview,
  type AgentOption,
} from "@/components/dashboard/settings/team-member-preview";
import { CREATE_USER, GET_USERS, UPDATE_USER, type User } from "@/lib/graphql/queries/users";
import { StatusBadge } from "@/components/ui/status-badge";
import { fmtDateTime } from "@/lib/dashboard-format";
import { roleIs } from "@/lib/roles";
import { useI18n } from "@/i18n/i18n-context";

type Translate = (key: string) => string;
type Translate2 = (key: string, fallback: string) => string;
type Option = AgentOption;

const ROLE_VALUES = ["COMPANY_ADMIN", "MANAGER", "AGENT", "AGENT_ASSISTANT"];

function buildRoleOptions(t: Translate) {
  return ROLE_VALUES.map((value) => ({ value, label: t(`roles.${value}.label`) }));
}

function buildColumns(t: Translate): Column<User>[] {
  return [
    {
      key: "name",
      label: t("dashboard.settingsTeam.colName"),
      sortable: true,
      filter: "text",
      filterPlaceholder: t("dashboard.settingsTeam.searchName"),
      render: (r) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground">{r.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{r.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      label: t("dashboard.settingsTeam.colRole"),
      sortable: true,
      filter: "select",
      filterOptions: buildRoleOptions(t),
      render: (r) => <StatusBadge colorMap={ROLE_COLORS} value={r.role} />,
    },
    {
      key: "isActive",
      label: t("dashboard.settingsTeam.colStatus"),
      sortable: true,
      render: (r) => (
        <StatusBadge
          colorMap={{ true: "green", false: "red" }}
          value={String(r.isActive)}
          label={
            r.isActive
              ? t("dashboard.settingsTeam.statusActive")
              : t("dashboard.settingsTeam.statusInactive")
          }
        />
      ),
    },
    {
      key: "lastLoginAt",
      label: t("dashboard.settingsTeam.colLastLogin"),
      sortable: true,
      render: (r) => (r.lastLoginAt ? fmtDateTime(r.lastLoginAt) : t("dashboard.settingsTeam.never")),
    },
  ];
}

function buildFields(t: Translate, tf: Translate2, callerRole: string | undefined, agents: Option[]): Field[] {
  const leadAgent: Field = {
    name: "assignedAgentId",
    label: t("dashboard.settingsTeam.fieldLeadAgent"),
    type: "select",
    full: true,
    options: [{ value: "", label: t("dashboard.settingsTeam.leadAgentNone") }, ...agents],
    hint: t("dashboard.settingsTeam.hintLeadAgent"),
    visibleWhen: (values) => values.role === "AGENT_ASSISTANT",
  };

  if (roleIs.manager(callerRole)) return [leadAgent];

  const adminFields: Field[] = [
    { name: "name", label: t("dashboard.settingsTeam.colName"), type: "text", required: true },
    {
      name: "email",
      label: tf("dashboard.settingsTeam.fieldEmail", "E-mail"),
      type: "email",
      required: true,
      showOn: "new",
    },
    {
      name: "password",
      label: tf("dashboard.settingsTeam.fieldPassword", "Hasło"),
      type: "text",
      required: true,
      minLength: 8,
      showOn: "new",
      hint: tf("dashboard.settingsTeam.hintPassword", "Co najmniej 8 znaków."),
    },
    {
      name: "role",
      label: t("dashboard.settingsTeam.colRole"),
      type: "select",
      required: true,
      options: buildRoleOptions(t),
    },
    {
      name: "isActive",
      label: t("dashboard.settingsTeam.fieldActive"),
      type: "boolean",
      hint: t("dashboard.settingsTeam.hintActive"),
      showOn: "edit",
    },
  ];

  return roleIs.canManageUsers(callerRole) ? [...adminFields, leadAgent] : adminFields;
}

export function TeamCard() {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const { data: session } = useSession();
  const companyId = session?.user?.companyId ?? undefined;
  const callerRole = session?.user?.role;
  const mayAssignAgent = roleIs.canManageUsers(callerRole);

  const { data: agentData } = useQuery<{ getUsers: { items: User[] } }>(GET_USERS, {
    variables: companyId ? { companyId } : {},
    skip: !mayAssignAgent,
  });

  const agentOptions = useMemo<Option[]>(
    () =>
      (agentData?.getUsers.items ?? [])
        .filter((u) => u.role === "AGENT" && u.isActive)
        .map((u) => ({ value: u.id, label: u.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [agentData],
  );

  const fields = buildFields(t, tf, callerRole, agentOptions);

  return (
    <CrudResource<User>
      title={t("dashboard.settingsTeam.title")}
      description={t("dashboard.settingsTeam.description")}
      icon={Users2}
      query={GET_USERS}
      queryRoot="getUsers"
      createMutation={CREATE_USER}
      canCreate={(role) => roleIs.companyAdmin(role)}
      addLabel={tf("dashboard.settingsTeam.addLabel", "Dodaj osobę")}
      newTitle={tf("dashboard.settingsTeam.newTitle", "Nowe konto w zespole")}
      updateMutation={UPDATE_USER}
      columns={buildColumns(t)}
      fields={fields}
      defaults={{ role: "AGENT", isActive: true, assignedAgentId: "" }}
      toForm={(r) => ({
        name: r.name,
        role: r.role,
        isActive: r.isActive,
        assignedAgentId: r.assignedAgentId ?? "",
        email: r.email,
        shortId: r.shortId,
        lastLoginAt: r.lastLoginAt ?? "",
        createdAt: r.createdAt ?? "",
      })}
      preview={(values, mode) => (
        <TeamMemberPreview values={values} mode={mode} agents={agentOptions} />
      )}
      searchKeys={["name", "email"]}
      searchPlaceholder={t("dashboard.settingsTeam.search")}
      statusKey="role"
      statusOptions={ROLE_VALUES}
      emptyLabel={t("dashboard.settingsTeam.empty")}
      editTitle={tf("dashboard.settingsTeam.editTitle", "Edycja konta")}
      defaultSort={{ key: "name", dir: "asc" }}
      queryVariables={companyId ? { companyId } : undefined}
    />
  );
}
