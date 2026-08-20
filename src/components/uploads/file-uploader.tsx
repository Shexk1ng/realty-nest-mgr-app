"use client";

// Kontrolka wysyłki dokumentu z ograniczeniem dozwolonych typów i rozmiaru pliku

import { useRef, useState } from "react";
import { FileUp, Loader2, FileCheck2 } from "lucide-react";
import { uploadDocument, type UploadedDocument } from "@/components/uploads/upload-client";
import { DOC_MIME_TYPES, MAX_DOC_BYTES } from "@/lib/file-types";
import { useI18n } from "@/i18n/i18n-context";

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip";

export function FileUploader({
  folder,
  currentName,
  onUploaded,
  disabled,
  id,
  ariaLabelledBy,
  describedBy,
}: {
  folder: string;
  currentName?: string | null;
  onUploaded: (doc: UploadedDocument) => void;
  id?: string;
  ariaLabelledBy?: string;
  describedBy?: string;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneName, setDoneName] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!DOC_MIME_TYPES[file.type]) {
      setError(
        tf(
          "common.crud.uploadTypeRejected",
          "Nieobsługiwany format pliku. Dozwolone: PDF, Word, Excel, PowerPoint, CSV, TXT, ZIP.",
        ),
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      setError(
        tf("common.crud.uploadTooLarge", "Plik jest za duży — maksymalnie 20 MB."),
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setBusy(true);
    try {
      const doc = await uploadDocument(file, folder);
      setDoneName(doc.name);
      onUploaded(doc);
    } catch (err) {
      setDoneName(null);
      setError(err instanceof Error ? err.message : tf("common.crud.uploadError", "Nie udało się wysłać pliku."));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const shownName = doneName ?? currentName ?? null;

  return (
    <div id={id}>
      <button
        type="button"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={describedBy}
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFile(e.dataTransfer.files?.[0]); }}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px",
          borderRadius: 10, cursor: "pointer", textAlign: "left",
          border: `1.5px dashed ${dragOver ? "var(--accent)" : "var(--border-soft)"}`,
          background: dragOver ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
          color: "var(--text-soft, inherit)", transition: "border-color .15s, background .15s",
        }}
      >
        {busy ? <Loader2 className="animate-spin" size={18} /> : shownName ? <FileCheck2 size={18} /> : <FileUp size={18} />}
        <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {busy
            ? tf("common.crud.uploading", "Wysyłanie…")
            : shownName ?? tf("common.crud.dropFile", "Upuść plik lub kliknij, aby wybrać")}
        </span>
      </button>
      {error && <p className="text-[11px] text-danger" style={{ marginTop: 6 }}>{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
