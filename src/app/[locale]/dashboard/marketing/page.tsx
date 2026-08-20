"use client";

// Ekran kampanii marketingowych: lista, operacje CRUD i generator treści promocyjnych

import { Megaphone } from "lucide-react";
import { CrudResource, type Column, type Field } from "@/components/dashboard/crud-resource";
import {
  ADD_CAMPAIGN,
  DELETE_CAMPAIGN,
  GET_CAMPAIGNS,
  UPDATE_CAMPAIGN,
  type Campaign,
} from "@/lib/graphql/queries/campaigns";
import { GET_ENQUIRIES, type Enquiry } from "@/lib/graphql/queries/enquiries";
import { fmtDate, fmtMoney, fmtNumber, toDateInput } from "@/lib/dashboard-format";
import { StatusBadge, MARKETING_STATUS_COLORS } from "@/components/ui/status-badge";
import { useI18n } from "@/i18n/i18n-context";
import { AgentMarketingCard } from "@/components/dashboard/agent-marketing-card";
import { MarketingGenerator } from "@/components/dashboard/marketing-generator";
import { CampaignPreview } from "@/components/dashboard/campaign-preview";

const STATUS_OPTIONS = ["ACTIVE", "PAUSED", "ENDED", "DRAFT"];
const CHANNEL_OPTIONS = ["EMAIL", "SOCIAL", "PORTAL", "SEARCH", "DIRECT"];

const channelLabel = (t: (k: string) => string, v: string) => t(`dashboard.marketing.ch${v}`);
const statusOpts = (t: (k: string) => string) =>
  STATUS_OPTIONS.map((v) => ({ value: v, label: t(`common.status.${v}`) }));
const channelOpts = (t: (k: string) => string) =>
  CHANNEL_OPTIONS.map((v) => ({ value: v, label: channelLabel(t, v) }));

function buildColumns(t: (k: string) => string): Column<Campaign>[] {
  return [
  {
    key: "name",
    label: t("dashboard.marketing.colCampaign"),
    sortable: true,
    render: (r) => (
      <div className="min-w-0">
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="text-[11px] text-muted-foreground">{channelLabel(t, r.channel)}</p>
      </div>
    ),
  },
  {
    key: "status",
    label: t("dashboard.tasks.colStatus"),
    sortable: true,
    render: (r) => <StatusBadge colorMap={MARKETING_STATUS_COLORS} value={r.status} />,
  },
  { key: "budget", label: t("dashboard.marketing.colBudget"), sortable: true, align: "right", render: (r) => fmtMoney(r.budget) },
  { key: "spent", label: t("dashboard.marketing.colSpent"), sortable: true, align: "right", render: (r) => fmtMoney(r.spent) },
  { key: "leads", label: t("dashboard.marketing.colLeads"), sortable: true, align: "right", render: (r) => fmtNumber(r.leads) },
  { key: "startDate", label: t("dashboard.marketing.colStart"), sortable: true, render: (r) => fmtDate(r.startDate) },
  {
    key: "enquiryName",
    label: t("dashboard.marketing.colEnquiry"),
    render: (r) => r.enquiryName ? <span className="cell-truncate text-muted-foreground">{r.enquiryName}</span> : "—",
  },
  ];
}

function buildFields(t: (k: string) => string): Field[] {
  return [
  { name: "name", label: t("dashboard.marketing.fieldName"), type: "text", required: true, full: true },
  { name: "channel", label: t("dashboard.marketing.fieldChannel"), type: "select", options: channelOpts(t) },
  { name: "status", label: t("dashboard.tasks.colStatus"), type: "select", options: statusOpts(t) },
  { name: "budget", label: t("dashboard.marketing.fieldBudget"), type: "number", min: 0 },
  { name: "spent", label: t("dashboard.marketing.fieldSpent"), type: "number", min: 0 },
  { name: "impressions", label: t("dashboard.marketing.fieldImpressions"), type: "number", min: 0 },
  { name: "clicks", label: t("dashboard.marketing.fieldClicks"), type: "number", min: 0 },
  { name: "leads", label: t("dashboard.marketing.colLeads"), type: "number", min: 0 },
  { name: "startDate", label: t("dashboard.marketing.fieldStart"), type: "date", required: true },
  { name: "endDate", label: t("dashboard.marketing.fieldEnd"), type: "date" },
  {
    name: "enquiryId",
    label: t("dashboard.marketing.fieldEnquiry"),
    type: "reference",
    hint: t("dashboard.marketing.hintEnquiry"),
    refQuery: GET_ENQUIRIES,
    refRoot: "getEnquiries",
    refLabel: (row) => (row as Enquiry).name,
  },
  ];
}

export default function DashboardMarketingPage() {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const columns = buildColumns(t);
  const fields = buildFields(t);

  return (
    <>
    <AgentMarketingCard />
    <MarketingGenerator />
    <CrudResource<Campaign>
      title={t("dashboard.marketing.title")}
      description={t("dashboard.marketing.description")}
      icon={Megaphone}
      addLabel={t("dashboard.marketing.add")}
      newTitle={t("dashboard.marketing.newTitle")}
      editTitle={t("dashboard.marketing.editTitle")}
      emptyLabel={t("dashboard.marketing.empty")}
      query={GET_CAMPAIGNS}
      queryRoot="getCampaigns"
      createMutation={ADD_CAMPAIGN}
      updateMutation={UPDATE_CAMPAIGN}
      deleteMutation={DELETE_CAMPAIGN}
      columns={columns}
      fields={fields}
      defaults={{ channel: "DIRECT", status: "DRAFT" }}
      validateForm={(values): Record<string, string> => {
        const start = String(values.startDate ?? "");
        const end = String(values.endDate ?? "");
        if (start && end && end < start) {
          return { endDate: tf("dashboard.marketing.errorEndBeforeStart", "Data zakończenia nie może być wcześniejsza niż data startu.") };
        }
        return {};
      }}
      toForm={(r) => ({
        shortId: r.shortId,
        enquiryName: r.enquiryName ?? "",
        name: r.name,
        channel: r.channel,
        status: r.status,
        budget: r.budget ?? "",
        spent: r.spent ?? "",
        impressions: r.impressions ?? "",
        clicks: r.clicks ?? "",
        leads: r.leads ?? "",
        startDate: toDateInput(r.startDate),
        endDate: toDateInput(r.endDate),
        enquiryId: r.enquiryId ?? "",
      })}
      searchKeys={["name", "channel"]}
      searchPlaceholder={t("dashboard.marketing.search")}
      statusKey="status"
      statusOptions={STATUS_OPTIONS}
      defaultSort={{ key: "shortId", dir: "desc" }}
      preview={(values, mode) => (
        <CampaignPreview
          values={values}
          mode={mode}
          channelLabel={(v) => channelLabel(t, v)}
        />
      )}
    />
    </>
  );
}
