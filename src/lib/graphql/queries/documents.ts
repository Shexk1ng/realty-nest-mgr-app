// Zapytania, mutacje i typy GraphQL obsługujące dokumenty przypisane do rekordów

import { gql } from "@apollo/client";

const FIELDS = `
  id shortId name fileType category sizeBytes url publicId resourceType mimeType originalName format
  uploadedById uploadedByName propertyId propertyTitle expiresAt createdAt updatedAt
`;

export const GET_DOCUMENTS = gql`
  query GetDocuments($limit: Int, $offset: Int, $search: String) {
    getDocuments(limit: $limit, offset: $offset, search: $search) {
      items { ${FIELDS} }
      totalCount
      hasMore
    }
  }
`;

export const ADD_DOCUMENT = gql`
  mutation AddDocument(
    $name: String!, $fileType: String, $category: String,
    $sizeBytes: Float, $url: String, $publicId: String, $resourceType: String,
    $mimeType: String, $originalName: String, $format: String, $propertyId: String,
    $expiresAt: String
  ) {
    addDocument(
      name: $name, fileType: $fileType, category: $category,
      sizeBytes: $sizeBytes, url: $url, publicId: $publicId, resourceType: $resourceType,
      mimeType: $mimeType, originalName: $originalName, format: $format, propertyId: $propertyId,
      expiresAt: $expiresAt
    ) { ${FIELDS} }
  }
`;

export const UPDATE_DOCUMENT = gql`
  mutation UpdateDocument(
    $id: ID!, $name: String, $fileType: String, $category: String,
    $sizeBytes: Float, $url: String, $publicId: String, $resourceType: String,
    $mimeType: String, $originalName: String, $format: String, $propertyId: String
  ) {
    updateDocument(
      id: $id, name: $name, fileType: $fileType, category: $category,
      sizeBytes: $sizeBytes, url: $url, publicId: $publicId, resourceType: $resourceType,
      mimeType: $mimeType, originalName: $originalName, format: $format, propertyId: $propertyId
    ) { ${FIELDS} }
  }
`;

export const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: ID!) { deleteDocument(id: $id) }
`;

export interface Document {
  id: string;
  shortId: number;
  name: string;
  fileType: string;
  category: string;
  sizeBytes?: number | null;
  url?: string | null;
  publicId?: string | null;
  resourceType?: string | null;
  mimeType?: string | null;
  originalName?: string | null;
  format?: string | null;
  uploadedById?: string | null;
  uploadedByName?: string | null;
  propertyId?: string | null;
  propertyTitle?: string | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
