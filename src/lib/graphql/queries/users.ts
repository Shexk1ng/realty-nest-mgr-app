// Zapytania, mutacje i typy GraphQL obsługujące konta użytkowników i ich role

import { gql } from "@apollo/client";

const FIELDS = `
  id shortId email name role companyId assignedAgentId isActive deactivatedAt lastLoginAt createdAt
`;

export const GET_USERS = gql`
  query GetUsers($companyId: String, $limit: Int, $offset: Int) {
    getUsers(companyId: $companyId, limit: $limit, offset: $offset) {
      items { ${FIELDS} }
      totalCount
      hasMore
    }
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser(
    $email: String!
    $password: String!
    $name: String!
    $role: String!
    $assignedAgentId: String
  ) {
    createUser(
      email: $email
      password: $password
      name: $name
      role: $role
      assignedAgentId: $assignedAgentId
    ) { ${FIELDS} }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser(
    $id: ID!
    $name: String
    $role: String
    $isActive: Boolean
    $assignedAgentId: String
  ) {
    updateUser(
      id: $id
      name: $name
      role: $role
      isActive: $isActive
      assignedAgentId: $assignedAgentId
    ) { ${FIELDS} }
  }
`;

export interface User {
  id: string;
  shortId: number;
  email: string;
  name: string;
  role: string;
  companyId?: string | null;
  assignedAgentId?: string | null;
  isActive: boolean;
  deactivatedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
}
