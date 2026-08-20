// Zapytania, mutacje i typy GraphQL obsługujące szanse sprzedaży w lejku

import { gql } from "@apollo/client";

const FIELDS = `
  id shortId title stage source estValue agentId contactId propertyId enquiryId createdAt updatedAt
  contactName contactEmail contactPhone propertyTitle propertyLocation agentName enquiryName
`;

export const GET_LEADS = gql`
  query GetLeads($limit: Int, $offset: Int) {
    getLeads(limit: $limit, offset: $offset) {
      items { ${FIELDS} }
      totalCount
      hasMore
    }
  }
`;

export const ADD_LEAD = gql`
  mutation AddLead(
    $title: String!, $stage: String, $source: String, $estValue: Float,
    $agentId: String, $contactId: String, $propertyId: String, $enquiryId: String
  ) {
    addLead(
      title: $title, stage: $stage, source: $source, estValue: $estValue,
      agentId: $agentId, contactId: $contactId, propertyId: $propertyId, enquiryId: $enquiryId
    ) { ${FIELDS} }
  }
`;

export const UPDATE_LEAD = gql`
  mutation UpdateLead(
    $id: ID!, $title: String, $stage: String, $source: String, $estValue: Float,
    $agentId: String, $contactId: String, $propertyId: String, $enquiryId: String
  ) {
    updateLead(
      id: $id, title: $title, stage: $stage, source: $source, estValue: $estValue,
      agentId: $agentId, contactId: $contactId, propertyId: $propertyId, enquiryId: $enquiryId
    ) { ${FIELDS} }
  }
`;

export const DELETE_LEAD = gql`
  mutation DeleteLead($id: ID!) { deleteLead(id: $id) }
`;

export interface PipelineLead {
  id: string;
  shortId: number;
  title: string;
  stage: string;
  source?: string | null;
  estValue?: number | null;
  agentId?: string | null;
  contactId?: string | null;
  propertyId?: string | null;
  enquiryId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  propertyTitle?: string | null;
  propertyLocation?: string | null;
  agentName?: string | null;
  enquiryName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
