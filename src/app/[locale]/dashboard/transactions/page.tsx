"use client";

// Ekran transakcji: lista, operacje CRUD i lista kontrolna wymogów prawnych obrotu

import { Receipt } from "lucide-react";
import { CrudResource, type Column, type Field } from "@/components/dashboard/crud-resource";
import {
  ADD_TRANSACTION, DELETE_TRANSACTION, GET_TRANSACTIONS, UPDATE_TRANSACTION, type Transaction,
} from "@/lib/graphql/queries/transactions";
import { GET_PROPERTIES, type Property } from "@/lib/graphql/queries/properties";
import { StatusBadge, TRANSACTION_STATUS_COLORS } from "@/components/ui/status-badge";
import type { ChecklistCatalogueItem } from "@/components/ui/checklist-field";
import { TransactionPreview } from "@/components/dashboard/transaction-preview";
import { toDateInput } from "@/lib/dashboard-format";
import { useI18n } from "@/i18n/i18n-context";

const LEGAL_CHECKLIST_KEYS: { key: string; tk: string; hint: boolean }[] = [
  { key: "kw", tk: "chkKw", hint: true },
  { key: "wlasnosc", tk: "chkTitle", hint: true },
  { key: "energetyka", tk: "chkEnergy", hint: true },
  { key: "zaleglosci", tk: "chkArrears", hint: true },
  { key: "zameldowanie", tk: "chkResidents", hint: false },
  { key: "plan", tk: "chkZoning", hint: true },
  { key: "przedwstepna", tk: "chkPreliminary", hint: true },
  { key: "notarialny", tk: "chkDeed", hint: true },
  { key: "protokol", tk: "chkHandover", hint: true },
  { key: "pcc", tk: "chkTax", hint: false },
  { key: "rodo", tk: "chkGdpr", hint: true },
];

function buildChecklist(t: (k: string) => string): ChecklistCatalogueItem[] {
  return LEGAL_CHECKLIST_KEYS.map((c) => ({
    key: c.key,
    label: t(`dashboard.transactions.${c.tk}`),
    hint: c.hint ? t(`dashboard.transactions.${c.tk}Hint`) : undefined,
  }));
}

const KIND_VALUES = ["SALE", "RENT", "LEASE"];
const STATUS_VALUES = ["DRAFT", "PENDING", "COMPLETED", "CANCELLED", "REFUNDED"];

const kindLabel = (t: (k: string) => string, v: string) => t(`dashboard.transactions.kind${v}`);
const kindOpts = (t: (k: string) => string) =>
  KIND_VALUES.map((v) => ({ value: v, label: kindLabel(t, v) }));
const statusOpts = (t: (k: string) => string) =>
  STATUS_VALUES.map((v) => ({ value: v, label: t(`common.status.${v}`) }));

const money = (n: number | null | undefined, cur = "PLN") =>
  n == null ? "—" : `${Math.round(n).toLocaleString("pl-PL")} ${cur}`;

const doneCount = (r: Transaction) => {
  const done = new Set((r.checklist ?? []).filter((c) => c.done).map((c) => c.key));
  return LEGAL_CHECKLIST_KEYS.filter((c) => done.has(c.key)).length;
};

