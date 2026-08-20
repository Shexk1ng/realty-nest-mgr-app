// Konfiguracja Cloudinary, podpisane adresy dostawy i pobieranie plików z magazynu prywatnego

import { v2 as cloudinary } from "cloudinary";

export type ResourceType = "image" | "raw" | "video";
export type DeliveryType = "upload" | "authenticated";

export const UPLOAD_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER ?? "realty-nest";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

let configured = false;

export function getCloudinary() {
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export function signedDeliveryUrl(
  publicId: string,
  opts: { resourceType?: ResourceType; format?: string | null } = {},
): string {
  const { resourceType = "raw", format = null } = opts;
  const hasExtension = /\.[a-z0-9]{1,8}$/i.test(publicId);

  return getCloudinary().url(publicId, {
    resource_type: resourceType,
    type: "authenticated",
    sign_url: true,
    secure: true,
    force_version: false,
    analytics: false,
    ...(format && !hasExtension ? { format } : {}),
  });
}

export async function fetchAuthenticatedAsset(
  publicId: string,
  opts: {
    resourceType?: ResourceType;
    format?: string | null;
    range?: string | null;
    signal?: AbortSignal;
  } = {},
): Promise<Response> {
  const headers = opts.range ? { Range: opts.range } : undefined;
  const init = { cache: "no-store" as const, headers, signal: opts.signal };

  const delivered = await fetch(signedDeliveryUrl(publicId, opts), init);
  if (delivered.status !== 401 && delivered.status !== 403) return delivered;

  await delivered.body?.cancel();
  const cloud = getCloudinary();
  const download = cloud.utils.private_download_url(publicId, opts.format ?? "", {
    resource_type: opts.resourceType ?? "raw",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
  return fetch(download, init);
}

export {
  DOC_MIME_TYPES,
  ALLOWED_MIME,
  INLINE_SAFE,
  EXT_TO_MIME,
  MAX_IMAGE_BYTES,
  MAX_DOC_BYTES,
} from "./file-types";

export function safeFolder(sub?: string | null): string {
  const cleaned = (sub ?? "").replace(/[^a-z0-9/_-]/gi, "");
  return cleaned ? `${UPLOAD_FOLDER}/${cleaned}` : UPLOAD_FOLDER;
}
