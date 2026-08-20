"use client";

// Ekran dokumentów: lista według kategorii, dodawanie plików i akcje pobierania

import { FileText } from "lucide-react";
import { CrudResource, type Column, type Field } from "@/components/dashboard/crud-resource";
import {
  ADD_DOCUMENT,
  DELETE_DOCUMENT,
  GET_DOCUMENTS,
  type Document,
} from "@/lib/graphql/queries/documents";
import { GET_PROPERTIES, type Property } from "@/lib/graphql/queries/properties";
import { DocumentActions } from "@/components/documents/document-actions";
import { DocumentPreview } from "@/components/dashboard/document-preview";
import { fmtBytes, fmtDate } from "@/lib/dashboard-format";
import { useI18n } from "@/i18n/i18n-context";
import { StatusBadge, DOCUMENT_CATEGORY_COLORS } from "@/components/ui/status-badge";

const CATEGORY_OPTIONS = ["CONTRACT", "LISTING", "REPORT", "MARKETING", "LEGAL", "OTHER"];

type T = (k: string) => string;
function withFallback(t: T) {
  return (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
}

function buildColumns(t: T, tf: (k: string, f: string) => string): Column<Document>[] {
  return [
  {
    key: "name",
    label: t("dashboard.documents.colDoc"),
    sortable: true,
    render: (r) => (
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 font-mono text-[10px] font-semibold text-muted-foreground">
          {r.fileType}
        </span>
        {r.publicId ? (
          <a
            href={`/api/files?id=${r.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-accent-val hover:underline"
          >
            {r.name}
          </a>
        ) : (
          <span className="flex items-center gap-2">
            <span className="font-medium text-foreground">{r.name}</span>
            <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-text-3">
              {tf("dashboard.documents.badgeNoFile", "Brak pliku")}
            </span>
          </span>
        )}
      </div>
    ),
  },
  {
    key: "category",
    label: t("dashboard.documents.colCategory"),
    sortable: true,
    render: (r) => <StatusBadge colorMap={DOCUMENT_CATEGORY_COLORS} value={r.category} />,
  },
  {
    key: "propertyTitle",
    label: tf("dashboard.documents.colProperty", "Nieruchomość"),
    sortable: true,
    render: (r) =>
      r.propertyTitle ? (
        <span className="block max-w-[220px] truncate">{r.propertyTitle}</span>
      ) : (
        <span className="text-text-3">—</span>
      ),
  },
  {
    key: "uploadedByName",
    label: tf("dashboard.documents.colUploadedBy", "Wgrał"),
    sortable: true,
    render: (r) => r.uploadedByName ?? <span className="text-text-3">—</span>,
  },
  { key: "sizeBytes", label: t("dashboard.documents.colSize"), sortable: true, align: "right", render: (r) => fmtBytes(r.sizeBytes) },
  { key: "createdAt", label: t("dashboard.documents.colAdded"), sortable: true, render: (r) => fmtDate(r.createdAt) },
  {
    key: "expiresAt",
    label: tf("dashboard.documents.colExpires", "Ważny do"),
    sortable: true,
    render: (r) =>
      r.expiresAt ? (
        <span className={isExpired(r.expiresAt) ? "font-medium text-danger" : undefined}>
          {fmtDate(r.expiresAt)}
        </span>
      ) : (
        <span className="text-text-3">—</span>
      ),
  },
  ];
}

function isExpired(raw: string): boolean {
  const due = new Date(raw);
  if (Number.isNaN(due.getTime())) return false;
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return midnight(due) < midnight(new Date());
}

function buildFields(t: T, tf: (k: string, f: string) => string): Field[] {
  return [
  {
    name: "publicId",
    label: t("dashboard.documents.fieldFile"),
    type: "file",
    required: true,
    full: true,
    fileFolder: "documents",
    fileAutoFill: {
      name: "name", fileType: "fileType", bytes: "sizeBytes", url: "url", resourceType: "resourceType",
      mimeType: "mimeType", originalName: "originalName", format: "format",
    },
    hint: t("dashboard.documents.hintFile"),
  },
  { name: "name", label: t("dashboard.documents.fieldName"), type: "text", required: true, full: true },
  { name: "category", label: t("dashboard.documents.colCategory"), type: "select", full: true, options: CATEGORY_OPTIONS.map((v) => ({ value: v, label: t(`common.status.${v}`) })) },
  {
    name: "propertyId",
    label: tf("dashboard.documents.fieldProperty", "Nieruchomość"),
    type: "reference",
    full: true,
    hint: tf(
      "dashboard.documents.hintProperty",
      "Oferta, której dotyczy dokument. Zostaw puste dla dokumentu firmowego.",
    ),
    refQuery: GET_PROPERTIES,
    refRoot: "getProperties",
    refLabel: (row) => (row as Property).title,
    refLabelFrom: "propertyTitle",
  },
  {
    name: "expiresAt",
    label: tf("dashboard.documents.fieldExpires", "Ważny do"),
    type: "date",
    full: true,
    hint: tf(
      "dashboard.documents.hintExpires",
      "Data ważności umowy lub polisy. Zostaw puste, jeśli dokument nie wygasa.",
    ),
  },
  { name: "fileType", label: t("dashboard.documents.fieldType"), type: "text", readOnly: true },
  { name: "sizeBytes", label: t("dashboard.documents.fieldSize"), type: "number", readOnly: true },
  ];
}

export default function DashboardDocumentsPage() {
  const { t } = useI18n();
  const tf = withFallback(t);
  const columns = buildColumns(t, tf);
  const fields = buildFields(t, tf);

  return (
    <CrudResource<Document>
      title={t("dashboard.documents.title")}
      description={t("dashboard.documents.description")}
      icon={FileText}
      addLabel={t("dashboard.documents.add")}
      newTitle={t("dashboard.documents.newTitle")}
      editTitle={t("dashboard.documents.editTitle")}
      emptyLabel={t("dashboard.documents.empty")}
      query={GET_DOCUMENTS}
      queryRoot="getDocuments"
      createMutation={ADD_DOCUMENT}
      deleteMutation={DELETE_DOCUMENT}
      columns={columns}
      fields={fields}
      defaults={{ category: "CONTRACT" }}
      searchKeys={["name"]}
      serverSearch
      searchPlaceholder={t("dashboard.documents.search")}
      statusKey="category"
      statusOptions={CATEGORY_OPTIONS}
      defaultSort={{ key: "shortId", dir: "desc" }}
      extraRowActions={(r) => <DocumentActions doc={r} />}
      preview={(values, mode) => <DocumentPreview values={values} mode={mode} />}
    />
  );
}
