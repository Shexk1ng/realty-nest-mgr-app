// Zapytania, mutacje i typy GraphQL obsługujące kartotekę kontaktów

import { gql } from "@apollo/client";

const FIELDS = `
  id shortId name email phone role notes kind source ownerId consentGivenAt createdAt updatedAt
`;

export const GET_CONTACTS = gql`
  query GetContacts($limit: Int, $offset: Int, $search: String) {
    getContacts(limit: $limit, offset: $offset, search: $search) {
      items { ${FIELDS} }
      totalCount
      hasMore
    }
  }
`;

export const ADD_CONTACT = gql`
  mutation AddContact(
    $name: String!, $email: String, $phone: String, $role: String,
    $notes: String, $kind: String, $source: String, $ownerId: String,
    $consent: Boolean
  ) {
    addContact(
      name: $name, email: $email, phone: $phone, role: $role,
      notes: $notes, kind: $kind, source: $source, ownerId: $ownerId,
      consent: $consent
    ) { ${FIELDS} }
  }
`;

export const UPDATE_CONTACT = gql`
  mutation UpdateContact(
    $id: ID!, $name: String, $email: String, $phone: String, $role: String,
    $notes: String, $kind: String, $source: String, $ownerId: String,
    $consent: Boolean
  ) {
    updateContact(
      id: $id, name: $name, email: $email, phone: $phone, role: $role,
      notes: $notes, kind: $kind, source: $source, ownerId: $ownerId,
      consent: $consent
    ) { ${FIELDS} }
  }
`;

export const DELETE_CONTACT = gql`
  mutation DeleteContact($id: ID!) { deleteContact(id: $id) }
`;

export const EXPORT_CONTACT_DATA = gql`
  query ExportContactData($id: ID!) { exportContactData(id: $id) }
`;

export const HARD_DELETE_CONTACT = gql`
  mutation HardDeleteContact($id: ID!) { hardDeleteContact(id: $id) }
`;

export interface Contact {
  id: string;
  shortId: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  notes?: string | null;
  kind: string;
  source?: string | null;
  ownerId?: string | null;
  consentGivenAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
