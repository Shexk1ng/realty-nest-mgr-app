// Wyznacza inicjały i deterministyczny gradient tła zastępujący brakujące zdjęcie profilowe

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, oklch(0.72 0.14 305), oklch(0.62 0.12 305))",
  "linear-gradient(135deg, oklch(0.78 0.14 155), oklch(0.65 0.13 155))",
  "linear-gradient(135deg, oklch(0.78 0.14 70),  oklch(0.65 0.13 70))",
  "linear-gradient(135deg, oklch(0.74 0.11 245), oklch(0.62 0.12 245))",
  "linear-gradient(135deg, oklch(0.74 0.14 25),  oklch(0.62 0.14 25))",
  "linear-gradient(135deg, oklch(0.78 0.12 195), oklch(0.62 0.12 195))",
];

export function avatarGradient(seed: string): string {
  const key = seed?.trim() || "?";
  return AVATAR_GRADIENTS[key.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

export function initials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
