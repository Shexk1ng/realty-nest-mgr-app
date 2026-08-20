"use client";

// Przyciski podglądu i pobrania dokumentu z chronionego magazynu plików

import { useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { Button } from "@heroui/react";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/i18n/i18n-context";
import { downloadViaBlob } from "@/lib/download";
import { canDisplayInline } from "@/lib/file-types";
import type { Document } from "@/lib/graphql/queries/documents";

export function DocumentActions({ doc }: { doc: Document }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  if (!doc.publicId) return null;

  const download = async () => {
    setBusy(true);
    try {
      await downloadViaBlob(`/api/files?id=${doc.id}&download=1`, doc.originalName ?? doc.name);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.crud.downloadError"));
    } finally {
      setBusy(false);
    }
  };

  const canPreview = canDisplayInline(doc.mimeType, doc.originalName ?? doc.name);

  return (
    <>
      {canPreview && (
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          aria-label={`${t("dashboard.documents.preview")}: ${doc.name}`}
          onPress={() => window.open(`/api/files?id=${doc.id}`, "_blank", "noopener,noreferrer")}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        aria-label={`${t("dashboard.documents.download")}: ${doc.name}`}
        isDisabled={busy}
        onPress={() => void download()}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      </Button>
    </>
  );
}