function buildColumns(t: (k: string) => string, locale: string): Column<Transaction>[] {
  return [
  { key: "shortId", label: "#", sortable: true, render: (r) => <span className="font-mono text-xs text-muted-foreground">#{r.shortId}</span> },
  {
    key: "kind",
    label: t("dashboard.transactions.colKind"),
    sortable: true,
    filter: "select",
    filterOptions: kindOpts(t),
    render: (r) => (KIND_VALUES.includes(r.kind) ? kindLabel(t, r.kind) : r.kind),
  },
  { key: "status", label: t("dashboard.transactions.colStatus"), sortable: true, render: (r) => <StatusBadge value={r.status} colorMap={TRANSACTION_STATUS_COLORS} /> },
  {
    key: "propertyTitle",
    label: t("dashboard.transactions.colProperty"),
    sortable: true,
    accessor: (r) => r.propertyTitle ?? "",
    render: (r) => (
      <div className="min-w-0">
        <div className="cell-truncate font-medium text-foreground">{r.propertyTitle ?? "—"}</div>
        {r.propertyLocation && <div className="cell-truncate text-xs text-muted-foreground">{r.propertyLocation}</div>}
      </div>
    ),
  },
  { key: "price", label: t("dashboard.transactions.colPrice"), sortable: true, align: "right", accessor: (r) => r.price, render: (r) => <span className="font-semibold tabular-nums">{money(r.price, r.currency)}</span> },
  {
    key: "deposit",
    label: t("dashboard.transactions.colDeposit"),
    align: "right",
    sortable: true,
    accessor: (r) => r.deposit ?? 0,
    render: (r) => <span className="tabular-nums text-muted-foreground">{r.deposit ? money(r.deposit, r.currency) : "—"}</span>,
  },
  { key: "buyerName", label: t("dashboard.transactions.colBuyer"), render: (r) => r.buyerName || "—" },
  { key: "sellerName", label: t("dashboard.transactions.colSeller"), render: (r) => r.sellerName || "—" },
  { key: "agentName", label: t("dashboard.transactions.colAgent"), sortable: true, accessor: (r) => r.agentName ?? "", render: (r) => r.agentName ?? "—" },
  { key: "signedAt", label: t("dashboard.transactions.colSigned"), sortable: true, render: (r) => (r.signedAt ? new Date(r.signedAt).toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL") : "—") },
  {
    key: "checklist",
    label: t("dashboard.transactions.colChecklist"),
    sortable: true,
    filter: "select",
    filterOptions: [
      { value: "komplet", label: t("dashboard.transactions.filterComplete") },
      { value: "w toku", label: t("dashboard.transactions.filterPartial") },
      { value: "brak", label: t("dashboard.transactions.filterNone") },
    ],
    accessor: (r) => {
      const done = doneCount(r);
      return done === 0 ? "brak" : done === LEGAL_CHECKLIST_KEYS.length ? "komplet" : "w toku";
    },
    render: (r) => {
      const done = doneCount(r);
      const total = LEGAL_CHECKLIST_KEYS.length;
      const hue = done === total ? "green" : done === 0 ? "slate" : "amber";
      return (
        <span
          className={`rn-badge chip-hue--${hue}`}
          title={t("dashboard.transactions.checklistProgress").replace("{done}", String(done)).replace("{total}", String(total))}
        >
          {done}/{total}
        </span>
      );
    },
  },
  ];
}

function buildFields(t: (k: string) => string): Field[] {
  return [
  { name: "kind", label: t("dashboard.transactions.colKind"), type: "select", options: kindOpts(t) },
  { name: "status", label: t("dashboard.transactions.colStatus"), type: "select", options: statusOpts(t) },
  { name: "price", label: t("dashboard.transactions.colPrice"), type: "number", required: true, min: 0 },
  { name: "currency", label: t("dashboard.transactions.fieldCurrency"), type: "text", placeholder: "PLN", maxLength: 3 },
  { name: "deposit", label: t("dashboard.transactions.colDeposit"), type: "number", min: 0 },
  {
    name: "propertyId",
    label: t("dashboard.common.propertyId"),
    type: "reference",
    required: true,
    hint: t("dashboard.transactions.hintProperty"),
    refQuery: GET_PROPERTIES,
    refRoot: "getProperties",
    refLabel: (row) => (row as Property).title,
    refLabelFrom: "propertyTitle",
  },
  { name: "buyerName", label: t("dashboard.transactions.colBuyer"), type: "text" },
  { name: "sellerName", label: t("dashboard.transactions.colSeller"), type: "text" },
  { name: "signedAt", label: t("dashboard.transactions.fieldSignedAt"), type: "date" },
  { name: "closedAt", label: t("dashboard.transactions.fieldClosedAt"), type: "date" },
  { name: "notes", label: t("dashboard.common.notes"), type: "textarea", full: true },
  {
    name: "checklist",
    label: t("dashboard.transactions.fieldChecklist"),
    type: "checklist",
    checklistItems: buildChecklist(t),
    full: true,
    hint: t("dashboard.transactions.hintChecklist"),
  },
  ];
}

export default function TransactionsPage() {
  const { t, locale } = useI18n();
  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const columns = buildColumns(t, locale);
  const fields = buildFields(t);
  const checklistCatalogue = buildChecklist(t);

  return (
    <CrudResource<Transaction>
      title={t("dashboard.transactions.title")}
      description={t("dashboard.transactions.description")}
      icon={Receipt}
      addLabel={t("dashboard.transactions.add")}
      newTitle={t("dashboard.transactions.newTitle")}
      editTitle={t("dashboard.transactions.editTitle")}
      emptyLabel={t("dashboard.transactions.empty")}
      query={GET_TRANSACTIONS}
      queryRoot="getTransactions"
      createMutation={ADD_TRANSACTION}
      updateMutation={UPDATE_TRANSACTION}
      deleteMutation={DELETE_TRANSACTION}
      columns={columns}
      fields={fields}
      preview={(values, mode) => (
        <TransactionPreview
          values={values}
          mode={mode}
          catalogue={checklistCatalogue}
          kindLabel={(v) => (KIND_VALUES.includes(v) ? kindLabel(t, v) : v)}
        />
      )}
      toForm={(r) => ({
        kind: r.kind,
        status: r.status,
        price: r.price,
        currency: r.currency ?? "PLN",
        deposit: r.deposit ?? "",
        propertyId: r.propertyId,
        propertyTitle: r.propertyTitle ?? "",
        buyerName: r.buyerName ?? "",
        sellerName: r.sellerName ?? "",
        signedAt: toDateInput(r.signedAt),
        closedAt: toDateInput(r.closedAt),
        notes: r.notes ?? "",
        checklist: (r.checklist ?? []).map((c) => ({ key: c.key, label: c.label, done: c.done })),
      })}
      defaults={{ kind: "SALE", status: "DRAFT", currency: "PLN" }}
      validateForm={(values): Record<string, string> => {
        const signed = String(values.signedAt ?? "");
        const closed = String(values.closedAt ?? "");
        if (signed && closed && closed < signed) {
          return { closedAt: tf("dashboard.transactions.errorClosedBeforeSigned", "Data zamknięcia nie może być wcześniejsza niż data podpisania.") };
        }
        return {};
      }}
      searchKeys={["propertyTitle", "buyerName", "sellerName", "agentName"]}
      searchPlaceholder={t("dashboard.transactions.search")}
      statusKey="status"
      statusOptions={STATUS_VALUES}
      defaultSort={{ key: "shortId", dir: "desc" }}
    />
  );
}
