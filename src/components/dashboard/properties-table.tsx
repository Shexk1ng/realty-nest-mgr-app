"use client";

// Zestawienie ofert nieruchomości z miniaturami, stronicowaniem i usuwaniem rekordów

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { useSession } from "next-auth/react";
import { roleIs } from "@/lib/roles";
import { Building2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@heroui/react";
import {
  DELETE_PROPERTY,
  GET_PROPERTIES,
  type Property,
} from "@/lib/graphql/queries/properties";
import {
  formatArea,
  formatPrice,
  PROPERTY_TYPES,
  STATUSES,
  statusBadgeClass,
} from "@/lib/property-options";
import { PropertyPreviewCompact } from "@/components/dashboard/property-preview";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/dashboard/crud-resource";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/i18n/i18n-context";

function Thumb({ property }: { property: Property }) {
  const cover = property.imageUrl || property.images?.[0];
  return (
    <div className="rn-hovercard">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="rn-thumb" loading="lazy" />
      ) : (
        <div className="rn-thumb rn-thumb--empty"><Building2 size={18} /></div>
      )}
      <div className="rn-hovercard__pop">
        <PropertyPreviewCompact property={property} />
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

type Translate = (key: string) => string;

function buildColumns(
  t: Translate,
  locale: string,
): DataTableColumn<Property>[] {
  return [
    {
      key: "title",
      header: t("dashboard.properties.colProperty"),
      sortable: true,
      filter: "text",
      filterPlaceholder: t("dashboard.properties.searchTitle"),
      accessor: (p) => p.title,
      minWidth: "260px",
      render: (p) => (
        <div className="prop-cell">
          <Thumb property={p} />
          <div style={{ minWidth: 0 }}>
            <div className="prop-addr">{p.title}</div>
            <div className="prop-sub">
              #{p.shortId}
              {p.area  != null && <> · {formatArea(p.area)}</>}
              {p.rooms != null && <> · {p.rooms} {t("dashboard.properties.roomsShort")}</>}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: t("dashboard.properties.colLocation"),
      sortable: true,
      filter: "text",
      filterPlaceholder: t("dashboard.properties.searchLocation"),
      accessor: (p) => p.location ?? p.address?.city,
      render: (p) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-3)", fontSize: 12 }}>
          <MapPin size={11} /> {p.location}
        </span>
      ),
    },
    {
      key: "propertyType",
      header: t("dashboard.properties.colType"),
      sortable: true,
      filter: "select",
      filterOptions: PROPERTY_TYPES.map((o) => ({
        value: o.value,
        label: t(`dashboard.properties.type.${o.value}`),
      })),
      accessor: (p) => p.propertyType,
      render: (p) => (
        <span style={{ color: "var(--text-3)", fontSize: 12 }}>
          {p.propertyType ? t(`dashboard.properties.type.${p.propertyType}`) : "—"}
        </span>
      ),
    },
    {
      key: "price",
      header: t("dashboard.properties.colPrice"),
      sortable: true,
      align: "right",
      accessor: (p) => p.price ?? 0,
      render: (p) => (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
            {formatPrice(p.price, true)}
          </div>
          {p.pricePerM2 != null && (
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-4)" }}>
              {formatPrice(p.pricePerM2)}/m²
            </div>
          )}
        </div>
      ),
    },
    {
      key: "ownerAgentName",
      header: t("dashboard.properties.colAgent"),
      sortable: true,
      accessor: (p) => p.ownerAgentName ?? "",
      render: (p) => (
        <span style={{ color: "var(--text-3)", fontSize: 12 }}>{p.ownerAgentName ?? "—"}</span>
      ),
    },
    {
      key: "createdAt",
      header: t("dashboard.properties.colAdded"),
      sortable: true,
      accessor: (p) => p.createdAt ?? "",
      render: (p) => {
        if (!p.createdAt) return <span style={{ color: "var(--text-4)" }}>—</span>;
        const d = new Date(p.createdAt);
        if (Number.isNaN(d.getTime())) return <span style={{ color: "var(--text-4)" }}>—</span>;
        const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
        return (
          <div style={{ fontSize: 12, whiteSpace: "nowrap" }}>
            <div style={{ color: "var(--text-3)" }}>
              {d.toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL")}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-4)", whiteSpace: "nowrap" }}>
              {days === 0
                ? t("dashboard.properties.addedToday")
                : days === 1
                  ? t("dashboard.properties.addedYesterday")
                  : t("dashboard.properties.addedDaysAgo").replace("{days}", String(days))}
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: t("dashboard.properties.colStatus"),
      sortable: true,
      filter: "select",
      filterOptions: STATUSES.map((o) => ({ value: o.value, label: t(`common.status.${o.value}`) })),
      accessor: (p) => p.status,
      render: (p) => (
        <span className={statusBadgeClass(p.status)}>
          {p.status ? t(`common.status.${p.status}`) : ""}
        </span>
      ),
    },
  ];
}

