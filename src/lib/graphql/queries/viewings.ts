// Zapytania, mutacje i typy GraphQL obsługujące prezentacje nieruchomości

import { gql } from "@apollo/client";

const FIELDS = `
  id shortId scheduledAt durationMin status outcome rating feedback followUpAt
  propertyId contactId agentId createdAt updatedAt
  propertyTitle propertyLocation propertyImageUrl
  contactName contactEmail contactPhone agentName agentAvatarUrl
`;

export const GET_VIEWINGS = gql`
  query GetViewings($limit: Int, $offset: Int) {
    getViewings(limit: $limit, offset: $offset) {
      items { ${FIELDS} }
      totalCount
      hasMore
    }
  }
`;

export const ADD_VIEWING = gql`
  mutation AddViewing(
    $scheduledAt: String!, $durationMin: Int, $status: String, $outcome: String,
    $rating: Int, $feedback: String, $followUpAt: String,
    $propertyId: String!, $contactId: String
  ) {
    addViewing(
      scheduledAt: $scheduledAt, durationMin: $durationMin, status: $status, outcome: $outcome,
      rating: $rating, feedback: $feedback, followUpAt: $followUpAt,
      propertyId: $propertyId, contactId: $contactId
    ) { ${FIELDS} }
  }
`;

export const UPDATE_VIEWING = gql`
  mutation UpdateViewing(
    $id: ID!, $scheduledAt: String, $durationMin: Int, $status: String, $outcome: String,
    $rating: Int, $feedback: String, $followUpAt: String, $propertyId: String, $contactId: String
  ) {
    updateViewing(
      id: $id, scheduledAt: $scheduledAt, durationMin: $durationMin, status: $status, outcome: $outcome,
      rating: $rating, feedback: $feedback, followUpAt: $followUpAt, propertyId: $propertyId,
      contactId: $contactId
    ) { ${FIELDS} }
  }
`;

export const DELETE_VIEWING = gql`
  mutation DeleteViewing($id: ID!) { deleteViewing(id: $id) }
`;

export interface Viewing {
  id: string;
  shortId: number;
  scheduledAt: string;
  durationMin: number;
  status: string;
  outcome?: string | null;
  rating?: number | null;
  feedback?: string | null;
  followUpAt?: string | null;
  propertyId: string;
  contactId?: string | null;
  agentId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  propertyTitle?: string | null;
  propertyLocation?: string | null;
  propertyImageUrl?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  agentName?: string | null;
  agentAvatarUrl?: string | null;
}
