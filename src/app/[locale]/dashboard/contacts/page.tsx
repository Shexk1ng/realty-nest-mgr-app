"use client";

// Ekran kontaktów: lista z filtrami, operacje CRUD, podgląd i akcje RODO

import { Users } from "lucide-react";
import { CrudResource, type Column, type Field } from "@/components/dashboard/crud-resource";
import {
  ADD_CONTACT,
  DELETE_CONTACT,
  GET_CONTACTS,
  UPDATE_CONTACT,
  type Contact,
} from "@/lib/graphql/queries/contacts";
import { StatusBadge, CONTACT_KIND_COLORS } from "@/components/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { ContactGdprActions } from "@/components/dashboard/contact-gdpr-actions";
import { ContactPreview } from "@/components/dashboard/contact-preview";
import { CopyValue } from "@/components/ui/copy-value";
import { useI18n } from "@/i18n/i18n-context";

const KIND_VALUES = ["CLIENT", "PARTNER", "VENDOR", "COLLEAGUE"];
const SOURCE_VALUES = ["PORTAL", "REFERRAL", "DIRECT", "SOCIAL", "AGENCY"];

const sourceLabel = (t: (k: string) => string, v: string) =>
  SOURCE_VALUES.includes(v) ? t(`dashboard.contacts.src${v}`) : v;

const kindOpts = (t: (k: string) => string) =>
  KIND_VALUES.map((v) => ({ value: v, label: t(`common.status.${v}`) }));
const sourceOpts = (t: (k: string) => string) =>
  SOURCE_VALUES.map((v) => ({ value: v, label: sourceLabel(t, v) }));

function buildColumns(t: (k: string) => string, locale: string): Column<Contact>[] {
  const dateLocale = locale === "en" ? "en-GB" : "pl-PL";
  return [
  {
    key: "name",
    label: t("dashboard.contacts.colClient"),
    sortable: true,
    render: (r) => (
      <div className="flex items-center gap-3">
        <Avatar name={r.name} size={36} className="rounded-xl" />
        <div className="min-w-0">
          <p className="cell-truncate font-medium text-foreground">{r.name}</p>
          <p className="text-[11px] text-muted-foreground">#{r.shortId}</p>
        </div>
      </div>
    ),
  },
  { key: "role", label: t("dashboard.contacts.colRole"), sortable: true, render: (r) => r.role || "—" },
  {
    key: "kind",
    label: t("dashboard.contacts.colKind"),
    sortable: true,
    render: (r) => <StatusBadge colorMap={CONTACT_KIND_COLORS} value={r.kind} />,
  },
  {
    key: "email",
    label: t("dashboard.contacts.colEmail"),
    render: (r) =>
      r.email ? <CopyValue value={r.email} label={t("dashboard.contacts.colEmail")} /> : "—",
  },
  {
    key: "phone",
    label: t("dashboard.contacts.colPhone"),
    render: (r) =>
      r.phone ? <CopyValue value={r.phone} label={t("dashboard.contacts.colPhone")} /> : "—",
  },
  {
    key: "source", label: t("dashboard.contacts.colSource"), sortable: true, filter: "select",
    filterOptions: sourceOpts(t),
    render: (r) => (r.source ? sourceLabel(t, r.source) : "—"),
  },
  {
    key: "consentGivenAt",
    label: t("dashboard.contacts.colConsent"),
    sortable: true,
    filter: "select",
    filterOptions: [
      { value: "tak", label: t("dashboard.contacts.consentGiven") },
      { value: "nie", label: t("dashboard.contacts.consentNone") },
    ],
    accessor: (r) => (r.consentGivenAt ? "tak" : "nie"),
    render: (r) =>
      r.consentGivenAt ? (
        <span
          className="rn-badge rn-badge--green"
          title={t("dashboard.contacts.consentGivenOn").replace(
            "{date}",
            new Date(r.consentGivenAt).toLocaleDateString(dateLocale),
          )}
        >
          {new Date(r.consentGivenAt).toLocaleDateString(dateLocale)}
        </span>
      ) : (
        <span className="rn-badge chip-hue--slate">{t("dashboard.contacts.consentNone")}</span>
      ),
  },
  {
    key: "notes",
    label: t("dashboard.common.notes"),
    render: (r) => (r.notes ? <span className="cell-truncate text-muted-foreground">{r.notes}</span> : "—"),
  },
  ];
}

function buildFields(t: (k: string) => string): Field[] {
  return [
  { name: "name", label: t("dashboard.contacts.fieldName"), type: "text", required: true },
  { name: "kind", label: t("dashboard.contacts.colKind"), type: "select", options: kindOpts(t) },
  { name: "email", label: t("dashboard.contacts.colEmail"), type: "email" },
  { name: "phone", label: t("dashboard.contacts.colPhone"), type: "text" },
  { name: "role", label: t("dashboard.contacts.colRole"), type: "text", placeholder: t("dashboard.contacts.fieldRolePlaceholder") },
  { name: "source", label: t("dashboard.contacts.colSource"), type: "select", options: [{ value: "", label: "—" }, ...sourceOpts(t)] },
  {
    name: "consent",
    label: t("dashboard.contacts.colConsent"),
    type: "boolean",
    hint: t("dashboard.contacts.hintConsent"),
  },
  { name: "notes", label: t("dashboard.common.notes"), type: "textarea", full: true },
  ];
}

export default function DashboardContactsPage() {
  const { t, locale } = useI18n();
  const columns = buildColumns(t, locale);
  const fields = buildFields(t);

  return (
    <CrudResource<Contact>
      title={t("dashboard.contacts.title")}
      description={t("dashboard.contacts.description")}
      icon={Users}
      addLabel={t("dashboard.contacts.add")}
      newTitle={t("dashboard.contacts.newTitle")}
      editTitle={t("dashboard.contacts.editTitle")}
      emptyLabel={t("dashboard.contacts.empty")}
      emptyHintKey="dashboard.contacts.emptyHint"
      query={GET_CONTACTS}
      queryRoot="getContacts"
      createMutation={ADD_CONTACT}
      updateMutation={UPDATE_CONTACT}
      deleteMutation={DELETE_CONTACT}
      columns={columns}
      fields={fields}
      extraRowActions={(r) => <ContactGdprActions contactId={r.id} shortId={r.shortId} />}
      preview={(values, mode) => <ContactPreview values={values} mode={mode} />}
      toForm={(r) => ({
        name: r.name,
        kind: r.kind,
        email: r.email ?? "",
        phone: r.phone ?? "",
        role: r.role ?? "",
        source: r.source ?? "",
        consent: Boolean(r.consentGivenAt),
        notes: r.notes ?? "",
        shortId: r.shortId,
        consentGivenAt: r.consentGivenAt ?? "",
      })}
      defaults={{ kind: "CLIENT" }}
      searchKeys={["name", "email", "role"]}
      searchPlaceholder={t("dashboard.contacts.search")}
      statusKey="kind"
      statusOptions={KIND_VALUES}
      defaultSort={{ key: "shortId", dir: "desc" }}
    />
  );
}