export function PropertiesTable({
  limit,
  showToolbar = true,
}: {
  limit?: number;
  showToolbar?: boolean;
} = {}) {
  const { t, locale, localeHref } = useI18n();
  const router = useRouter();
  const [page, setPage] = useState(0);
  const pageSize = limit ?? PAGE_SIZE;
  const { data, loading, error } = useQuery<{ getProperties: { items: Property[]; totalCount: number } }>(
    GET_PROPERTIES,
    {
      fetchPolicy: "cache-and-network",
      variables: { limit: pageSize, offset: limit ? 0 : page * pageSize },
    },
  );
  const [deleteProperty] = useMutation(DELETE_PROPERTY, {
    refetchQueries: [{ query: GET_PROPERTIES, variables: { limit: pageSize, offset: limit ? 0 : page * pageSize } }],
  });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<Property | null>(null);

  const { data: session } = useSession();
  const mayDelete = roleIs.canDeleteProperty(session?.user?.role);

  const properties = data?.getProperties?.items ?? [];
  const totalCount = data?.getProperties?.totalCount ?? 0;

  const onDelete = async () => {
    if (!confirmRow) return;
    setDeleting(confirmRow.id);
    try {
      await deleteProperty({ variables: { id: confirmRow.id } });
      setConfirmRow(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.crud.deleteError"));
    } finally {
      setDeleting(null);
    }
  };

  const columns = buildColumns(t, locale);

  if (error && !loading) {
    return (
      <div className="rn-dt-wrap" style={{ padding: "40px 0", textAlign: "center", color: "var(--text-3)" }}>
        {t("dashboard.properties.loadError")} <span style={{ color: "var(--danger)" }}>{error.message}</span>
      </div>
    );
  }

  return (
    <>
    <DataTable<Property>
      columns={columns}
      data={properties}
      loading={loading && !data}
      defaultSort={{ key: "shortId", dir: "desc" }}
      viewKey={showToolbar ? "properties" : undefined}
      hideFilters={!showToolbar}
      hideHeader={!showToolbar}
      flush={!showToolbar}
      hideFooter={!showToolbar}
      {...(limit
        ? {}
        : { serverPagination: { page, pageSize, totalCount, onPageChange: setPage } })}
      onRowClick={(p) => router.push(localeHref(`/dashboard/properties/${p.id}`))}
      actionsCell={showToolbar ? (p) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label={t("dashboard.properties.edit")}
            onPress={() => router.push(localeHref(`/dashboard/properties/${p.id}/edit`))}
          >
            <Pencil size={13} />
          </Button>
          {mayDelete && (
            <Button
              variant="danger-soft"
              size="sm"
              isIconOnly
              onPress={() => setConfirmRow(p)}
              isDisabled={deleting === p.id}
              aria-label={t("common.crud.delete")}
            >
              {deleting === p.id ? <span className="rn-spin" /> : <Trash2 size={13} />}
            </Button>
          )}
        </div>
      ) : undefined}
      emptyNode={
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "64px 0", textAlign: "center" }}>
          <div className="rn-thumb rn-thumb--empty" style={{ width: 56, height: 56, borderRadius: 16 }}>
            <Building2 size={24} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{t("dashboard.properties.empty")}</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{t("dashboard.properties.emptyHint")}</p>
          </div>
          <Button variant="primary" size="sm" onPress={() => router.push(localeHref("/dashboard/properties/new"))}>
            <Plus size={14} /> {t("dashboard.properties.add")}
          </Button>
        </div>
      }
    />
    {confirmRow && (
      <ConfirmDialog
        label={confirmRow.title}
        busy={deleting === confirmRow.id}
        onCancel={() => setConfirmRow(null)}
        onConfirm={() => void onDelete()}
      />
    )}
    </>
  );
}
