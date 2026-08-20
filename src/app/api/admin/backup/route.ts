// Zrzuca bazę na żądanie administratora, odkłada plik w magazynie i zapisuje wynik operacji

import { NextResponse } from "next/server";
import { auth } from "@/lib/graphql/auth";
import { gqlAsUser, UnauthenticatedError } from "@/lib/graphql/server-fetch";
import { getCloudinary, isCloudinaryConfigured, UPLOAD_FOLDER } from "@/lib/cloudinary";
import { backupRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const DUMP_QUERY = `query DumpDatabase { dumpDatabase }`;
const RECORD_MUTATION = `
  mutation RecordBackup($publicId: String, $sizeBytes: Int!, $collectionsCount: Int!, $docCount: Int!, $status: String, $errorMessage: String) {
    recordBackup(publicId: $publicId, sizeBytes: $sizeBytes, collectionsCount: $collectionsCount, docCount: $docCount, status: $status, errorMessage: $errorMessage) {
      id shortId status publicId sizeBytes collectionsCount docCount createdAt
    }
  }
`;

export async function POST(req: Request) {
  const rl = backupRateLimit(req, "backup");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many backup requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Backup storage is not configured. Set CLOUDINARY_* env vars." }, { status: 503 });
  }

  let dumpJson: string;
  try {
    const data = await gqlAsUser<{ dumpDatabase: string }>(DUMP_QUERY);
    dumpJson = data.dumpDatabase;
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not dump the database." }, { status: 502 });
  }

  const { collections } = JSON.parse(dumpJson) as { collections: Record<string, unknown[]> };
  const collectionsCount = Object.keys(collections).length;
  const docCount = Object.values(collections).reduce((sum, rows) => sum + rows.length, 0);
  const buffer = Buffer.from(dumpJson, "utf8");

  try {
    const dataUri = `data:application/json;base64,${buffer.toString("base64")}`;
    const result = await getCloudinary().uploader.upload(dataUri, {
      folder: `${UPLOAD_FOLDER}/backups`,
      resource_type: "raw",
      type: "authenticated",
      use_filename: true,
      filename_override: `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
      unique_filename: true,
    });

    const recorded = await gqlAsUser<{ recordBackup: unknown }>(RECORD_MUTATION, {
      publicId: result.public_id,
      sizeBytes: result.bytes,
      collectionsCount,
      docCount,
      status: "COMPLETE",
    });
    return NextResponse.json(recorded.recordBackup);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backup upload failed.";
    try {
      await gqlAsUser(RECORD_MUTATION, {
        publicId: null,
        sizeBytes: buffer.byteLength,
        collectionsCount,
        docCount,
        status: "FAILED",
        errorMessage: message,
      });
    } catch {
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
