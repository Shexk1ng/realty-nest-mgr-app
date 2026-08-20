"use client";

// Ekran prezentacji: terminy oglądania, operacje CRUD, wynik spotkania i ocena

import { CalendarClock } from "lucide-react";
import { CrudResource, type Column, type Field } from "@/components/dashboard/crud-resource";
import {
  ADD_VIEWING, DELETE_VIEWING, GET_VIEWINGS, UPDATE_VIEWING, type Viewing,
} from "@/lib/graphql/queries/viewings";
import { GET_PROPERTIES, type Property } from "@/lib/graphql/queries/properties";
import { GET_CONTACTS, type Contact } from "@/lib/graphql/queries/contacts";
import { StatusBadge, VIEWING_STATUS_COLORS } from "@/components/ui/status-badge";
import { ViewingPreview, ViewingStars } from "@/components/dashboard/viewing-preview";
import { toDateTimeInput } from "@/lib/dashboard-format";
import { useI18n } from "@/i18n/i18n-context";

const STATUS_VALUES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED", "RESCHEDULED"];

const OUTCOME_KEYS = [
  ["INTERESTED", "outInterested"],
  ["NOT_INTERESTED", "outNot"],
  ["OFFER_MADE", "outOffer"],
  ["FOLLOW_UP", "outFollowUp"],
  ["UNDECIDED", "outUndecided"],
] as const;

