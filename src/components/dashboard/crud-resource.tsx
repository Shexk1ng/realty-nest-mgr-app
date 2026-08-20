"use client";

// Uniwersalna obsługa list CRUD: tabela, filtry, stronicowanie i formularz w oknie modalnym

import { useEffect, useMemo, useRef, useState } from "react";
import { type DocumentNode, type TypedDocumentNode } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import type { OperationDefinitionNode } from "graphql";
import { useSession } from "next-auth/react";
import { roleIs } from "@/lib/roles";
import { useI18n } from "@/i18n/i18n-context";
import {
  AlertTriangle,
  Inbox,
  Pencil,
  Plus,
  SearchX,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Alert,
  Button,
  ComboBox,
  Description,
  EmptyState,
  Label,
  ListBox,
  ListBoxItem,
  Modal,
  AlertDialog,
  SearchField,
  Select,
  Spinner,
  Table,
  TextArea,
  Input,
} from "@heroui/react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { FileUploader } from "@/components/uploads/file-uploader";
import type { UploadedDocument } from "@/components/uploads/upload-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { Toggle } from "@/components/ui/toggle";
import {
  ChecklistField,
  type ChecklistCatalogueItem,
  type ChecklistEntry,
} from "@/components/ui/checklist-field";
import { STATUS_LABELS_PL } from "@/components/ui/status-badge";
import { FilterPanel } from "@/components/ui/filter-panel";
import { toDateInput, toDateTimeInput } from "@/lib/dashboard-format";
import { EMPTY_VIEW, useTableView } from "@/lib/table-view";
import { SHORTCUT_EVENT, useShortcutEvent } from "@/components/dashboard/keyboard-shortcuts";

const PAGE_SIZE = 20;
const SEARCH_LIMIT = 500;

export interface Row {
  id: string;
}

function get(row: Row, key: string): unknown {
  return (row as unknown as Record<string, unknown>)[key];
}

function optionalText(t: (key: string) => string, key: string): string {
  const value = t(key);
  return value === key ? "" : value;
}

function fill(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export interface Column<T extends Row> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  accessor?: (row: T) => string | number | null | undefined;
  className?: string;
  align?: "left" | "right";
  filter?: "text" | "select";
  filterOptions?: { value: string; label: string }[];
  filterPlaceholder?: string;
}

export type FieldType =
  | "text"
  | "email"
  | "number"
  | "textarea"
  | "select"
  | "reference"
  | "boolean"
  | "date"
  | "datetime"
  | "file"
  | "checklist";

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  full?: boolean;
  hint?: string;
  fileFolder?: string;
  fileAutoFill?: Partial<Record<
    "url" | "resourceType" | "fileType" | "bytes" | "name" | "mimeType" | "originalName" | "format",
    string
  >>;
  checklistItems?: ChecklistCatalogueItem[];
  readOnly?: boolean;
  half?: boolean;
  visibleWhen?: (values: Record<string, unknown>) => boolean;

  showOn?: "new" | "edit";

  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  validate?: (value: unknown, all: Record<string, unknown>) => string | null;

  refQuery?: DocumentNode;
  refRoot?: string;
  refVariables?: Record<string, unknown>;
  refLabel?: (row: Row) => string;
  refLabelFrom?: string;
}

export interface CrudResourceProps<T extends Row> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  addLabel?: string;

  query:
    | DocumentNode
    | TypedDocumentNode<Record<string, { items: T[]; totalCount: number; hasMore: boolean }>>;
  queryRoot: string;
  queryVariables?: Record<string, unknown>;
  createMutation?: DocumentNode;
  updateMutation?: DocumentNode;
  deleteMutation?: DocumentNode;

  columns: Column<T>[];
  fields: Field[];
  defaults?: Record<string, unknown>;
  toForm?: (row: T) => Record<string, unknown>;

  searchKeys?: (keyof T | ((row: T) => string))[];
  serverSearch?: boolean;
  searchPlaceholder?: string;
  statusKey?: keyof T;
  statusOptions?: string[];

  summary?: (rows: T[]) => React.ReactNode;
  emptyLabel?: string;
  emptyHintKey?: string;
  viewKey?: string;
  defaultSort?: { key: string; dir: "asc" | "desc" };
  extraRowActions?: (row: T, role?: string | null) => React.ReactNode;
  autoOpenNew?: boolean;
  canDelete?: (role?: string | null) => boolean;
  canCreate?: (role?: string | null) => boolean;
  canEdit?: (role: string | null | undefined, row: T) => boolean;
  newTitle?: string;
  editTitle?: string;

  validateForm?: (values: Record<string, unknown>) => Record<string, string>;

  preview?: (values: Record<string, unknown>, mode: "new" | "edit") => React.ReactNode;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

