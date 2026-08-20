// Zapytania, mutacje i typy GraphQL obsługujące kampanie marketingowe

import { gql } from "@apollo/client";

const FIELDS = `
  id shortId name channel status budget spent impressions clicks leads
  startDate endDate ownerId propertyId enquiryId enquiryName createdAt updatedAt
`;

export const GET_CAMPAIGNS = gql`
  query GetCampaigns($limit: Int, $offset: Int) {
    getCampaigns(limit: $limit, offset: $offset) {
      items { ${FIELDS} }
      totalCount
      hasMore
    }
  }
`;

export const ADD_CAMPAIGN = gql`
  mutation AddCampaign(
    $name: String!, $channel: String, $status: String, $budget: Float, $spent: Float,
    $impressions: Int, $clicks: Int, $leads: Int, $startDate: String!, $endDate: String,
    $propertyId: String, $enquiryId: String
  ) {
    addCampaign(
      name: $name, channel: $channel, status: $status, budget: $budget, spent: $spent,
      impressions: $impressions, clicks: $clicks, leads: $leads, startDate: $startDate, endDate: $endDate,
      propertyId: $propertyId, enquiryId: $enquiryId
    ) { ${FIELDS} }
  }
`;

export const UPDATE_CAMPAIGN = gql`
  mutation UpdateCampaign(
    $id: ID!, $name: String, $channel: String, $status: String, $budget: Float, $spent: Float,
    $impressions: Int, $clicks: Int, $leads: Int, $startDate: String, $endDate: String,
    $propertyId: String, $enquiryId: String
  ) {
    updateCampaign(
      id: $id, name: $name, channel: $channel, status: $status, budget: $budget, spent: $spent,
      impressions: $impressions, clicks: $clicks, leads: $leads, startDate: $startDate, endDate: $endDate,
      propertyId: $propertyId, enquiryId: $enquiryId
    ) { ${FIELDS} }
  }
`;

export const DELETE_CAMPAIGN = gql`
  mutation DeleteCampaign($id: ID!) { deleteCampaign(id: $id) }
`;

export interface Campaign {
  id: string;
  shortId: number;
  name: string;
  channel: string;
  status: string;
  budget?: number | null;
  spent?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  leads?: number | null;
  startDate: string;
  endDate?: string | null;
  ownerId?: string | null;
  propertyId?: string | null;
  enquiryId?: string | null;
  enquiryName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
