"use client";

// Wysyłka pojedynczego zdjęcia z podglądem, zmniejszaniem po stronie klienta i usuwaniem

import { useRef, useState } from "react";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { Button, Label } from "@heroui/react";
import { downscaleImage } from "@/components/uploads/downscale";
import { uploadImage } from "@/components/uploads/upload-client";
import { useI18n } from "@/i18n/i18n-context";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;

type Variant = "portrait" | "logo" | "cover";

const PRESETS: Record<Variant, { w: number; h: number; maxEdge: number; radius: number; hintKey: string; hint: string }> = {
  portrait: { w: 132, h: 168, maxEdge: 1024, radius: 14, hintKey: "common.crud.uploadHintPortrait", hint: "Portret, JPG lub PNG (maks. 10 MB)." },
  logo: { w: 132, h: 132, maxEdge: 512, radius: 14, hintKey: "common.crud.uploadHintLogo", hint: "Najlepiej kwadratowe logo (maks. 10 MB)." },
  cover: { w: "100%" as unknown as number, h: 150, maxEdge: 1920, radius: 14, hintKey: "common.crud.uploadHintCover", hint: "Szeroki baner (maks. 10 MB)." },
};

export function SingleImageUploader({
  value,
  onChange,
  folder,
  variant = "portrait",
  disabled,
  label,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  variant?: Variant;
  disabled?: boolean;
  label?: string;
}) {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const resolved = t(key);
    return resolved === key ? fallback : resolved;
  };
  const preset = PRESETS[variant];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) { setError(tf("common.crud.pickImageFile", "Wybierz plik graficzny.")); return; }
    if (file.size > MAX_INPUT_BYTES) { setError(tf("common.crud.imageTooLarge", "Zdjęcie jest za duże (maks. 10 MB).")); return; }
    setBusy(true);
    try {
      const blob = await downscaleImage(file, { maxEdge: preset.maxEdge, quality: 0.85 });
      const { url } = await uploadImage(blob, folder, file.name);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload the image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      {label && <Label className="mb-1.5 block">{label}</Label>}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFile(e.dataTransfer.files?.[0]); }}
          aria-label={value ? tf("common.crud.changeImage", "Zmień zdjęcie") : tf("common.crud.uploadImage", "Wgraj zdjęcie")}
          style={{
            position: "relative", width: preset.w, height: preset.h, flex: variant === "cover" ? "1 1 240px" : "0 0 auto",
            borderRadius: preset.radius, cursor: "pointer", overflow: "hidden", padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexDirection: "column",
            border: `1.5px dashed ${dragOver ? "var(--accent)" : "var(--border-soft)"}`,
            background: value ? "var(--surface-2, #0001)" : (dragOver ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent"),
            color: "var(--text-soft, inherit)", transition: "border-color .15s, background .15s",
          }}
        >
          {value && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: variant === "logo" ? "contain" : "cover" }} />
          )}
          {busy ? (
            <Loader2 className="animate-spin" size={20} style={{ position: "relative" }} />
          ) : !value ? (
            <><ImageUp size={20} /><span style={{ fontSize: 11 }}>{tf("common.crud.dropFileShort", "Upuść plik lub kliknij")}</span></>
          ) : null}
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" size="sm" isDisabled={disabled || busy} onPress={() => inputRef.current?.click()}>
              {value ? tf("common.crud.change", "Zmień") : tf("common.crud.upload", "Wgraj")}
            </Button>
            {value && (
              <Button
                variant="ghost"
                size="sm"
                isDisabled={disabled || busy}
                onPress={() => { setError(null); onChange(null); }}
              >
                <Trash2 className="h-3.5 w-3.5" /> {tf("common.crud.remove", "Usuń")}
              </Button>
            )}
          </div>
          <span style={{ fontSize: 11, opacity: 0.7, maxWidth: 220 }}>{tf(preset.hintKey, preset.hint)}</span>
          {error && <span className="text-[11px] text-danger">{error}</span>}
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFile(e.target.files?.[0])} />
    </div>
  );
}
