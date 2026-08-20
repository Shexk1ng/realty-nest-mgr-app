"use client";

// Uniwersalna tabela danych z sortowaniem, wyszukiwaniem, filtrami i stronicowaniem

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import {
  Button,
  EmptyState,
  Input,
  ListBox,
  ListBoxItem,
  Select,
  Table,
} from "@heroui/react";
import { cn } from "@/lib/utils";
import { FilterPanel } from "@/components/ui/filter-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { EMPTY_VIEW, useTableView } from "@/lib/table-view";

type SortDir = "asc" | "desc";
type SortState = { key: string; dir: SortDir } | null;

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  filter?: "text" | "select";
  filterOptions?: { value: string; label: string }[];
  filterPlaceholder?: string;
  accessor?: (row: T) => string | number | null | undefined;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right";
  width?: string;
  minWidth?: string;
  wrap?: boolean;
  className?: string;
}

function plRows(n: number): string {
  if (n === 1) return "wiersz";
  const last = n % 10;
  const teens = n % 100;
  if (last >= 2 && last <= 4 && !(teens >= 12 && teens <= 14)) return "wiersze";
  return "wierszy";
}

interface DataTableProps<T extends { id: string }> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  defaultSort?: { key: string; dir: SortDir } | null;
  skeletonRows?: number;
  emptyNode?: React.ReactNode;
  onRowClick?: (row: T) => void;
  actionsCell?: (row: T) => React.ReactNode;
  className?: string;
  label?: string;
  serverPagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
  };
  hideFilters?: boolean;
  hideHeader?: boolean;
  flush?: boolean;
  hideFooter?: boolean;
  viewKey?: string;
}

