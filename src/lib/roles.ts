// Definicje ról i reguły uprawnień decydujące o dostępie do rekordów i akcji w pulpicie

export const ROLE_IDS = [
  "SYSTEM_ADMIN",
  "COMPANY_ADMIN",
  "MANAGER",
  "AGENT",
  "AGENT_ASSISTANT",
] as const;

export type Role = (typeof ROLE_IDS)[number];

export const ROLE_LABEL_EN: Record<Role, string> = {
  SYSTEM_ADMIN:    "System Admin",
  COMPANY_ADMIN:   "Company Admin",
  MANAGER:         "Manager",
  AGENT:           "Agent",
  AGENT_ASSISTANT: "Agent Assistant",
};

export const roleIs = {
  systemAdmin:      (r?: string | null): boolean => r === "SYSTEM_ADMIN",
  companyAdmin:     (r?: string | null): boolean => r === "COMPANY_ADMIN",
  manager:          (r?: string | null): boolean => r === "MANAGER",
  agent:            (r?: string | null): boolean => r === "AGENT",
  assistant:        (r?: string | null): boolean => r === "AGENT_ASSISTANT",

  adminLevel:       (r?: string | null): boolean =>
    r === "SYSTEM_ADMIN" || r === "COMPANY_ADMIN",

  teamLead:         (r?: string | null): boolean =>
    r === "COMPANY_ADMIN" || r === "MANAGER",

  companyStaff:     (r?: string | null): boolean =>
    r === "COMPANY_ADMIN" || r === "MANAGER" || r === "AGENT" || r === "AGENT_ASSISTANT",

  canManageUsers:   (r?: string | null): boolean =>
    r === "SYSTEM_ADMIN" || r === "COMPANY_ADMIN" || r === "MANAGER",

  canManageAllCompanies: (r?: string | null): boolean => r === "SYSTEM_ADMIN",

  canAssignPropertyAgent: (r?: string | null): boolean =>
    r === "SYSTEM_ADMIN" || r === "COMPANY_ADMIN" || r === "MANAGER",

  canDelete:        (r?: string | null): boolean =>
    r === "SYSTEM_ADMIN" || r === "COMPANY_ADMIN" || r === "MANAGER",

  canDeleteProperty: (r?: string | null): boolean =>
    r === "SYSTEM_ADMIN" || r === "COMPANY_ADMIN",
};

export interface RecordViewer {
  id?: string | null;
  role?: string | null;
  assignedAgentId?: string | null;
}

export function canManagePropShare(
  viewer: RecordViewer | null | undefined,
  property: { agentId?: string | null } | null | undefined,
): boolean {
  const role = viewer?.role;
  if (!role) return false;
  if (role === "SYSTEM_ADMIN" || role === "COMPANY_ADMIN" || role === "MANAGER") return true;

  const leadAgentId = property?.agentId;
  if (!leadAgentId) return false;
  if (role === "AGENT") return leadAgentId === viewer?.id;
  if (role === "AGENT_ASSISTANT") return Boolean(viewer?.assignedAgentId) && leadAgentId === viewer?.assignedAgentId;
  return false;
}

export const COMPANY_ASSIGNABLE_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "MANAGER",
  "AGENT",
  "AGENT_ASSISTANT",
];

export const ALL_ROLES: Role[] = [...ROLE_IDS];

export interface RoleOption {
  value: Role;
  label: string;
  description: string;
}

export function getRoleSelectOptions(
  messages: RoleMessages,
  only?: Role[],
  exclude?: Role[],
): RoleOption[] {
  const pool = only ?? ALL_ROLES;
  return pool
    .filter((r) => !exclude?.includes(r))
    .map((r) => ({
      value: r,
      label: messages[r]?.label ?? ROLE_LABEL_EN[r],
      description: messages[r]?.description ?? "",
    }));
}

export interface RoleMessages {
  SYSTEM_ADMIN:    { label: string; description: string };
  COMPANY_ADMIN:   { label: string; description: string };
  MANAGER:         { label: string; description: string };
  AGENT:           { label: string; description: string };
  AGENT_ASSISTANT: { label: string; description: string };
}
