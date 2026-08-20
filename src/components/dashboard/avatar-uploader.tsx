"use client";

// Wgrywanie zdjęcia profilowego ze skalowaniem obrazu w przeglądarce przed wysyłką

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Button } from "@heroui/react";
import { Avatar } from "@/components/ui/avatar";
import { downscaleImage } from "@/components/uploads/downscale";
import { uploadImage } from "@/components/uploads/upload-client";
import { useI18n } from "@/i18n/i18n-context";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const RESIZE_EDGE = 512;

export function AvatarUploader({
  value,
  name,
  disabled,
  onChange,
}: {
  value: string | null;
  name: string;
  disabled?: boolean;
  onChange: (url: string | null) => void;
}) {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const resolved = t(key);
    return resolved === key ? fallback : resolved;
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Wybierz plik graficzny.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError(tf("common.crud.imageTooLarge", "Zdjęcie jest za duże (maks. 10 MB)."));
      return;
    }
    setBusy(true);
    try {
      const blob = await downscaleImage(file, { maxEdge: RESIZE_EDGE, square: true, quality: 0.9 });
      const { url } = await uploadImage(blob, "avatars", "avatar.jpg");
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : tf("common.crud.imageUploadFailed", "Nie udało się wysłać zdjęcia."));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar src={value} name={name} size={72} />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            isDisabled={disabled || busy}
            onPress={() => inputRef.current?.click()}
          >
            <Camera className="h-3.5 w-3.5" />
            {value ? tf("common.crud.changePhoto", "Zmień zdjęcie") : tf("common.crud.addPhoto", "Dodaj zdjęcie")}
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
        <p className="text-[11px] text-muted-foreground">
          JPG lub PNG, najlepiej kwadratowe.
        </p>
        {error && <p className="text-[11px] text-danger">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
