// Przyjmuje przesyłany plik, sprawdza jego typ i rozmiar, po czym odkłada go w magazynie

import { NextResponse } from "next/server";
import { auth } from "@/lib/graphql/auth";
import {
  getCloudinary,
  isCloudinaryConfigured,
  safeFolder,
  type DeliveryType,
  type ResourceType,
} from "@/lib/cloudinary";
import { DOC_MIME_TYPES, MAX_DOC_BYTES, MAX_IMAGE_BYTES } from "@/lib/file-types";
import { uploadRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rl = uploadRateLimit(req, "upload");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Uploads are not configured. Set CLOUDINARY_* env vars." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const kind = form.get("kind") === "document" ? "document" : "image";

  let resourceType: ResourceType;
  let deliveryType: DeliveryType;
  let fileType = "OTHER";

  if (kind === "image") {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 10 MB)." }, { status: 400 });
    }
    resourceType = "image";
    deliveryType = "upload";
    fileType = "IMG";
  } else {
    const mapped = DOC_MIME_TYPES[file.type];
    if (!mapped) {
      return NextResponse.json(
        { error: "Unsupported file type. Allowed: PDF, Word, Excel, PowerPoint, CSV, TXT, ZIP." },
        { status: 400 },
      );
    }
    if (file.size > MAX_DOC_BYTES) {
      return NextResponse.json({ error: "File is too large (max 20 MB)." }, { status: 400 });
    }
    resourceType = "raw";
    deliveryType = "authenticated";
    fileType = mapped;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;

  try {
    const result = await getCloudinary().uploader.upload(dataUri, {
      folder: safeFolder(form.get("folder") as string | null),
      resource_type: resourceType,
      type: deliveryType,
      use_filename: kind === "document",
      unique_filename: true,
    });

    if (kind === "image") {
      return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
    }
    return NextResponse.json({
      publicId: result.public_id,
      url: result.secure_url,
      resourceType,
      deliveryType,
      fileType,
      bytes: result.bytes,
      format: result.format ?? null,
      mimeType: file.type || null,
      originalName: file.name,
      name: file.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cloudinary upload failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
