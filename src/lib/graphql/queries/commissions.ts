// Zapytania, mutacje i typy GraphQL obsługujące prowizje agentów wraz z ich podsumowaniem

import { gql } from "@apollo/client";

const FIELDS = `
  id shortId salePrice rate amount status dealDate paidDate clientName
  agentId propertyId invoiceNumber createdAt updatedAt
  propertyTitle propertyLocation agentName
`;

export const GET_COMMISSIONS = gql`
  query GetCommissions($limit: Int, $offset: Int) {
    getCommissions(limit: $limit, offset: $offset) {
      items { ${FIELDS} }
      totalCount
      hasMore
    }
  }
`;

export const GET_COMMISSION_SUMMARY = gql`
  query GetCommissionSummary {
    getCommissionSummary {
      count
      totalSalePrice
      totalAmount
      paidAmount
      pendingAmount
      processingAmount
      disputedAmount
    }
  }
`;

export interface CommissionSummary {
  count: number;
  totalSalePrice: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  processingAmount: number;
  disputedAmount: number;
}

export const ADD_COMMISSION = gql`
  mutation AddCommission(
    $salePrice: Float!, $rate: Float!, $status: String, $dealDate: String!,
    $paidDate: String, $clientName: String, $agentId: String, $propertyId: String
  ) {
    addCommission(
      salePrice: $salePrice, rate: $rate, status: $status, dealDate: $dealDate,
      paidDate: $paidDate, clientName: $clientName, agentId: $agentId, propertyId: $propertyId
    ) { ${FIELDS} }
  }
`;

export const UPDATE_COMMISSION = gql`
  mutation UpdateCommission(
    $id: ID!, $salePrice: Float, $rate: Float, $status: String, $dealDate: String,
    $paidDate: String, $clientName: String, $agentId: String, $propertyId: String
  ) {
    updateCommission(
      id: $id, salePrice: $salePrice, rate: $rate, status: $status, dealDate: $dealDate,
      paidDate: $paidDate, clientName: $clientName, agentId: $agentId, propertyId: $propertyId
    ) { ${FIELDS} }
  }
`;

export const DELETE_COMMISSION = gql`
  mutation DeleteCommission($id: ID!) { deleteCommission(id: $id) }
`;

export interface Commission {
  id: string;
  shortId: number;
  salePrice: number;
  rate: number;
  amount: number;
  status: string;
  dealDate: string;
  paidDate?: string | null;
  clientName?: string | null;
  agentId?: string | null;
  propertyId?: string | null;
  invoiceNumber?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  propertyTitle?: string | null;
  propertyLocation?: string | null;
  agentName?: string | null;
}
