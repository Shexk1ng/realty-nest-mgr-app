// Zapytania, mutacje i typy GraphQL obsługujące transakcje wraz z ich listą kontrolną

import { gql } from "@apollo/client";

const FIELDS = `
  id shortId kind status price currency deposit signedAt closedAt
  buyerName sellerName propertyId agentId notes createdAt updatedAt
  propertyTitle propertyLocation contactName agentName
  checklist { key label done completedAt }
`;

export const GET_TRANSACTIONS = gql`
  query GetTransactions($limit: Int, $offset: Int) {
    getTransactions(limit: $limit, offset: $offset) {
      items { ${FIELDS} }
      totalCount
      hasMore
    }
  }
`;

export const ADD_TRANSACTION = gql`
  mutation AddTransaction(
    $kind: String, $status: String, $price: Float!, $currency: String, $deposit: Float,
    $signedAt: String, $closedAt: String, $buyerName: String, $sellerName: String,
    $propertyId: String!, $notes: String, $checklist: [TransactionChecklistItemInput!]
  ) {
    addTransaction(
      kind: $kind, status: $status, price: $price, currency: $currency, deposit: $deposit,
      signedAt: $signedAt, closedAt: $closedAt, buyerName: $buyerName, sellerName: $sellerName,
      propertyId: $propertyId, notes: $notes, checklist: $checklist
    ) { ${FIELDS} }
  }
`;

export const UPDATE_TRANSACTION = gql`
  mutation UpdateTransaction(
    $id: ID!, $kind: String, $status: String, $price: Float, $currency: String, $deposit: Float,
    $signedAt: String, $closedAt: String, $buyerName: String, $sellerName: String, $notes: String,
    $checklist: [TransactionChecklistItemInput!]
  ) {
    updateTransaction(
      id: $id, kind: $kind, status: $status, price: $price, currency: $currency, deposit: $deposit,
      signedAt: $signedAt, closedAt: $closedAt, buyerName: $buyerName, sellerName: $sellerName, notes: $notes,
      checklist: $checklist
    ) { ${FIELDS} }
  }
`;

export const DELETE_TRANSACTION = gql`
  mutation DeleteTransaction($id: ID!) { deleteTransaction(id: $id) }
`;

export interface TransactionChecklistItem {
  key: string;
  label: string;
  done: boolean;
  completedAt?: string | null;
}

export interface Transaction {
  id: string;
  shortId: number;
  kind: string;
  status: string;
  price: number;
  currency: string;
  deposit: number;
  signedAt?: string | null;
  closedAt?: string | null;
  buyerName?: string | null;
  sellerName?: string | null;
  propertyId: string;
  agentId?: string | null;
  notes?: string | null;
  checklist?: TransactionChecklistItem[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  propertyTitle?: string | null;
  propertyLocation?: string | null;
  contactName?: string | null;
  agentName?: string | null;
}