function get<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  defaultSort = null,
  skeletonRows = 6,
  emptyNode,
  onRowClick,
  actionsCell,
  className,
  hideFilters,
  hideHeader,
  flush,
  hideFooter,
  label = "Data table",
  serverPagination,
  viewKey,
}: DataTableProps<T>) {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const resolved = t(key);
    return resolved === key ? fallback : resolved;
  };
  const remembered = useTableView(viewKey ?? "");
  const [own, setOwn] = useState<{ sort: SortState; filters: Record<string, string> }>(() => ({
    sort: defaultSort ?? null,
    filters: {},
  }));

  const sort = viewKey ? (remembered.view?.sort ?? defaultSort ?? null) : own.sort;
  const colFilters = viewKey ? (remembered.view?.filters ?? EMPTY_VIEW.filters) : own.filters;

  const setSort = (next: NonNullable<SortState>) => {
    if (viewKey) remembered.patch({ sort: next });
    else setOwn((s) => ({ ...s, sort: next }));
  };

  const setFilters = (next: Record<string, string>) => {
    if (viewKey) remembered.patch({ filters: next });
    else setOwn((s) => ({ ...s, filters: next }));
  };

  const setFilter = (key: string, val: string) => {
    const next = { ...colFilters };
    if (val) next[key] = val;
    else delete next[key];
    setFilters(next);
  };

  const clearFilters = () => setFilters({});
  const hasFilters = Object.keys(colFilters).length > 0;
  const filterableColumns = columns.filter((c) => c.filter);

  const visible = useMemo(() => {
    let out = [...data];

    for (const col of columns) {
      const val = colFilters[col.key];
      if (!val) continue;
      const needle = val.toLowerCase();
      out = out.filter((row) => {
        const cv = col.accessor ? col.accessor(row) : get(row, col.key);
        return String(cv ?? "").toLowerCase().includes(needle);
      });
    }

    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      out.sort((a, b) => {
        const av = col?.accessor ? col.accessor(a) : (get(a, sort.key) as string | number | null);
        const bv = col?.accessor ? col.accessor(b) : (get(b, sort.key) as string | number | null);
        let cmp = 0;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }

    return out;
  }, [data, colFilters, sort, columns]);

  const sortDescriptor = sort
    ? {
        column: sort.key,
        direction: sort.dir === "asc" ? ("ascending" as const) : ("descending" as const),
      }
    : undefined;

  return (
    <div className={cn("space-y-4", className)}>
      {!hideFilters && filterableColumns.length > 0 && (
        <FilterPanel activeCount={Object.values(colFilters).filter(Boolean).length}>
          <div className="rn-filterbar">
          {filterableColumns.map((col) => (
            <div
              key={col.key}
              className="rn-filterbar__field"
              data-active={Boolean(colFilters[col.key])}
            >
              <span className="rn-filterbar__label">{col.header}</span>

              {col.filter === "select" ? (
                <Select
                  aria-label={`Filtruj po: ${col.header}`}
                  selectedKey={colFilters[col.key] || "__all"}
                  onSelectionChange={(k) =>
                    setFilter(col.key, String(k) === "__all" ? "" : String(k))
                  }
                  fullWidth
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBoxItem id="__all">Wszystkie</ListBoxItem>
                      {(col.filterOptions ?? []).map((o) => (
                        <ListBoxItem key={o.value} id={o.value}>
                          {o.label}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              ) : (
                <Input
                  aria-label={`Filtruj po: ${col.header}`}
                  type="search"
                  fullWidth
                  placeholder={col.filterPlaceholder ?? "Filtruj…"}
                  value={colFilters[col.key] ?? ""}
                  onChange={(e) => setFilter(col.key, e.target.value)}
                />
              )}
            </div>
          ))}

          <div className="rn-filterbar__field">
            <span className="rn-filterbar__label sr-only">{tf("common.crud.actions", "Akcje")}</span>
            <Button variant="secondary" isDisabled={!hasFilters} onPress={clearFilters}>
              <X className="h-4 w-4" /> {tf("common.crud.clearFilters", "Wyczyść filtry")}
              {hasFilters ? ` (${Object.keys(colFilters).length})` : ""}
            </Button>
          </div>
          </div>
        </FilterPanel>
      )}

      <div className={flush ? "rn-table-surface rn-table-surface--flush" : "rn-table-surface"}>
        {loading && data.length === 0 ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <div key={i} className="flex gap-3">
                {columns.map((c, j) => (
                  <Skeleton
                    key={c.key}
                    variant="text"
                    className="flex-1"
                    style={{ maxWidth: `${40 + ((i * 7 + j * 13) % 5) * 10}%` }}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          emptyNode ?? (
            <EmptyState className="py-16">
              <span className="text-sm text-muted-foreground">
                {data.length === 0 ? "Brak rekordów." : "Brak wyników dla wybranych filtrów."}
              </span>
              {hasFilters && data.length > 0 && (
                <Button variant="secondary" size="sm" onPress={clearFilters} className="mt-1">
                  <X className="h-3.5 w-3.5" /> Clear filters
                </Button>
              )}
            </EmptyState>
          )
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content
                aria-label={label}
                sortDescriptor={sortDescriptor}
                onSortChange={(d) =>
                  setSort({
                    key: String(d.column),
                    dir: d.direction === "ascending" ? "asc" : "desc",
                  })
                }
              >
                <Table.Header className={hideHeader ? "rn-table-header--hidden" : undefined}>
                  {[
                    ...columns.map((col, i) => (
                      <Table.Column
                        key={col.key}
                        id={col.key}
                        isRowHeader={i === 0}
                        allowsSorting={col.sortable}
                        style={{ width: col.width, minWidth: col.minWidth }}
                        className={cn(col.align === "right" && "text-right", col.className)}
                      >
                        {({ sortDirection }) => (
                          <Table.SortableColumnHeader sortDirection={sortDirection}>
                            {col.header}
                          </Table.SortableColumnHeader>
                        )}
                      </Table.Column>
                    )),
                    ...(actionsCell
                      ? [
                          <Table.Column key="__actions" id="__actions" className="text-right">
                            <span className="sr-only">{tf("common.crud.actions", "Akcje")}</span>
                          </Table.Column>,
                        ]
                      : []),
                  ]}
                </Table.Header>

                <Table.Body items={visible}>
                  {(row: T) => (
                    <Table.Row
                      id={row.id}
                      onAction={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {[
                        ...columns.map((col) => (
                          <Table.Cell
                            key={col.key}
                            className={cn(
                              col.align === "right" && "text-right",
                              col.wrap && "cell-wrap",
                              col.className,
                            )}
                          >
                            {col.render ? col.render(row) : String(get(row, col.key) ?? "—")}
                          </Table.Cell>
                        )),
                        ...(actionsCell
                          ? [
                              <Table.Cell key="__actions">
                                <div className="rn-row-actions">{actionsCell(row)}</div>
                              </Table.Cell>,
                            ]
                          : []),
                      ]}
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>

            {!hideFooter && <Table.Footer className="px-4 py-3">
              {serverPagination && !hasFilters ? (
                <Pagination
                  page={serverPagination.page}
                  pageSize={serverPagination.pageSize}
                  totalCount={serverPagination.totalCount}
                  onPageChange={serverPagination.onPageChange}
                  disabled={loading}
                  className="w-full"
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {visible.length !== data.length
                    ? `${visible.length} z ${data.length} ${plRows(data.length)}`
                    : `${data.length} ${plRows(data.length)}`}
                </span>
              )}
            </Table.Footer>}
          </Table>
        )}
      </div>
    </div>
  );
}
