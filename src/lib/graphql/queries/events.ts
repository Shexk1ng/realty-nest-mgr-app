// Zapytania, mutacje i typy GraphQL obsługujące wydarzenia kalendarza

import { gql } from "@apollo/client";

const FIELDS = `
  id shortId title description startAt endAt location kind
  agentId propertyId contactId createdAt updatedAt
`;

export const GET_EVENTS = gql`
  query GetEvents($limit: Int, $offset: Int) {
    getEvents(limit: $limit, offset: $offset) {
      items { ${FIELDS} }
      totalCount
      hasMore
    }
  }
`;

export const ADD_EVENT = gql`
  mutation AddEvent(
    $title: String!, $description: String, $startAt: String!, $endAt: String!,
    $location: String, $kind: String, $agentId: String, $propertyId: String, $contactId: String
  ) {
    addEvent(
      title: $title, description: $description, startAt: $startAt, endAt: $endAt,
      location: $location, kind: $kind, agentId: $agentId, propertyId: $propertyId, contactId: $contactId
    ) { ${FIELDS} }
  }
`;

export const UPDATE_EVENT = gql`
  mutation UpdateEvent(
    $id: ID!, $title: String, $description: String, $startAt: String, $endAt: String,
    $location: String, $kind: String, $agentId: String, $propertyId: String, $contactId: String
  ) {
    updateEvent(
      id: $id, title: $title, description: $description, startAt: $startAt, endAt: $endAt,
      location: $location, kind: $kind, agentId: $agentId, propertyId: $propertyId, contactId: $contactId
    ) { ${FIELDS} }
  }
`;

export const DELETE_EVENT = gql`
  mutation DeleteEvent($id: ID!) { deleteEvent(id: $id) }
`;

export interface CalendarEvent {
  id: string;
  shortId: number;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  location?: string | null;
  kind: string;
  agentId?: string | null;
  propertyId?: string | null;
  contactId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
