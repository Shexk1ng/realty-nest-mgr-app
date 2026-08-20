// Zapytania GraphQL o dziennik zdarzeń, statystyki i spójność łańcucha skrótów audytu

import { gql } from "@apollo/client";

const LOG_FIELDS = `
  id shortId seq type category messageKey messageParamsJson fallbackText
  actorId actorName actorRole targetType targetId companyId ipAddress
  hash prevHash chainedAt createdAt
`;

export const GET_AUDIT_LOGS = gql`
  query GetAuditLogs($category: String, $limit: Int, $offset: Int) {
    getAuditLogs(category: $category, limit: $limit, offset: $offset) { ${LOG_FIELDS} }
  }
`;

export const AUDIT_CHAIN_STATUS = gql`
  query AuditChainStatus {
    auditChainStatus { ok total brokenAtSeq reason checkedAt }
  }
`;

export const AUDIT_STATS = gql`
  query AuditStats {
    auditStats { key count }
  }
`;

export interface AuditLog {
  id: string;
  shortId: number | null;
  seq: number | null;
  type: string;
  category: string;
  messageKey: string;
  messageParamsJson: string | null;
  fallbackText: string | null;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  companyId: string | null;
  ipAddress: string | null;
  hash: string | null;
  prevHash: string | null;
  chainedAt: string | null;
  createdAt: string | null;
}

export interface AuditChainStatus {
  ok: boolean;
  total: number;
  brokenAtSeq: number | null;
  reason: string | null;
  checkedAt: string;
}

export interface AuditStat {
  key: string;
  count: number;
}
