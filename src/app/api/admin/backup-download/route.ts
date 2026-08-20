// Wydaje administratorowi plik gotowej kopii zapasowej bazy, strumieniowany z magazynu

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/graphql/auth";
import { gqlAsUser, GraphQLRequestError, UnauthenticatedError } from "@/lib/graphql/server-fetch";
import { fetchAuthenticatedAsset, isCloudinaryConfigured } from "@/lib/cloudinary";

export const runtime = "nodejs";

const BACKUP_QUERY = `query BackupById($id: ID!) { getBackupById(id: $id) { publicId status shortId createdAt } }`;

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Backup storage is not configured." }, { status: 503 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing backup id." }, { status: 400 });
  }

  let backup: {
    publicId?: string | null;
    status?: string | null;
    shortId?: number | null;
    createdAt?: string | null;
  } | null;
  try {
    const data = await gqlAsUser<{ getBackupById: typeof backup }>(BACKUP_QUERY, { id });
    backup = data.getBackupById;
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (err instanceof GraphQLRequestError) {
      if (err.code === "UNAUTHENTICATED") return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      if (err.code === "FORBIDDEN") return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    console.error("[backup-download] GraphQL:", err);
    return NextResponse.json({ error: "Could not resolve the backup." }, { status: 502 });
  }

  if (!backup?.publicId) {
    return NextResponse.json({ error: "Backup not found." }, { status: 404 });
  }

  if (backup.status !== "COMPLETE") {
    return NextResponse.json({ error: "Kopia zapasowa jest nieukończona." }, { status: 409 });
  }

  let upstream: Response;
  try {
    upstream = await fetchAuthenticatedAsset(backup.publicId, {
      resourceType: "raw",
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(60_000)]),
    });
  } catch (err) {
    console.error("[backup-download] upstream:", err);
    return NextResponse.json({ error: "Nie udało się pobrać kopii." }, { status: 504 });
  }

  if (!upstream.ok) {
    console.error(`[backup-download] storage responded ${upstream.status}`);
    return NextResponse.json(
      { error: upstream.status === 404 ? "Backup not found." : "Nie udało się pobrać kopii." },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const stamp = (backup.createdAt ?? "").slice(0, 10) || "kopia";
  const filename = `backup-${backup.shortId ?? "?"}-${stamp}.json`;

  const headers = new Headers({
    "Content-Type": "application/json",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    Vary: "Cookie",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new Response(upstream.body, { status: 200, headers });
}
