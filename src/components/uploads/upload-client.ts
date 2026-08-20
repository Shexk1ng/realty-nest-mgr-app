// Wysyła pliki do endpointu /api/upload i zwraca dane przesłanego obrazu lub dokumentu


export interface UploadedImage {
  url: string;
  publicId: string;
}

export interface UploadedDocument {
  publicId: string;
  url: string;
  resourceType: string;
  deliveryType: string;
  fileType: string;
  bytes: number;
  format: string | null;
  mimeType: string | null;
  originalName: string;
  name: string;
}

async function post(form: FormData): Promise<Record<string, unknown>> {
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((json.error as string) ?? "Nie udało się wysłać pliku. Spróbuj ponownie.");
  }
  return json;
}

export async function uploadImage(blob: Blob, folder: string, filename = "image.jpg"): Promise<UploadedImage> {
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("kind", "image");
  form.append("folder", folder);
  const json = await post(form);
  if (!json.url) throw new Error("Nie udało się wysłać pliku. Spróbuj ponownie.");
  return { url: json.url as string, publicId: json.publicId as string };
}

export async function uploadDocument(file: File, folder: string): Promise<UploadedDocument> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("kind", "document");
  form.append("folder", folder);
  const json = await post(form);
  if (!json.publicId) throw new Error("Nie udało się wysłać pliku. Spróbuj ponownie.");
  return json as unknown as UploadedDocument;
}