function coerceField(field: Field, raw: unknown): unknown {
  if (field.type === "number") {
    if (raw === "" || raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (field.type === "boolean") return Boolean(raw);
  if (field.type === "datetime" && typeof raw === "string" && raw !== "") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? raw : d.toISOString();
  }
  if (raw === "" || raw == null) return field.required ? raw : null;
  return raw;
}

function toInputValue(type: FieldType, raw: unknown): unknown {
  if (raw == null) return "";
  if (type === "date") return toDateInput(String(raw));
  if (type === "datetime") return toDateTimeInput(String(raw));
  return raw;
}

function defaultAccessor<T extends Row>(col: Column<T>, row: T) {
  if (col.accessor) return col.accessor(row);
  return get(row, col.key) as string | number | null | undefined;
}

function inputType(type: FieldType): string {
  switch (type) {
    case "number":
      return "number";
    case "date":
      return "date";
    case "datetime":
      return "datetime-local";
    case "email":
      return "email";
    default:
      return "text";
  }
}

function declaredVariables(doc: DocumentNode | undefined): Set<string> | null {
  if (!doc) return null;
  const op = doc.definitions.find((d) => d.kind === "OperationDefinition") as
    | OperationDefinitionNode
    | undefined;
  if (!op?.variableDefinitions?.length) return null;
  return new Set(op.variableDefinitions.map((v) => v.variable.name.value));
}

function isSameValue(field: Field, a: unknown, b: unknown): boolean {
  if (field.type === "boolean") return Boolean(a) === Boolean(b);
  if (field.type === "checklist" || Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  }
  return String(a ?? "") === String(b ?? "");
}

function ReferenceInput({
  id,
  field,
  value,
  fallbackLabel,
  invalid,
  describedBy,
  onChange,
}: {
  id: string;
  field: Field;
  value: string;
  fallbackLabel: string;
  invalid: boolean;
  describedBy?: string;
  onChange: (next: string) => void;
}) {
  const { t } = useI18n();
  const { data } = useQuery<Record<string, { items: Row[] }>>(field.refQuery as DocumentNode, {
    variables: { limit: SEARCH_LIMIT, offset: 0, ...field.refVariables },
    skip: !field.refQuery || !field.refRoot,
    fetchPolicy: "cache-first",
  });

  const options = useMemo(() => {
    const items = (field.refRoot ? data?.[field.refRoot]?.items : undefined) ?? [];
    const list = items.map((row) => ({
      value: row.id,
      label: field.refLabel ? field.refLabel(row) : row.id,
    }));
    if (value && !list.some((o) => o.value === value)) {
      list.unshift({ value, label: fallbackLabel || value });
    }
    return list;
  }, [data, field, value, fallbackLabel]);

  return (
    <ComboBox
      selectedKey={value || null}
      onSelectionChange={(key) => onChange(key == null ? "" : String(key))}
      aria-label={field.label}
      isInvalid={invalid}
      allowsEmptyCollection
      fullWidth
    >
      <ComboBox.InputGroup>
        <Input
          id={id}
          placeholder={field.placeholder ?? t("common.crud.referenceSearch")}
          aria-describedby={describedBy}
        />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox renderEmptyState={() => (
          <span className="block px-3 py-2 text-xs text-muted-foreground">
            {t("common.crud.referenceEmpty")}
          </span>
        )}>
          {options.map((o) => (
            <ListBoxItem key={o.value} id={o.value} textValue={o.label}>
              {o.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}

function EntityModal({
  title,
  fields,
  initial,
  busy,
  serverError,
  mode,
  preview,
  validateForm,
  onClose,
  onSubmit,
}: {
  title: string;
  fields: Field[];
  initial: Record<string, unknown>;
  busy: boolean;
  serverError: string | null;
  mode: "new" | "edit";
  preview?: (values: Record<string, unknown>, mode: "new" | "edit") => React.ReactNode;
  validateForm?: (values: Record<string, unknown>) => Record<string, string>;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
}) {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<string, unknown>>(() => initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const [baseline] = useState(initial);

  const set = (name: string, v: unknown) => {
    setValues((s) => ({ ...s, [name]: v }));
    setErrors((e) => {
      if (!e[name]) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });
  };

  const dirty = useMemo(
    () => fields.some((f) => !isSameValue(f, baseline[f.name], values[f.name])),
    [fields, baseline, values],
  );
  const unsavedLabel = optionalText(t, "common.crud.unsavedIndicator");
  const selectPlaceholder = optionalText(t, "common.crud.selectPlaceholder") || undefined;

  useEffect(() => {
    if (serverError) errorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [serverError]);

  const requestClose = () => {
    if (busy) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const isVisible = (f: Field) => (f.visibleWhen ? f.visibleWhen(values) : true);

  const validateField = (f: Field, raw: unknown): string | null => {
    if (f.type === "boolean") return f.validate?.(raw, values) ?? null;

    const empty =
      raw == null ||
      (typeof raw === "string" && raw.trim() === "") ||
      (Array.isArray(raw) && raw.length === 0);
    if (f.required && empty) return t("common.crud.required");
    if (empty) return f.validate?.(raw, values) ?? null;

    if (f.type === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n)) return t("common.crud.invalidNumber");
      if (f.min != null && n < f.min) return fill(t("common.crud.invalidMin"), { min: f.min });
      if (f.max != null && n > f.max) return fill(t("common.crud.invalidMax"), { max: f.max });
    } else if (typeof raw === "string") {
      const s = raw.trim();
      if (f.minLength != null && s.length < f.minLength) {
        return fill(t("common.crud.invalidMinLength"), { min: f.minLength });
      }
      if (f.maxLength != null && s.length > f.maxLength) {
        return fill(t("common.crud.invalidMaxLength"), { max: f.maxLength });
      }
      if (f.pattern && !new RegExp(f.pattern).test(s)) return t("common.crud.invalidFormat");
    }

    return f.validate?.(raw, values) ?? null;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const f of fields) {
      if (!isVisible(f)) continue;
      const message = validateField(f, values[f.name]);
      if (message) next[f.name] = message;
    }
    for (const [name, message] of Object.entries(validateForm?.(values) ?? {})) {
      if (message) next[name] = message;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const firstBad = fields.find((f) => isVisible(f) && next[f.name]);
      if (firstBad) {
        const id = `fld-${firstBad.name}`;
        (document.getElementById(`${id}-row`) ?? document.getElementById(id))?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
        document.getElementById(id)?.focus();
      }
      return;
    }

    const out: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.showOn && f.showOn !== mode) continue;
      out[f.name] = coerceField(f, values[f.name]);
    }
    for (const f of fields) {
      for (const target of Object.values(f.fileAutoFill ?? {})) {
        if (target && !(target in out) && values[target] !== undefined) {
          out[target] = values[target];
        }
      }
    }
    onSubmit(out);
  };

  const previewNode = preview ? preview(values, mode) : null;
  const twoCol = previewNode != null && previewNode !== false;

  const errorBanner = serverError ? (
    <div ref={errorRef} aria-live="assertive">
      <Alert status="danger">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        <span>{serverError}</span>
      </Alert>
    </div>
  ) : null;

  const formEl = (
    <form
      id="entity-form"
      onSubmit={submit}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      {fields.map((f) => {
        if (!isVisible(f)) return null;
        if (f.showOn && f.showOn !== mode) return null;
        const id = `fld-${f.name}`;
        const val = values[f.name];
        const err = errors[f.name];
        const describedBy = [err ? `${id}-err` : null, f.hint ? `${id}-hint` : null]
          .filter(Boolean)
          .join(" ") || undefined;
        const nativeLabel = f.type !== "select" && f.type !== "checklist" && f.type !== "file";

        return (
          <div
            key={f.name}
            id={`${id}-row`}
            className={cn("flex flex-col gap-1.5", f.full && "sm:col-span-2", f.half && "sm:col-span-1")}
          >
            {f.type !== "boolean" && (
              <Label
                id={`${id}-lbl`}
                htmlFor={nativeLabel ? id : undefined}
                isRequired={f.required}
                isInvalid={Boolean(err)}
              >
                {f.label}
              </Label>
            )}

            {f.type === "boolean" ? (
              <Toggle
                label={f.label}
                checked={Boolean(val)}
                onChange={(v) => set(f.name, v)}
              />
            ) : f.type === "checklist" ? (
              <ChecklistField
                id={id}
                ariaLabelledBy={`${id}-lbl`}
                describedBy={describedBy}
                catalogue={f.checklistItems ?? []}
                value={Array.isArray(val) ? (val as ChecklistEntry[]) : []}
                onChange={(v) => set(f.name, v)}
              />
            ) : f.type === "file" ? (
              <FileUploader
                id={id}
                ariaLabelledBy={`${id}-lbl`}
                describedBy={describedBy}
                folder={f.fileFolder ?? "documents"}
                currentName={
                  (values[f.fileAutoFill?.name ?? "name"] as string) ||
                  (val ? t("common.crud.currentFile") : null)
                }
                onUploaded={(doc: UploadedDocument) => {
                  set(f.name, doc.publicId);
                  const map = f.fileAutoFill ?? {};
                  const result: Record<string, unknown> = {
                    url: doc.url,
                    resourceType: doc.resourceType,
                    fileType: doc.fileType,
                    bytes: doc.bytes,
                    name: doc.name,
                    mimeType: doc.mimeType,
                    originalName: doc.originalName,
                    format: doc.format,
                  };
                  for (const [key, target] of Object.entries(map)) {
                    if (target) set(target, result[key]);
                  }
                }}
              />
            ) : f.type === "textarea" ? (
              <TextArea
                id={id}
                fullWidth
                rows={3}
                value={(val as string) ?? ""}
                placeholder={f.placeholder}
                aria-invalid={Boolean(err) || undefined}
                aria-describedby={describedBy}
                onChange={(e) => set(f.name, e.target.value)}
              />
            ) : f.type === "reference" ? (
              <ReferenceInput
                id={id}
                field={f}
                value={(val as string) ?? ""}
                fallbackLabel={
                  f.refLabelFrom ? String(values[f.refLabelFrom] ?? "") : ""
                }
                invalid={Boolean(err)}
                describedBy={describedBy}
                onChange={(next) => set(f.name, next)}
              />
            ) : f.type === "select" ? (
              <Select
                selectedKey={(val as string) ?? ""}
                onSelectionChange={(k) => set(f.name, k as string)}
                aria-labelledby={`${id}-lbl`}
                isInvalid={Boolean(err)}
                placeholder={f.placeholder ?? selectPlaceholder}
                fullWidth
              >
                <Select.Trigger id={id} aria-describedby={describedBy}>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {f.options?.map((o) => (
                      <ListBoxItem key={o.value} id={o.value}>
                        {o.label}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            ) : (
              <Input
                id={id}
                fullWidth
                type={inputType(f.type)}
                value={(val as string | number) ?? ""}
                placeholder={f.placeholder}
                disabled={f.readOnly}
                min={f.min}
                max={f.max}
                step={f.step}
                maxLength={f.maxLength}
                aria-invalid={Boolean(err) || undefined}
                aria-describedby={describedBy}
                onChange={(e) => set(f.name, e.target.value)}
              />
            )}

            {f.hint && <Description id={`${id}-hint`}>{f.hint}</Description>}
            {err && (
              <span id={`${id}-err`} className="text-[11px] text-danger" role="alert">
                {err}
              </span>
            )}
          </div>
        );
      })}
    </form>
  );

  return (
    <Modal
      isOpen
      onOpenChange={(open) => {
        if (!open && !busy && !confirmDiscard) requestClose();
      }}
    >
      <Modal.Backdrop isDismissable={!busy && !confirmDiscard}>
        <Modal.Container
          size="lg"
          scroll="inside"
          className={cn(twoCol && "sm:w-full")}
        >
          <Modal.Dialog className={cn(twoCol && "max-w-none sm:max-w-5xl")}>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body
              className={cn(
                twoCol &&
                  "grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden",
              )}
            >
              {twoCol ? (
                <>
                  <aside
                    role="region"
                    aria-label={t("common.crud.previewTitle")}
                    className="scrollbar max-h-[45vh] min-h-0 overflow-y-auto rounded-xl border border-border bg-surface-hi p-4 lg:max-h-none"
                  >
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-3">
                      {t("common.crud.previewTitle")}
                    </p>
                    {previewNode}
                  </aside>

                  <div className="scrollbar flex min-h-0 flex-col gap-4 lg:overflow-y-auto lg:border-l lg:border-l-border lg:pl-5 lg:pr-1">
                    {errorBanner}
                    {formEl}
                  </div>
                </>
              ) : (
                <>
                  {errorBanner && <div className="mb-4">{errorBanner}</div>}
                  {formEl}
                </>
              )}
            </Modal.Body>

            <Modal.Footer>
              {dirty && !busy && unsavedLabel && (
                <span className="rn-dirty mr-auto" role="status">
                  <span className="rn-dirty__dot" aria-hidden />
                  {unsavedLabel}
                </span>
              )}
              <Button variant="ghost" size="sm" onPress={requestClose} isDisabled={busy}>
                {t("common.crud.cancel")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="entity-form"
                isDisabled={busy}
              >
                {busy ? <Spinner size="sm" color="current" /> : null} {t("common.crud.save")}
              </Button>
            </Modal.Footer>

            {confirmDiscard && (
              <AlertDialog
                isOpen
                onOpenChange={(open) => {
                  if (!open) setConfirmDiscard(false);
                }}
              >
                <AlertDialog.Backdrop isDismissable>
                  <AlertDialog.Container size="sm">
                    <AlertDialog.Dialog>
                      <AlertDialog.Header>
                        <AlertDialog.Icon status="warning">
                          <AlertTriangle className="h-5 w-5" aria-hidden />
                        </AlertDialog.Icon>
                        <AlertDialog.Heading>
                          {t("common.crud.unsavedHeading")}
                        </AlertDialog.Heading>
                      </AlertDialog.Header>

                      <AlertDialog.Body>{t("common.crud.unsavedBody")}</AlertDialog.Body>

                      <AlertDialog.Footer>
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={() => setConfirmDiscard(false)}
                        >
                          {t("common.crud.unsavedKeepEditing")}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onPress={() => {
                            setConfirmDiscard(false);
                            onClose();
                          }}
                        >
                          {t("common.crud.unsavedDiscard")}
                        </Button>
                      </AlertDialog.Footer>
                    </AlertDialog.Dialog>
                  </AlertDialog.Container>
                </AlertDialog.Backdrop>
              </AlertDialog>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export function ConfirmDialog({
  label,
  busy,
  onCancel,
  onConfirm,
}: {
  label: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();

  return (
    <AlertDialog isOpen onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
      <AlertDialog.Backdrop isDismissable={!busy}>
        <AlertDialog.Container size="sm">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger">
                <Trash2 className="h-5 w-5" aria-hidden />
              </AlertDialog.Icon>
              <AlertDialog.Heading>{t("common.crud.deleteHeading").replace("{label}", label)}</AlertDialog.Heading>
            </AlertDialog.Header>

            <AlertDialog.Body>
              {t("common.crud.deleteBody")}
            </AlertDialog.Body>

            <AlertDialog.Footer>
              <Button variant="ghost" size="sm" onPress={onCancel} isDisabled={busy}>
                {t("common.crud.cancel")}
              </Button>
              <Button variant="danger" size="sm" onPress={onConfirm} isDisabled={busy}>
                {busy ? <Spinner size="sm" color="current" /> : <Trash2 className="h-4 w-4" />}{" "}
                {t("common.crud.delete")}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

export function CrudResource<T extends Row>({
  title,
  description,
  icon: Icon,
  addLabel,
  query,
  queryRoot,
  queryVariables,
  createMutation,
  updateMutation,
  deleteMutation,
  columns,
  fields,
  defaults = {},
  toForm,
  searchKeys,
  serverSearch,
  searchPlaceholder,
  statusKey,
  statusOptions,
  summary,
  emptyLabel,
  emptyHintKey,
  viewKey,
  defaultSort = null as unknown as { key: string; dir: "asc" | "desc" },
  extraRowActions,
  autoOpenNew,
  canDelete = roleIs.canDelete,
  canCreate,
  canEdit,
  newTitle,
  editTitle,
  validateForm,
  preview,
}: CrudResourceProps<T>) {
  const { t } = useI18n();
  const addText = addLabel ?? t("common.crud.add");
  const searchText = searchPlaceholder ?? t("common.crud.search");
  const emptyText = emptyLabel ?? t("common.crud.empty");
  const emptyHintText = optionalText(t, emptyHintKey ?? "common.crud.emptyHint");
  const noMatchHint = optionalText(t, "common.crud.noMatchesHint");
  const { data: session } = useSession();
  const role = session?.user?.role;
  const mayDelete = Boolean(deleteMutation) && canDelete(role);
  const mayCreate = Boolean(createMutation) && (canCreate ? canCreate(role) : true);

  const { view, patch: patchView, clearFilters: forgetFilters } = useTableView(viewKey ?? queryRoot);
  const search = view?.search ?? "";
  const statusFilter = view?.status ?? "";
  const colFilters = view?.filters ?? EMPTY_VIEW.filters;
  const sortKey = view?.sort?.key ?? defaultSort?.key ?? null;
  const sortDir = view?.sort?.dir ?? defaultSort?.dir ?? "asc";
  const sort = useMemo<SortState>(
    () => (sortKey ? { key: sortKey, dir: sortDir } : null),
    [sortKey, sortDir],
  );
  const [page, setPage] = useState(0);
  const [filterToken, setFilterToken] = useState(0);

  const setSearch = (value: string) => patchView({ search: value });
  const setStatusFilter = (value: string) => patchView({ status: value });
  const setSort = (next: NonNullable<SortState>) => patchView({ sort: next });

  const setColFilter = (key: string, val: string) => {
    const next = { ...colFilters };
    if (val) next[key] = val;
    else delete next[key];
    patchView({ filters: next });
  };
  const hasColFilters = Object.keys(colFilters).length > 0;
  const term = search.trim();
  const clientFilterActive =
    (Boolean(term) && !serverSearch) || Boolean(statusFilter) || hasColFilters;

  const sortMovedFromDefault =
    Boolean(sort) &&
    (!defaultSort || sort!.key !== defaultSort.key || sort!.dir !== defaultSort.dir);
  const wideFetch = clientFilterActive || sortMovedFromDefault;

  const activeFilterCount =
    (term ? 1 : 0) + (statusFilter ? 1 : 0) + Object.keys(colFilters).length;
  const anyFilterActive = activeFilterCount > 0;
  const searchLabel = searchText.replace(/[….]+$/, "");

  const { data, loading, error, refetch } = useQuery<
    Record<string, { items: T[]; totalCount: number; hasMore: boolean }>
  >(query, {
    fetchPolicy: "cache-and-network",
    variables: {
      ...queryVariables,
      ...(serverSearch && term ? { search: term } : {}),
      ...(wideFetch
        ? { limit: SEARCH_LIMIT, offset: 0 }
        : { limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    },
  });

  const [runCreate, createState] = useMutation(createMutation ?? query);
  const [runUpdate, updateState] = useMutation(updateMutation ?? query);
  const [runDelete] = useMutation(deleteMutation ?? query);

  const createVars = useMemo(() => declaredVariables(createMutation), [createMutation]);
  const updateVars = useMemo(() => declaredVariables(updateMutation), [updateMutation]);

  const [modal, setModal] = useState<{ mode: "new" | "edit"; row?: T } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const container = data?.[queryRoot];
  const rows = useMemo(() => (container?.items ?? []) as T[], [container]);
  const totalCount = container?.totalCount ?? 0;
  const busy = createState.loading || updateState.loading;

  const criteria = `${search}|${statusFilter}|${JSON.stringify(colFilters)}|${sort?.key ?? ""}|${sort?.dir ?? ""}`;
  const [prevCriteria, setPrevCriteria] = useState(criteria);
  if (criteria !== prevCriteria) {
    setPrevCriteria(criteria);
    setPage(0);
  }

  const filtered = useMemo(() => {
    let out = [...rows];
    if (!serverSearch && search.trim() && searchKeys?.length) {
      const q = search.toLowerCase();
      out = out.filter((r) =>
        searchKeys.some((k) => {
          const v = typeof k === "function" ? k(r) : r[k];
          return v != null && String(v).toLowerCase().includes(q);
        }),
      );
    }
    if (statusFilter && statusKey) out = out.filter((r) => r[statusKey] === statusFilter);
    for (const col of columns) {
      const val = colFilters[col.key];
      if (!val) continue;
      const needle = val.toLowerCase();
      out = out.filter((r) => {
        const cv = col.accessor ? col.accessor(r) : get(r, col.key);
        return String(cv ?? "").toLowerCase().includes(needle);
      });
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      out.sort((a, b) => {
        const av = col
          ? defaultAccessor(col, a)
          : (get(a, sort.key) as string | number | null | undefined);
        const bv = col
          ? defaultAccessor(col, b)
          : (get(b, sort.key) as string | number | null | undefined);
        let cmp = 0;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, search, serverSearch, searchKeys, statusFilter, statusKey, sort, columns, colFilters]);

  const visible = useMemo(() => {
    if (clientFilterActive) return filtered;
    if (!wideFetch) return filtered;
    return filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [filtered, clientFilterActive, wideFetch, page]);

  const sortTruncated = wideFetch && !clientFilterActive && totalCount > SEARCH_LIMIT;

  const openNew = () => {
    setFormError(null);
    setModal({ mode: "new" });
  };

  useShortcutEvent(SHORTCUT_EVENT.newRecord, () => {
    if (mayCreate && !modal) openNew();
  });
  useShortcutEvent(SHORTCUT_EVENT.focusFilters, () => setFilterToken((n) => n + 1));

  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenNew && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      openNew();
    }
  }, [autoOpenNew]);

  const openEdit = (row: T) => {
    setFormError(null);
    setModal({ mode: "edit", row });
  };

  const initialValues = useMemo<Record<string, unknown>>(() => {
    if (!modal) return {};
    if (modal.mode === "new") {
      const base: Record<string, unknown> = {};
      for (const f of fields)
        base[f.name] =
          defaults[f.name] ??
          (f.type === "select" ? (f.options?.[0]?.value ?? "") : f.type === "checklist" ? [] : "");
      return base;
    }
    const row = modal.row as T;
    const base: Record<string, unknown> = toForm ? { ...toForm(row) } : {};
    for (const f of fields) {
      const raw = toForm ? base[f.name] : get(row, f.name);
      base[f.name] = toInputValue(f.type, raw);
    }
    return base;
  }, [modal, fields, defaults, toForm]);

  const cleanMessage = (err: unknown, fallback: string) => {
    const raw = err instanceof Error ? err.message : fallback;
    return raw.replace(/^(ApolloError|Error):\s*/i, "") || fallback;
  };

  const pickDeclared = (
    values: Record<string, unknown>,
    accepted: Set<string> | null,
  ): Record<string, unknown> => {
    if (!accepted) return values;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      if (accepted.has(key)) out[key] = value;
      else if (process.env.NODE_ENV !== "production") {
        console.warn(`[CrudResource] "${key}" is not a variable of this mutation — not sent.`);
      }
    }
    return out;
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setFormError(null);
    try {
      if (modal?.mode === "edit" && modal.row) {
        await runUpdate({
          variables: { id: modal.row.id, ...pickDeclared(values, updateVars) },
        });
      } else {
        await runCreate({ variables: pickDeclared(values, createVars) });
      }
      await refetch();
      setModal(null);
    } catch (err) {
      setFormError(cleanMessage(err, t("common.crud.saveError")));
    }
  };

  const handleDelete = async (row: T) => {
    if (!deleteMutation) return;
    setDeleting(row.id);
    try {
      await runDelete({ variables: { id: row.id } });
      await refetch();
      setConfirmRow(null);
    } catch (err) {
      setConfirmRow(null);
      toast.error(cleanMessage(err, t("common.crud.deleteError")));
    } finally {
      setDeleting(null);
    }
  };

  const sortDescriptor =
    sort && columns.some((c) => c.key === sort.key)
      ? {
          column: sort.key,
          direction: sort.dir === "asc" ? ("ascending" as const) : ("descending" as const),
        }
      : undefined;

  const showTable = !loading && !error && visible.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2.5 font-display text-3xl font-semibold tracking-tight text-foreground">
            {Icon && <Icon className="h-7 w-7 text-primary" aria-hidden />}
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {mayCreate && (
          <Button variant="primary" onPress={openNew}>
            <Plus size={15} /> {addText}
          </Button>
        )}
      </header>

      {summary && rows.length > 0 && summary(rows)}

      <FilterPanel activeCount={activeFilterCount} openToken={filterToken}>
        <div className="rn-filterbar">
          {searchKeys?.length ? (
          <div className="rn-filterbar__field" data-active={Boolean(term)}>
            <span className="rn-filterbar__label">{searchLabel}</span>
            <SearchField aria-label={searchLabel} value={search} onChange={setSearch}>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder={searchText} />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </div>
        ) : null}

        {statusKey && statusOptions?.length ? (
          <div className="rn-filterbar__field" data-active={Boolean(statusFilter)}>
            <span className="rn-filterbar__label">{t("common.crud.statusLabel")}</span>
            <Select
              aria-label={t("common.crud.filterByStatus")}
              selectedKey={statusFilter || "__all"}
              onSelectionChange={(k) => setStatusFilter(String(k) === "__all" ? "" : String(k))}
              fullWidth
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBoxItem id="__all">{t("common.crud.all")}</ListBoxItem>
                  {statusOptions.map((s) => (
                    <ListBoxItem key={s} id={s}>
                      {STATUS_LABELS_PL[s] ?? s}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        ) : null}

        {columns
          .filter((c) => c.filter)
          .map((c) => (
            <div
              key={c.key}
              className="rn-filterbar__field"
              data-active={Boolean(colFilters[c.key])}
            >
              <span className="rn-filterbar__label">{c.label}</span>

              {c.filter === "select" ? (
                <Select
                  aria-label={fill(t("common.crud.filterBy"), { label: c.label })}
                  selectedKey={colFilters[c.key] || "__all"}
                  onSelectionChange={(k) =>
                    setColFilter(c.key, String(k) === "__all" ? "" : String(k))
                  }
                  fullWidth
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBoxItem id="__all">{t("common.crud.all")}</ListBoxItem>
                      {(c.filterOptions ?? []).map((o) => (
                        <ListBoxItem key={o.value} id={o.value}>
                          {o.label}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              ) : (
                <Input
                  aria-label={fill(t("common.crud.filterBy"), { label: c.label })}
                  type="search"
                  fullWidth
                  placeholder={c.filterPlaceholder ?? t("common.crud.filter")}
                  value={colFilters[c.key] ?? ""}
                  onChange={(e) => setColFilter(c.key, e.target.value)}
                />
              )}
            </div>
          ))}

        <div className="rn-filterbar__field">
          <span className="rn-filterbar__label sr-only">{t("common.crud.actions")}</span>
          <Button
            variant="secondary"
            isDisabled={!anyFilterActive}
            onPress={forgetFilters}
          >
            <X className="h-4 w-4" /> {t("common.crud.clearFilters")}
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
        </div>
        </div>
      </FilterPanel>

      <div className="rn-table-surface">
        {loading && !data ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                {columns.map((c, j) => (
                  <Skeleton
                    key={c.key}
                    variant="text"
                    className="flex-1"
                    style={{ maxWidth: `${45 + ((i * (j + 1)) % 5) * 10}%` }}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState className="py-16">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] text-danger">
              <AlertTriangle className="h-6 w-6" aria-hidden />
            </span>
            <span className="font-medium text-foreground">{t("common.crud.loadError")}</span>
            <span className="text-sm text-muted-foreground">
              {cleanMessage(error, t("common.crud.tryAgain"))}
            </span>
            <Button variant="secondary" size="sm" onPress={() => refetch()} className="mt-1">
              {t("common.crud.retry")}
            </Button>
          </EmptyState>
        ) : visible.length === 0 ? (
          rows.length === 0 && !anyFilterActive ? (
            <EmptyState className="py-16">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {Icon ? <Icon className="h-6 w-6" aria-hidden /> : <Inbox className="h-6 w-6" aria-hidden />}
              </span>
              <span className="font-medium text-foreground">{emptyText}</span>
              {emptyHintText && (
                <span className="max-w-sm text-sm text-muted-foreground">{emptyHintText}</span>
              )}
              {mayCreate && (
                <Button variant="primary" size="sm" onPress={openNew} className="mt-1">
                  <Plus size={14} /> {addText}
                </Button>
              )}
            </EmptyState>
          ) : (
            <EmptyState className="py-16">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <SearchX className="h-6 w-6" aria-hidden />
              </span>
              <span className="font-medium text-foreground">{t("common.crud.noMatches")}</span>
              {noMatchHint && (
                <span className="max-w-sm text-sm text-muted-foreground">{noMatchHint}</span>
              )}
              {anyFilterActive && (
                <Button variant="secondary" size="sm" onPress={forgetFilters} className="mt-1">
                  <X className="h-3.5 w-3.5" /> {t("common.crud.clearFilters")}
                </Button>
              )}
            </EmptyState>
          )
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content
                aria-label={title}
                sortDescriptor={sortDescriptor}
                onSortChange={(d) =>
                  setSort({
                    key: String(d.column),
                    dir: d.direction === "ascending" ? "asc" : "desc",
                  })
                }
              >
                <Table.Header>
                  {columns.map((c, i) => (
                    <Table.Column
                      key={c.key}
                      id={c.key}
                      isRowHeader={i === 0}
                      allowsSorting={c.sortable}
                      className={cn(c.align === "right" && "text-right", c.className)}
                    >
                      {({ sortDirection }) => (
                        <Table.SortableColumnHeader sortDirection={sortDirection}>
                          {c.label}
                        </Table.SortableColumnHeader>
                      )}
                    </Table.Column>
                  ))}

                  <Table.Column id="__actions" className="text-right">
                    <span className="sr-only">{t("common.crud.actions")}</span>
                  </Table.Column>
                </Table.Header>

                <Table.Body items={visible}>
                  {(row: T) => (
                    <Table.Row id={row.id}>
                      {[
                        ...columns.map((c) => (
                          <Table.Cell
                            key={c.key}
                            className={cn(c.align === "right" && "text-right", c.className)}
                          >
                            {c.render ? c.render(row) : String(get(row, c.key) ?? "—")}
                          </Table.Cell>
                        )),
                        <Table.Cell key="__actions">
                          <div className="rn-row-actions">
                            {extraRowActions?.(row, role)}
                            {updateMutation && (canEdit ? canEdit(role, row) : true) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                isIconOnly
                                onPress={() => openEdit(row)}
                                aria-label={fill(t("common.crud.editAria"), { label: title })}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {mayDelete && (
                              <Button
                                variant="danger-soft"
                                size="sm"
                                isIconOnly
                                onPress={() => setConfirmRow(row)}
                                isDisabled={deleting === row.id}
                                aria-label={fill(t("common.crud.deleteAria"), { label: title })}
                              >
                                {deleting === row.id ? (
                                  <Spinner size="sm" color="current" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                        </Table.Cell>,
                      ]}
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>

            {showTable && (
              <Table.Footer className="px-4 py-3">
                {clientFilterActive ? (
                  <span className="text-xs text-muted-foreground">
                    {fill(t("common.crud.matches"), { count: filtered.length })}
                    {rows.length >= SEARCH_LIMIT
                      ? ` ${fill(t("common.crud.matchesTruncated"), { limit: SEARCH_LIMIT })}`
                      : ""}
                  </span>
                ) : (
                  <div className="flex w-full flex-wrap items-center justify-between gap-2">
                    {sortTruncated && (
                      <span className="text-xs text-muted-foreground">
                        {fill(t("common.crud.sortTruncated"), { limit: SEARCH_LIMIT })}
                      </span>
                    )}
                    <Pagination
                      className="ml-auto"
                      page={page}
                      pageSize={PAGE_SIZE}
                      totalCount={wideFetch ? Math.min(totalCount, filtered.length) : totalCount}
                      onPageChange={setPage}
                      disabled={loading}
                    />
                  </div>
                )}
              </Table.Footer>
            )}
          </Table>
        )}
      </div>

      {modal && (
        <EntityModal
          key={`${modal.mode}-${modal.row?.id ?? "new"}`}
          title={
            modal.mode === "edit"
              ? (editTitle ?? t("common.crud.editRecord"))
              : (newTitle ?? t("common.crud.newRecord"))
          }
          fields={fields}
          initial={initialValues}
          busy={busy}
          serverError={formError}
          mode={modal.mode}
          preview={preview}
          validateForm={validateForm}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}

      {confirmRow && (
        <ConfirmDialog
          label={title.replace(/s$/, "").toLowerCase()}
          busy={deleting === confirmRow.id}
          onCancel={() => setConfirmRow(null)}
          onConfirm={() => handleDelete(confirmRow)}
        />
      )}
    </div>
  );
}
