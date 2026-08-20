// Wykonuje zapytania GraphQL po stronie serwera z tokenem sesji, z pominięciem proxy z DLP

import { auth } from "@/lib/graphql/auth";

const ENDPOINT = process.env.GRAPHQL_INTERNAL_URL ?? "http://localhost:4000/graphql";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Not signed in.");
    this.name = "UnauthenticatedError";
  }
}

export class GraphQLRequestError extends Error {
  readonly code: string | null;
  constructor(message: string, code: string | null) {
    super(message);
    this.name = "GraphQLRequestError";
    this.code = code;
  }
}

export async function getAccessToken(): Promise<string> {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (!token) throw new UnauthenticatedError();
  return token;
}

export async function gqlAsUser<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<T> {
  const accessToken = token ?? (await getAccessToken());
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as {
    data?: T;
    errors?: { message: string; extensions?: { code?: string } }[];
  };
  if (json.errors?.length) {
    const first = json.errors[0]!;
    throw new GraphQLRequestError(first.message, first.extensions?.code ?? null);
  }
  if (!json.data) throw new Error("Empty response from the API.");
  return json.data;
}
