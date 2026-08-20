// Zapytania i mutacje GraphQL do tworzenia, odtwarzania i usuwania kopii zapasowych bazy

import { gql } from "@apollo/client";

export const GET_BACKUPS = gql`
  query GetBackups {
    getBackups {
      id
      shortId
      status
      errorMessage
      sizeBytes
      collectionsCount
      docCount
      createdByName
      createdAt
    }
  }
`;

export interface Backup {
  id: string;
  shortId: number;
  status: "COMPLETE" | "FAILED";
  errorMessage?: string | null;
  sizeBytes: number;
  collectionsCount: number;
  docCount: number;
  createdByName?: string | null;
  createdAt?: string | null;
}
