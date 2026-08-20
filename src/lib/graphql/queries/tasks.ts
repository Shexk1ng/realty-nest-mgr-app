// Zapytania, mutacje i typy GraphQL obsługujące zadania użytkowników

import { gql } from "@apollo/client";

const FIELDS = `
  id shortId title description status priority dueAt completedAt
  relatedType propertyId contactId assigneeId createdAt updatedAt
`;

export const GET_TASKS = gql`
  query GetTasks($limit: Int, $offset: Int) {
    getTasks(limit: $limit, offset: $offset) {
      items { ${FIELDS} }
      totalCount
      hasMore
    }
  }
`;

export const ADD_TASK = gql`
  mutation AddTask(
    $title: String!, $description: String, $status: String, $priority: String,
    $dueAt: String, $assigneeId: String, $relatedType: String, $propertyId: String, $contactId: String
  ) {
    addTask(
      title: $title, description: $description, status: $status, priority: $priority,
      dueAt: $dueAt, assigneeId: $assigneeId, relatedType: $relatedType, propertyId: $propertyId, contactId: $contactId
    ) { ${FIELDS} }
  }
`;

export const UPDATE_TASK = gql`
  mutation UpdateTask(
    $id: ID!, $title: String, $description: String, $status: String, $priority: String,
    $dueAt: String, $assigneeId: String, $relatedType: String, $propertyId: String, $contactId: String
  ) {
    updateTask(
      id: $id, title: $title, description: $description, status: $status, priority: $priority,
      dueAt: $dueAt, assigneeId: $assigneeId, relatedType: $relatedType, propertyId: $propertyId, contactId: $contactId
    ) { ${FIELDS} }
  }
`;

export const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) { deleteTask(id: $id) }
`;

export interface Task {
  id: string;
  shortId: number;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueAt?: string | null;
  completedAt?: string | null;
  relatedType: string;
  propertyId?: string | null;
  contactId?: string | null;
  assigneeId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
