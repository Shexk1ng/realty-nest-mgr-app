// Dozwolone typy MIME, limity rozmiaru plików i reguły bezpiecznego podglądu w przeglądarce

export const DOC_MIME_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOCX",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLSX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-powerpoint": "OTHER",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "OTHER",
  "text/csv": "XLSX",
  "text/plain": "OTHER",
  "application/zip": "OTHER",
};

export const ALLOWED_MIME = new Set([
  ...Object.keys(DOC_MIME_TYPES),
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/json",
]);

export const INLINE_SAFE = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
]);

export const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
  zip: "application/zip",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_DOC_BYTES = 20 * 1024 * 1024;

export function canDisplayInline(
  mimeType?: string | null,
  fileName?: string | null,
): boolean {
  if (mimeType && ALLOWED_MIME.has(mimeType)) return INLINE_SAFE.has(mimeType);
  const ext = /\.([a-z0-9]{1,8})$/i.exec(fileName ?? "")?.[1]?.toLowerCase();
  const guessed = ext ? EXT_TO_MIME[ext] : undefined;
  return guessed ? INLINE_SAFE.has(guessed) : false;
}
