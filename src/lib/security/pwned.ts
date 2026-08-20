// Sprawdza hasło w bazie wycieków metodą k-anonimowości, wysyłając tylko prefiks skrótu SHA-1

async function sha1Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function checkPasswordPwned(password: string): Promise<number> {
  if (!password) return 0;
  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const res = await fetch(`/api/security/pwned?prefix=${prefix}`);
  if (!res.ok) throw new Error("Breach check unavailable.");
  const body = await res.text();

  for (const line of body.split("\n")) {
    const [suf, count] = line.trim().split(":");
    if (suf?.toUpperCase() === suffix) return Number(count) || 0;
  }
  return 0;
}
