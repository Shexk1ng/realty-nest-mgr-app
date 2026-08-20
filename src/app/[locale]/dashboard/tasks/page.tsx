"use client";

// Ekran zadań: lista z filtrami statusu i priorytetu, operacje CRUD oraz podgląd

import { ListChecks } from "lucide-react";
import { CrudResource, type Column, type Field } from "@/components/dashboard/crud-resource";
import {
  ADD_TASK, DELETE_TASK, GET_TASKS, UPDATE_TASK, type Task,
} from "@/lib/graphql/queries/tasks";
import { GET_PROPERTIES, type Property } from "@/lib/graphql/queries/properties";
import { GET_CONTACTS, type Contact } from "@/lib/graphql/queries/contacts";
import { StatusBadge, TASK_STATUS_COLORS, TASK_PRIORITY_COLORS } from "@/components/ui/status-badge";
import { TaskPreview } from "@/components/dashboard/task-preview";
import { useI18n } from "@/i18n/i18n-context";

const STATUS_VALUES = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED", "CANCELLED"];
const PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function TasksPage() {
  const { t, locale } = useI18n();

  const opts = (values: string[]) =>
    values.map((v) => ({ value: v, label: t(`common.status.${v}`) }));

  const columns: Column<Task>[] = [
    {
      key: "title", label: t("dashboard.tasks.colTask"), sortable: true,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.title}</p>
          <p className="text-[11px] text-muted-foreground">#{r.shortId}</p>
        </div>
      ),
    },
    {
      key: "status", label: t("dashboard.tasks.colStatus"), sortable: true,
      render: (r) => <StatusBadge value={r.status} colorMap={TASK_STATUS_COLORS} />,
    },
    {
      key: "priority", label: t("dashboard.tasks.colPriority"), sortable: true,
      filter: "select", filterOptions: opts(PRIORITY_VALUES),
      render: (r) => <StatusBadge value={r.priority} colorMap={TASK_PRIORITY_COLORS} />,
    },
    {
      key: "dueAt", label: t("dashboard.tasks.colDue"), sortable: true,
      accessor: (r) => r.dueAt ?? "",
      render: (r) => (r.dueAt ? new Date(r.dueAt).toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL") : "—"),
    },
  ];

  const fields: Field[] = [
    { name: "title", label: t("dashboard.tasks.fieldTitle"), type: "text", required: true, full: true },
    { name: "status", label: t("dashboard.tasks.fieldStatus"), type: "select", options: opts(STATUS_VALUES) },
    { name: "priority", label: t("dashboard.tasks.fieldPriority"), type: "select", options: opts(PRIORITY_VALUES) },
    { name: "dueAt", label: t("dashboard.tasks.fieldDue"), type: "datetime" },
    {
      name: "propertyId",
      label: t("dashboard.common.propertyId"),
      type: "reference",
      refQuery: GET_PROPERTIES,
      refRoot: "getProperties",
      refLabel: (row) => (row as Property).title,
    },
    {
      name: "contactId",
      label: t("dashboard.common.contactId"),
      type: "reference",
      refQuery: GET_CONTACTS,
      refRoot: "getContacts",
      refLabel: (row) => (row as Contact).name,
    },
    { name: "description", label: t("dashboard.tasks.fieldNotes"), type: "textarea", full: true },
  ];

  return (
    <CrudResource<Task>
      title={t("dashboard.tasks.title")}
      description={t("dashboard.tasks.description")}
      icon={ListChecks}
      addLabel={t("dashboard.tasks.add")}
      newTitle={t("dashboard.tasks.newTitle")}
      editTitle={t("dashboard.tasks.editTitle")}
      emptyLabel={t("dashboard.tasks.empty")}
      emptyHintKey="dashboard.tasks.emptyHint"
      searchPlaceholder={t("dashboard.tasks.search")}
      query={GET_TASKS}
      queryRoot="getTasks"
      createMutation={ADD_TASK}
      updateMutation={UPDATE_TASK}
      deleteMutation={DELETE_TASK}
      columns={columns}
      fields={fields}
      defaults={{ status: "TODO", priority: "MEDIUM" }}
      searchKeys={["title"]}
      statusKey="status"
      statusOptions={STATUS_VALUES}
      defaultSort={{ key: "shortId", dir: "desc" }}
      preview={(values, mode) => <TaskPreview values={values} mode={mode} />}
    />
  );
}