export default function ViewingsPage() {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-GB" : "pl-PL";

  const dt = (s: string | null | undefined) =>
    s ? new Date(s).toLocaleString(dateLocale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

  const statusOpts = STATUS_VALUES.map((v) => ({ value: v, label: t(`common.status.${v}`) }));
  const outcomeOpts = OUTCOME_KEYS.map(([value, key]) => ({ value, label: t(`dashboard.viewings.${key}`) }));

  const columns: Column<Viewing>[] = [
    { key: "shortId", label: "#", sortable: true, render: (r) => <span className="font-mono text-xs text-muted-foreground">#{r.shortId}</span> },
    { key: "scheduledAt", label: t("dashboard.viewings.colWhen"), sortable: true, accessor: (r) => r.scheduledAt, render: (r) => dt(r.scheduledAt) },
    {
      key: "propertyTitle",
      label: t("dashboard.viewings.colProperty"),
      sortable: true,
      accessor: (r) => r.propertyTitle ?? "",
      render: (r) => (
        <div className="min-w-0">
          <div className="cell-truncate font-medium text-foreground">{r.propertyTitle ?? "—"}</div>
          {r.propertyLocation && <div className="cell-truncate text-xs text-muted-foreground">{r.propertyLocation}</div>}
        </div>
      ),
    },
    {
      key: "contactName",
      label: t("dashboard.viewings.colContact"),
      sortable: true,
      accessor: (r) => r.contactName ?? "",
      render: (r) => (
        <div className="min-w-0">
          <div className="cell-truncate">{r.contactName ?? "—"}</div>
          {r.contactPhone && <div className="cell-truncate text-xs text-muted-foreground">{r.contactPhone}</div>}
        </div>
      ),
    },
    { key: "agentName", label: t("dashboard.viewings.colAgent"), sortable: true, accessor: (r) => r.agentName ?? "", render: (r) => r.agentName ?? "—" },
    { key: "durationMin", label: t("dashboard.viewings.colDuration"), align: "right", render: (r) => (r.durationMin ? `${r.durationMin} min` : "—") },
    { key: "status", label: t("dashboard.viewings.colStatus"), sortable: true, render: (r) => <StatusBadge value={r.status} colorMap={VIEWING_STATUS_COLORS} /> },
    { key: "outcome", label: t("dashboard.viewings.colOutcome"), filter: "select", filterOptions: outcomeOpts, render: (r) => outcomeOpts.find((o) => o.value === r.outcome)?.label ?? "—" },
    { key: "rating", label: t("dashboard.viewings.colRating"), align: "right", render: (r) => (r.rating ? <ViewingStars value={r.rating} /> : "—") },
    {
      key: "feedback",
      label: t("dashboard.viewings.colFeedback"),
      render: (r) => (r.feedback ? <span className="cell-truncate text-muted-foreground">{r.feedback}</span> : "—"),
    },
  ];

  const fields: Field[] = [
    { name: "scheduledAt", label: t("dashboard.viewings.fieldWhen"), type: "datetime", required: true },
    { name: "durationMin", label: t("dashboard.viewings.fieldDuration"), type: "number", min: 5, max: 480 },
    { name: "status", label: t("dashboard.viewings.colStatus"), type: "select", options: statusOpts },
    { name: "outcome", label: t("dashboard.viewings.colOutcome"), type: "select", options: [{ value: "", label: "—" }, ...outcomeOpts] },
    { name: "rating", label: t("dashboard.viewings.fieldRating"), type: "number", min: 1, max: 5, step: 1 },
    {
      name: "propertyId",
      label: t("dashboard.common.propertyId"),
      type: "reference",
      required: true,
      hint: t("dashboard.viewings.hintProperty"),
      refQuery: GET_PROPERTIES,
      refRoot: "getProperties",
      refLabel: (row) => (row as Property).title,
      refLabelFrom: "propertyTitle",
    },
    {
      name: "contactId",
      label: t("dashboard.common.contactId"),
      type: "reference",
      refQuery: GET_CONTACTS,
      refRoot: "getContacts",
      refLabel: (row) => (row as Contact).name,
      refLabelFrom: "contactName",
    },
    { name: "followUpAt", label: t("dashboard.viewings.fieldFollowUp"), type: "datetime" },
    { name: "feedback", label: t("dashboard.viewings.colFeedback"), type: "textarea", full: true },
  ];

  return (
    <CrudResource<Viewing>
      title={t("dashboard.viewings.title")}
      description={t("dashboard.viewings.description")}
      icon={CalendarClock}
      addLabel={t("dashboard.viewings.add")}
      newTitle={t("dashboard.viewings.newTitle")}
      editTitle={t("dashboard.viewings.editTitle")}
      emptyLabel={t("dashboard.viewings.empty")}
      emptyHintKey="dashboard.viewings.emptyHint"
      searchPlaceholder={t("dashboard.viewings.search")}
      query={GET_VIEWINGS}
      queryRoot="getViewings"
      createMutation={ADD_VIEWING}
      updateMutation={UPDATE_VIEWING}
      deleteMutation={DELETE_VIEWING}
      columns={columns}
      fields={fields}
      defaults={{ status: "SCHEDULED", durationMin: 30 }}
      toForm={(r) => ({
        scheduledAt: toDateTimeInput(r.scheduledAt),
        durationMin: r.durationMin,
        status: r.status,
        outcome: r.outcome ?? "",
        rating: r.rating ?? "",
        propertyId: r.propertyId,
        contactId: r.contactId ?? "",
        followUpAt: toDateTimeInput(r.followUpAt),
        feedback: r.feedback ?? "",
        shortId: r.shortId,
        propertyTitle: r.propertyTitle ?? "",
        propertyLocation: r.propertyLocation ?? "",
        propertyImageUrl: r.propertyImageUrl ?? "",
        contactName: r.contactName ?? "",
        contactEmail: r.contactEmail ?? "",
        contactPhone: r.contactPhone ?? "",
        agentName: r.agentName ?? "",
        agentAvatarUrl: r.agentAvatarUrl ?? "",
      })}
      preview={(values, mode) => (
        <ViewingPreview
          values={values}
          mode={mode}
          outcomeLabel={outcomeOpts.find((o) => o.value === values.outcome)?.label ?? null}
        />
      )}
      searchKeys={["propertyTitle", "contactName", "agentName"]}
      statusKey="status"
      statusOptions={STATUS_VALUES}
      defaultSort={{ key: "scheduledAt", dir: "desc" }}
    />
  );
}
