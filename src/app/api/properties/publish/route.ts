// Publikuje lub wycofuje treść oferty i odświeża jej stronę publiczną w obu językach

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { gqlAsUser, UnauthenticatedError } from "@/lib/graphql/server-fetch";

export const runtime = "nodejs";

const PUBLISH_MUTATION = `mutation Publish($id: ID!) { publishPropertyContent(id: $id) { id contentApprovedAt } }`;
const UNPUBLISH_MUTATION = `mutation Unpublish($id: ID!) { unpublishPropertyContent(id: $id) { id contentApprovedAt } }`;

export async function POST(req: Request) {
  let body: { id?: string; action?: "publish" | "unpublish" };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { id, action } = body;
  if (!id || (action !== "publish" && action !== "unpublish")) {
    return NextResponse.json({ error: "Missing id or invalid action." }, { status: 400 });
  }

  try {
    const query = action === "publish" ? PUBLISH_MUTATION : UNPUBLISH_MUTATION;
    const data = await gqlAsUser<{ publishPropertyContent?: { contentApprovedAt: string | null }; unpublishPropertyContent?: { contentApprovedAt: string | null } }>(query, { id });

    for (const locale of ["pl", "en"]) revalidatePath(`/${locale}/listings/${id}`);

    const result = data.publishPropertyContent ?? data.unpublishPropertyContent;
    return NextResponse.json({ contentApprovedAt: result?.contentApprovedAt ?? null });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update publication status." },
      { status: 502 },
    );
  }
}
