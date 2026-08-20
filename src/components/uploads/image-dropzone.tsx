"use client";

// Obszar przeciągnij-i-upuść do wysyłki wielu zdjęć naraz, ze zmniejszaniem przed przesłaniem

import { useRef, useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { downscaleImage } from "@/components/uploads/downscale";
import { uploadImage } from "@/components/uploads/upload-client";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;

export function ImageDropzone({
  folder,
  onUploaded,
  disabled,
  label = "Drag photos here, or click to choose",
  hint = "JPG or PNG, up to 10 MB each.",
}: {
  folder: string;
  onUploaded: (url: string) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | File[] | null) {
    if (!files) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setError(null);

    for (const file of list) {
      if (!file.type.startsWith("image/")) {
        setError("Część plików pominięto — dozwolone są tylko obrazy.");
        continue;
      }
      if (file.size > MAX_INPUT_BYTES) {
        setError("Część plików pominięto — maksymalnie 10 MB każdy.");
        continue;
      }
      setBusy((n) => n + 1);
      try {
        const blob = await downscaleImage(file);
        const { url } = await uploadImage(blob, folder, file.name);
        onUploaded(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not upload an image.");
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled || busy > 0}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFiles(e.dataTransfer.files); }}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 6, width: "100%", padding: "20px 16px", borderRadius: 12, cursor: "pointer",
          border: `1.5px dashed ${dragOver ? "var(--accent)" : "var(--border-soft)"}`,
          background: dragOver ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "var(--surface-2, transparent)",
          color: "var(--text-soft, inherit)", transition: "border-color .15s, background .15s",
        }}
      >
        {busy > 0 ? (
          <><Loader2 className="animate-spin" size={20} /><span style={{ fontSize: 13 }}>Uploading {busy}…</span></>
        ) : (
          <><ImageUp size={20} /><span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span></>
        )}
        <span style={{ fontSize: 11, opacity: 0.7 }}>{hint}</span>
      </button>
      {error && <p className="text-[11px] text-danger" style={{ marginTop: 6 }}>{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
}
