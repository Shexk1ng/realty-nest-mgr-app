// Pobiera dane GraphQL bez uwierzytelnienia na potrzeby stron publicznych, z buforowaniem

const ENDPOINT = process.env.GRAPHQL_INTERNAL_URL ?? "http://localhost:4000/graphql";

export async function gqlPublic<T>(query: string, variables: Record<string, unknown> = {}): Promise<T | null> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 300 },
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length || !json.data) return null;
  return json.data;
}
