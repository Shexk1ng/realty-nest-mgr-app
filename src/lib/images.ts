// Rozpoznaje obrazy z danych startowych i sprawdza, czy adres pochodzi z dozwolonego hosta

const SEED_IMAGE_HOSTS = ["images.unsplash.com", "images.pexels.com", "i.pravatar.cc", "picsum.photos", "fastly.picsum.photos"];

export const ALLOWED_IMAGE_HOSTS = [
  "res.cloudinary.com",
  "ik.imagekit.io",
  ...SEED_IMAGE_HOSTS,
] as const;

export function isSeedImage(src: string | null | undefined): boolean {
  if (!src) return false;
  try {
    return SEED_IMAGE_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

export function isAllowedImageUrl(src: string | null | undefined): boolean {
  if (!src) return false;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && (ALLOWED_IMAGE_HOSTS as readonly string[]).includes(url.hostname);
  } catch {
    return false;
  }
}
