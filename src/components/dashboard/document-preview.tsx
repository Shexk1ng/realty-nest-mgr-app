"use client";

// Podgląd metadanych dokumentu wraz z rozpoznaniem rodzaju pliku po rozszerzeniu

import { useSession } from "next-auth/react";
import {
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileUp,
  HardDrive,
  Presentation,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { DOCUMENT_CATEGORY_COLORS, StatusBadge } from "@/components/ui/status-badge";
import { fmtBytes, fmtDate, fmtDateTime } from "@/lib/dashboard-format";
import { MAX_DOC_BYTES } from "@/lib/file-types";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

const EMPTY = "—";

function str(v: unknown): string {
  if (v == null) return "";
  return typeof v === "string" ? v.trim() : String(v);
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function extensionOf(name: string, format: string, fileType: string): string {
  const fromName = /\.([a-z0-9]{1,8})$/i.exec(name)?.[1];
  return (fromName || format || fileType || "").toLowerCase();
}

interface Family {
  icon: LucideIcon;
  tone: string;
  labelKey: string;
}

const UNKNOWN_FAMILY: Family = {
  icon: FileUp,
  tone: "var(--text-3)",
  labelKey: "previewKindOther",
};

const FAMILIES: { ext: string[]; family: Family }[] = [
  { ext: ["pdf"], family: { icon: FileText, tone: "var(--danger)", labelKey: "previewKindPdf" } },
  {
    ext: ["doc", "docx", "odt", "rtf"],
    family: { icon: FileText, tone: "var(--info)", labelKey: "previewKindDoc" },
  },
  {
    ext: ["xls", "xlsx", "csv", "ods"],
    family: { icon: FileSpreadsheet, tone: "var(--success)", labelKey: "previewKindSheet" },
  },
  {
    ext: ["ppt", "pptx", "odp"],
    family: { icon: Presentation, tone: "var(--warn)", labelKey: "previewKindSlides" },
  },
  {
    ext: ["zip", "rar", "7z", "tar", "gz"],
    family: { icon: FileArchive, tone: "var(--violet)", labelKey: "previewKindArchive" },
  },
  {
    ext: ["jpg", "jpeg", "png", "gif", "webp", "svg", "heic", "img"],
    family: { icon: FileImage, tone: "var(--accent)", labelKey: "previewKindImage" },
  },
  {
    ext: ["txt", "md", "log"],
    family: { icon: FileType2, tone: "var(--text-3)", labelKey: "previewKindText" },
  },
];

function familyOf(ext: string): Family {
  if (!ext) return UNKNOWN_FAMILY;
  return FAMILIES.find((f) => f.ext.includes(ext))?.family ?? UNKNOWN_FAMILY;
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {children}
    </p>
  );
}

function Pair({
  label,
  value,
  filled,
  mono,
}: {
  label: string;
  value: string;
  filled: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-[11px] text-text-3">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right text-xs font-medium",
          mono ? "break-all font-mono" : "break-words",
          filled ? "text-foreground" : "text-text-3",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function DocumentPreview({
  values,
  mode,
}: {
  values: Record<string, unknown>;
  mode: "new" | "edit";
}) {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const { data: session } = useSession();

  const name = str(values.name);
  const category = str(values.category);
  const fileType = str(values.fileType);
  const sizeBytes = num(values.sizeBytes);
  const publicId = str(values.publicId);
  const format = str(values.format);
  const mimeType = str(values.mimeType);
  const originalName = str(values.originalName);
  const createdAt = str(values.createdAt);
  const expiresAt = str(values.expiresAt);
  const expired = (() => {
    if (!expiresAt) return false;
    const due = new Date(expiresAt);
    if (Number.isNaN(due.getTime())) return false;
    const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return midnight(due) < midnight(new Date());
  })();

  const ext = extensionOf(originalName || name, format, fileType);
  const family = familyOf(ext);
  const FamilyIcon = family.icon;
  const hasFile = Boolean(publicId);

  const usedPct = sizeBytes == null ? 0 : Math.min(100, (sizeBytes / MAX_DOC_BYTES) * 100);
  const barWidth = sizeBytes ? Math.max(2, usedPct) : 0;
  const overLimit = sizeBytes != null && sizeBytes > MAX_DOC_BYTES;
  const barTone = overLimit ? "var(--danger)" : usedPct > 75 ? "var(--warn)" : "var(--accent)";

  const user = session?.user as Record<string, unknown> | undefined;
  const sessionName =
    `${str(user?.name)} ${str(user?.surname)}`.trim() ||
    str(user?.email) ||
    t("dashboard.documents.previewUploadedByYou");
  const uploader = mode === "new" ? sessionName : str(values.uploadedById);

  const untouched = !name && !hasFile && sizeBytes == null;

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border",
            !hasFile && !ext && "border-dashed",
          )}
          style={{
            color: family.tone,
            borderColor: `color-mix(in oklab, ${family.tone} 32%, transparent)`,
            background: `color-mix(in oklab, ${family.tone} 12%, transparent)`,
          }}
          aria-hidden
        >
          <FamilyIcon className="h-5 w-5" />
          <span className="max-w-full truncate px-1 font-mono text-[9px] font-semibold uppercase tracking-wide">
            {ext || EMPTY}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "font-display text-lg font-semibold leading-snug tracking-tight break-words",
              name ? "text-foreground" : "text-text-3",
            )}
          >
            {name || t("dashboard.documents.previewUntitled")}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge value={category || null} colorMap={DOCUMENT_CATEGORY_COLORS} />
          </div>
        </div>
      </header>

      {mode === "new" && untouched && (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-[11px] leading-relaxed text-text-3">
          {t("dashboard.documents.previewHint")}
        </p>
      )}

      <section className="rounded-xl border border-border bg-surface p-3">
        <SectionTitle icon={HardDrive}>{t("dashboard.documents.previewFileSection")}</SectionTitle>

        <p
          className={cn(
            "font-display text-2xl font-semibold tabular-nums tracking-tight",
            sizeBytes == null ? "text-text-3" : "text-foreground",
          )}
        >
          {sizeBytes == null ? EMPTY : fmtBytes(sizeBytes)}
        </p>

        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${barWidth}%`, background: barTone }}
          />
        </div>
        <p className={cn("mt-1 text-[11px]", overLimit ? "text-danger" : "text-text-3")}>
          {t("dashboard.documents.previewLimitUsed")
            .replace("{size}", sizeBytes == null ? EMPTY : fmtBytes(sizeBytes))
            .replace("{max}", fmtBytes(MAX_DOC_BYTES))}
        </p>

        <dl className="mt-2 divide-y divide-border">
          <Pair
            label={t("dashboard.documents.previewKind")}
            value={t(`dashboard.documents.${family.labelKey}`)}
            filled={Boolean(ext)}
          />
          <Pair
            label={t("dashboard.documents.fieldType")}
            value={fileType || EMPTY}
            filled={Boolean(fileType)}
          />
          <Pair
            label={t("dashboard.documents.previewFormat")}
            value={format || EMPTY}
            filled={Boolean(format)}
          />
          <Pair
            label={t("dashboard.documents.previewMime")}
            value={mimeType || EMPTY}
            filled={Boolean(mimeType)}
            mono
          />
          <Pair
            label={t("dashboard.documents.previewOriginalName")}
            value={originalName || EMPTY}
            filled={Boolean(originalName)}
          />
        </dl>

        {!hasFile && (
          <p className="mt-2 text-[11px] leading-relaxed text-text-3">
            {t("dashboard.documents.previewNoFile")}
          </p>
        )}
      </section>

      <section>
        <SectionTitle icon={UserRound}>{t("dashboard.documents.previewOrigin")}</SectionTitle>
        <dl className="divide-y divide-border">
          <Pair
            label={t("dashboard.documents.previewUploadedBy")}
            value={uploader || EMPTY}
            filled={Boolean(uploader)}
          />
          <Pair
            label={t("dashboard.documents.colAdded")}
            value={
              createdAt
                ? fmtDateTime(createdAt)
                : mode === "new"
                  ? t("dashboard.documents.previewOnSave")
                  : EMPTY
            }
            filled={Boolean(createdAt)}
          />
          <Pair
            label={tf("dashboard.documents.fieldExpires", "Ważny do")}
            value={expiresAt ? fmtDate(expiresAt) : EMPTY}
            filled={Boolean(expiresAt)}
          />
          <Pair
            label={t("dashboard.documents.previewFileId")}
            value={publicId || EMPTY}
            filled={hasFile}
            mono
          />
        </dl>
        {expired && (
          <p className="mt-1.5 text-[11px] text-danger">
            {tf("dashboard.documents.previewExpired", "Ten dokument stracił ważność.")}
          </p>
        )}
      </section>

      {hasFile && (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-text-3">
          <ShieldCheck className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{t("dashboard.documents.previewPrivate")}</span>
        </p>
      )}
    </div>
  );
}
