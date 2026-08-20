// Pobiera plik po stronie przeglądarki, odczytując nazwę z nagłówka Content-Disposition

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
    }
  }
  return /filename="([^"]+)"/i.exec(header)?.[1] ?? null;
}

export async function downloadViaBlob(url: string, fallbackName: string): Promise<void> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Błąd ${res.status}`);
  }

  const name = filenameFromDisposition(res.headers.get("content-disposition")) ?? fallbackName;
  const objectUrl = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}
