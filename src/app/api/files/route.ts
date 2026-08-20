// Wydaje prywatne dokumenty z magazynu po sprawdzeniu sesji i uprawnień do konkretnego pliku

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/graphql/auth";
import { gqlAsUser, GraphQLRequestError, UnauthenticatedError } from "@/lib/graphql/server-fetch";
import {
  ALLOWED_MIME,
  EXT_TO_MIME,
  INLINE_SAFE,
  fetchAuthenticatedAsset,
  isCloudinaryConfigured,
  type ResourceType,
} from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 30_000;

interface DocRow {
  publicId?: string | null;
  resourceType?: string | null;
  mimeType?: string | null;
  originalName?: string | null;
  format?: string | null;
  name?: string | null;
}

const DOC_QUERY = `
  query FileById($id: ID!) {
    getDocumentById(id: $id) {
      publicId resourceType mimeType originalName format name
    }
  }
`;

const noStore = (extra: HeadersInit = {}) =>
  new Headers({ "Cache-Control": "private, no-store", Vary: "Cookie", ...extra });

const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status, headers: noStore() });

function resolveContentType(doc: DocRow): string {
  if (doc.mimeType && ALLOWED_MIME.has(doc.mimeType)) return doc.mimeType;
  const source = doc.originalName ?? doc.publicId ?? "";
  const ext = source.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? "application/octet-stream";
}

function contentDisposition(kind: "inline" | "attachment", raw: string): string {
  const clean = raw.replace(/[\r\n"\\]/g, "").replace(/[/\\]/g, "_").slice(0, 200) || "dokument";
  const ascii = clean.replace(/[^\x20-\x7e]/g, "_");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return fail(401, "Unauthorized.");
  if (!isCloudinaryConfigured()) return fail(503, "Uploads are not configured.");

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail(400, "Missing document id.");
  const wantsDownload = req.nextUrl.searchParams.get("download") === "1";

  let doc: DocRow | null;
  try {
    const data = await gqlAsUser<{ getDocumentById: DocRow | null }>(DOC_QUERY, { id });
    doc = data.getDocumentById;
  } catch (err) {
    if (err instanceof UnauthenticatedError) return fail(401, "Unauthorized.");
    if (err instanceof GraphQLRequestError) {
      if (err.code === "UNAUTHENTICATED") return fail(401, "Unauthorized.");
      if (err.code === "FORBIDDEN") return fail(403, "Brak uprawnień do tego dokumentu.");
      if (err.code === "BAD_USER_INPUT") return fail(400, "Nieprawidłowy identyfikator.");
    }
    console.error("[files] GraphQL:", err);
    return fail(502, "Could not resolve the file.");
  }

  if (!doc?.publicId) return fail(404, "File not found.");

  const contentType = resolveContentType(doc);
  const disposition = wantsDownload || !INLINE_SAFE.has(contentType) ? "attachment" : "inline";
  const filename = doc.originalName ?? doc.name ?? "dokument";

  let upstream: Response;
  try {
    upstream = await fetchAuthenticatedAsset(doc.publicId, {
      resourceType: (doc.resourceType as ResourceType) ?? "raw",
      format: doc.format,
      range: req.headers.get("range"),
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]),
    });
  } catch (err) {
    console.error("[files] upstream:", err);
    return fail(504, "Nie udało się pobrać pliku.");
  }

  if (!upstream.ok && upstream.status !== 206) {
    console.error(`[files] storage responded ${upstream.status} for ${doc.publicId}`);
    return upstream.status === 404
      ? fail(404, "File not found.")
      : fail(502, "Nie udało się pobrać pliku.");
  }

  const headers = noStore({
    "Content-Type": contentType,
    "Content-Disposition": contentDisposition(disposition, filename),
    "X-Content-Type-Options": "nosniff",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  if (upstream.headers.get("accept-ranges")) headers.set("Accept-Ranges", "bytes");
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);

  return new Response(upstream.body, {
    status: upstream.status === 206 ? 206 : 200,
    headers,
  });
}
