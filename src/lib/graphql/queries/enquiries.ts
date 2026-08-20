// Zapytania, mutacje i typy GraphQL obsługujące zapytania napływające od klientów

import { gql } from "@apollo/client";

const FIELDS = `
  id shortId name email phone propertyInterest location budget note
  source priority status agentId propertyId createdAt updatedAt
`;

export const GET_ENQUIRIES = gql`
  query GetEnquiries($limit: Int, $offset: Int, $search: String) {
    getEnquiries(limit: $limit, offset: $offset, search: $search) {
      items { ${FIELDS} }
      totalCount
      hasMore
    }
  }
`;

export const ADD_ENQUIRY = gql`
  mutation AddEnquiry(
    $name: String!, $email: String, $phone: String, $propertyInterest: String,
    $location: String, $budget: Float, $note: String, $source: String,
    $priority: String, $status: String, $agentId: String, $propertyId: String
  ) {
    addEnquiry(
      name: $name, email: $email, phone: $phone, propertyInterest: $propertyInterest,
      location: $location, budget: $budget, note: $note, source: $source,
      priority: $priority, status: $status, agentId: $agentId, propertyId: $propertyId
    ) { ${FIELDS} }
  }
`;

export const UPDATE_ENQUIRY = gql`
  mutation UpdateEnquiry(
    $id: ID!, $name: String, $email: String, $phone: String, $propertyInterest: String,
    $location: String, $budget: Float, $note: String, $source: String,
    $priority: String, $status: String, $agentId: String, $propertyId: String
  ) {
    updateEnquiry(
      id: $id, name: $name, email: $email, phone: $phone, propertyInterest: $propertyInterest,
      location: $location, budget: $budget, note: $note, source: $source,
      priority: $priority, status: $status, agentId: $agentId, propertyId: $propertyId
    ) { ${FIELDS} }
  }
`;

export const DELETE_ENQUIRY = gql`
  mutation DeleteEnquiry($id: ID!) { deleteEnquiry(id: $id) }
`;

export interface Enquiry {
  id: string;
  shortId: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  propertyInterest?: string | null;
  location?: string | null;
  budget?: number | null;
  note?: string | null;
  source: string;
  priority: string;
  status: string;
  agentId?: string | null;
  propertyId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
