// Zapamiętuje w przeglądarce wyszukiwanie, filtry i sortowanie tabel każdego z modułów

import { useCallback, useSyncExternalStore } from "react";

export type TableSortDir = "asc" | "desc";

export interface TableView {
  search: string;
  status: string;
  filters: Record<string, string>;
  sort: { key: string; dir: TableSortDir } | null;
}

const STORAGE_PREFIX = "rn:view:";

export const EMPTY_VIEW: TableView = Object.freeze({
  search: "",
  status: "",
  filters: Object.freeze({}) as Record<string, string>,
  sort: null,
});

const snapshots = new Map<string, TableView | null>();
const listeners = new Map<string, Set<() => void>>();

function isStringMap(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === "string")
  );
}

function parse(raw: string | null): TableView | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (typeof value !== "object" || value === null) return null;

    const sort = value.sort as { key?: unknown; dir?: unknown } | null | undefined;
    const validSort =
      sort && typeof sort.key === "string" && (sort.dir === "asc" || sort.dir === "desc")
        ? { key: sort.key, dir: sort.dir as TableSortDir }
        : null;

    return {
      search: typeof value.search === "string" ? value.search : "",
      status: typeof value.status === "string" ? value.status : "",
      filters: isStringMap(value.filters) ? value.filters : {},
      sort: validSort,
    };
  } catch {
    return null;
  }
}

function readView(key: string): TableView | null {
  const cached = snapshots.get(key);
  if (cached !== undefined) return cached;

  const value =
    typeof window === "undefined"
      ? null
      : (() => {
          try {
            return parse(window.sessionStorage.getItem(STORAGE_PREFIX + key));
          } catch {
            return null;
          }
        })();

  snapshots.set(key, value);
  return value;
}

function writeView(key: string, next: TableView | null) {
  snapshots.set(key, next);
  try {
    if (next) window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(next));
    else window.sessionStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
  }
  for (const listener of listeners.get(key) ?? []) listener();
}

export interface TableViewHandle {
  view: TableView | null;
  patch: (changes: Partial<TableView>) => void;
  clearFilters: () => void;
}

export function useTableView(key: string): TableViewHandle {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      let set = listeners.get(key);
      if (!set) {
        set = new Set();
        listeners.set(key, set);
      }
      set.add(onStoreChange);
      return () => {
        set?.delete(onStoreChange);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(() => readView(key), [key]);
  const getServerSnapshot = useCallback(() => null, []);

  const view = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const patch = useCallback(
    (changes: Partial<TableView>) => {
      writeView(key, { ...(readView(key) ?? EMPTY_VIEW), ...changes });
    },
    [key],
  );

  const clearFilters = useCallback(() => {
    const current = readView(key);
    writeView(key, { ...EMPTY_VIEW, sort: current?.sort ?? null });
  }, [key]);

  return { view, patch, clearFilters };
}
