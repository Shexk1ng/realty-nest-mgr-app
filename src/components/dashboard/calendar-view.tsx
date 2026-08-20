"use client";

// Kalendarz miesięczny i tygodniowy z prezentacjami oraz wydarzeniami agenta

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useSession } from "next-auth/react";
import { roleIs } from "@/lib/roles";
import { AlertTriangle, CalendarPlus, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  Alert,
  AlertDialog,
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Modal,
  Select,
  Spinner,
  TextArea,
  Input,
} from "@heroui/react";
import {
  ADD_EVENT,
  DELETE_EVENT,
  GET_EVENTS,
  UPDATE_EVENT,
  type CalendarEvent,
} from "@/lib/graphql/queries/events";
import { EventPreview, type EventConflict } from "@/components/dashboard/event-preview";
import { fmtDateTime } from "@/lib/dashboard-format";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";

function optionalText(t: (key: string) => string, key: string): string {
  const value = t(key);
  return value === key ? "" : value;
}

const KIND_KEYS = [
  ["VIEWING", "kindViewing"],
  ["MEETING", "kindMeeting"],
  ["CALL", "kindCall"],
  ["INSPECTION", "kindInspection"],
  ["OTHER", "kindOther"],
] as const;

function buildKindOptions(t: (k: string) => string): { value: string; label: string }[] {
  return KIND_KEYS.map(([value, key]) => ({ value, label: t(`dashboard.calendar.${key}`) }));
}

function buildKindLabels(t: (k: string) => string): Record<string, string> {
  return Object.fromEntries(KIND_KEYS.map(([value, key]) => [value, t(`dashboard.calendar.${key}`)]));
}

const KIND_STYLE: Record<string, { dot: string; bar: string; chip: string }> = {
  VIEWING: { dot: "bg-emerald-500", bar: "bg-emerald-500", chip: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
  MEETING: { dot: "bg-sky-500", bar: "bg-sky-500", chip: "bg-sky-500/12 text-sky-600 dark:text-sky-400" },
  CALL: { dot: "bg-violet-500", bar: "bg-violet-500", chip: "bg-violet-500/12 text-violet-600 dark:text-violet-400" },
  INSPECTION: { dot: "bg-amber-500", bar: "bg-amber-500", chip: "bg-amber-500/12 text-amber-600 dark:text-amber-400" },
  OTHER: { dot: "bg-slate-400", bar: "bg-slate-400", chip: "bg-slate-400/12 text-slate-600 dark:text-slate-400" },
};

const WEEKDAY_KEYS = ["wdMon", "wdTue", "wdWed", "wdThu", "wdFri", "wdSat", "wdSun"] as const;

function buildWeekdays(t: (k: string) => string): string[] {
  return WEEKDAY_KEYS.map((k) => t(`dashboard.calendar.${k}`));
}

const HOUR_START = 7;
const HOUR_END = 21;
const ROW_PX = 52;

const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sameDay = (a: Date, b: Date) => dateKey(a) === dateKey(b);

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const dow = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - dow);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function monthGridDays(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function layoutColumns(events: CalendarEvent[]): (CalendarEvent & { col: number; cols: number })[] {
  const sorted = [...events].sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
  const active: { end: number; col: number }[] = [];
  const placed: (CalendarEvent & { col: number; cols: number })[] = [];
  let cluster: (CalendarEvent & { col: number; cols: number })[] = [];

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const maxCols = Math.max(...cluster.map((e) => e.col)) + 1;
    for (const e of cluster) e.cols = maxCols;
    cluster = [];
  };

  for (const ev of sorted) {
    const start = +new Date(ev.startAt);
    const end = +new Date(ev.endAt);
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i]!.end <= start) active.splice(i, 1);
    }
    if (active.length === 0) flushCluster();
    const usedCols = new Set(active.map((a) => a.col));
    let col = 0;
    while (usedCols.has(col)) col++;
    active.push({ end, col });
    const withCol = { ...ev, col, cols: 1 };
    placed.push(withCol);
    cluster.push(withCol);
  }
  flushCluster();
  return placed;
}

function eventTooltip(ev: CalendarEvent, kindLabel: string, dateLocale: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  const parts = [`${fmt(ev.startAt)}–${fmt(ev.endAt)}`, kindLabel, ev.title];
  if (ev.location) parts.push(ev.location);
  return parts.join(" · ");
}

function EventChip({
  ev,
  kindLabel,
  onClick,
}: {
  ev: CalendarEvent;
  kindLabel: string;
  onClick: () => void;
}) {
  const { locale } = useI18n();
  const dateLocale = locale === "en" ? "en-GB" : "pl-PL";
  const style = KIND_STYLE[ev.kind] ?? KIND_STYLE.OTHER!;
  const time = new Date(ev.startAt).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn("flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium", style.chip)}
      title={eventTooltip(ev, kindLabel, dateLocale)}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} aria-hidden />
      <span className="truncate">{time} {ev.title}</span>
    </button>
  );
}

interface EventFormState {
  title: string;
  kind: string;
  location: string;
  startAt: string;
  endAt: string;
  description: string;
}

function toLocalInput(d: Date): string {
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function buildInitialForm(event: CalendarEvent | null, defaultStart: Date | null): EventFormState {
  if (event) {
    return {
      title: event.title,
      kind: event.kind,
      location: event.location ?? "",
      startAt: toLocalInput(new Date(event.startAt)),
      endAt: toLocalInput(new Date(event.endAt)),
      description: event.description ?? "",
    };
  }
  const start = defaultStart ?? new Date();
  const end = new Date(start.getTime() + 30 * 60_000);
  return { title: "", kind: "MEETING", location: "", startAt: toLocalInput(start), endAt: toLocalInput(end), description: "" };
}

function EventModal({
  event,
  defaultStart,
  allEvents,
  onClose,
}: {
  event: CalendarEvent | null;
  defaultStart: Date | null;
  allEvents: CalendarEvent[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const kindOptions = buildKindOptions(t);
  const kindLabels = buildKindLabels(t);
  const isEdit = Boolean(event);
  const [baseline] = useState<EventFormState>(() => buildInitialForm(event, defaultStart));
  const [values, setValues] = useState<EventFormState>(() => baseline);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k: keyof EventFormState, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const [runCreate, createState] = useMutation(ADD_EVENT, { refetchQueries: [GET_EVENTS] });
  const [runUpdate, updateState] = useMutation(UPDATE_EVENT, { refetchQueries: [GET_EVENTS] });
  const [runDelete, deleteState] = useMutation(DELETE_EVENT, { refetchQueries: [GET_EVENTS] });
  const busy = createState.loading || updateState.loading || deleteState.loading;

  const { data: session } = useSession();
  const mayDelete = roleIs.canDelete(session?.user?.role);

  const dirty = (Object.keys(values) as (keyof EventFormState)[]).some(
    (k) => values[k] !== baseline[k],
  );
  const unsavedLabel = optionalText(t, "common.crud.unsavedIndicator");

  const requestClose = () => {
    if (busy) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const conflicts = useMemo<EventConflict[]>(() => {
    const start = new Date(values.startAt).getTime();
    const end = new Date(values.endAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
    return allEvents
      .filter((other) => {
        if (event && other.id === event.id) return false;
        const os = new Date(other.startAt).getTime();
        const oe = new Date(other.endAt).getTime();
        return Number.isFinite(os) && Number.isFinite(oe) && start < oe && end > os;
      })
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
      .map((o) => ({ id: o.id, title: o.title, startAt: o.startAt, endAt: o.endAt }));
  }, [allEvents, event, values.startAt, values.endAt]);

  const previewValues: Record<string, unknown> = {
    ...(event ?? {}),
    ...values,
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) { setError(t("dashboard.calendar.errTitleRequired")); return; }
    if (new Date(values.endAt) <= new Date(values.startAt)) { setError(t("dashboard.calendar.errEndBeforeStart")); return; }
    setError(null);
    try {
      const vars = {
        title: values.title.trim(),
        kind: values.kind,
        location: values.location || null,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
        description: values.description || null,
      };
      if (isEdit) await runUpdate({ variables: { id: event!.id, ...vars } });
      else await runCreate({ variables: vars });
      toast.success(t(isEdit ? "dashboard.calendar.toastUpdated" : "dashboard.calendar.toastCreated"));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.calendar.errSave"));
    }
  };

  const remove = async () => {
    if (!event) return;
    try {
      await runDelete({ variables: { id: event.id } });
      setConfirmDelete(false);
      toast.success(t("dashboard.calendar.toastDeleted"));
      onClose();
    } catch (err) {
      setConfirmDelete(false);
      setError(err instanceof Error ? err.message : t("dashboard.calendar.errDelete"));
    }
  };

  const blocked = busy || confirmDiscard || confirmDelete;

  return (
    <Modal
      isOpen
      onOpenChange={(open) => { if (!open && !blocked) requestClose(); }}
    >
      <Modal.Backdrop isDismissable={!blocked}>
        <Modal.Container size="lg" scroll="inside" className="sm:w-full">
          <Modal.Dialog className="max-w-none sm:max-w-5xl">
            <Modal.Header>
              <Modal.Heading>{t(isEdit ? "dashboard.calendar.editEvent" : "dashboard.calendar.newEvent")}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
              <aside
                role="region"
                aria-label={t("common.crud.previewTitle")}
                className="scrollbar max-h-[45vh] min-h-0 overflow-y-auto rounded-xl border border-border bg-surface-hi p-4 lg:max-h-none"
              >
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-3">
                  {t("common.crud.previewTitle")}
                </p>
                <EventPreview
                  values={previewValues}
                  mode={isEdit ? "edit" : "new"}
                  kindLabel={kindLabels[values.kind] ?? values.kind}
                  kindDotClass={(KIND_STYLE[values.kind] ?? KIND_STYLE.OTHER!).dot}
                  conflicts={conflicts}
                />
              </aside>

              <div className="scrollbar flex min-h-0 flex-col gap-4 lg:overflow-y-auto lg:border-l lg:border-l-border lg:pl-5 lg:pr-1">
                {error && (
                  <Alert status="danger">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{error}</span>
                  </Alert>
                )}
                <form onSubmit={submit} id="event-form" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="ev-title" isRequired>{t("dashboard.calendar.fieldTitle")}</Label>
                    <Input id="ev-title" value={values.title} onChange={(e) => set("title", e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>{t("dashboard.calendar.fieldKind")}</Label>
                    <Select selectedKey={values.kind} onSelectionChange={(k) => set("kind", k as string)} fullWidth>
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {kindOptions.map((o) => <ListBoxItem key={o.value} id={o.value}>{o.label}</ListBoxItem>)}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ev-loc">{t("dashboard.calendar.fieldLocation")}</Label>
                    <Input id="ev-loc" value={values.location} placeholder={t("dashboard.calendar.locationPlaceholder")} onChange={(e) => set("location", e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ev-start" isRequired>{t("dashboard.calendar.fieldStart")}</Label>
                    <Input id="ev-start" type="datetime-local" value={values.startAt} onChange={(e) => set("startAt", e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ev-end" isRequired>{t("dashboard.calendar.fieldEnd")}</Label>
                    <Input id="ev-end" type="datetime-local" value={values.endAt} onChange={(e) => set("endAt", e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="ev-desc">{t("dashboard.calendar.fieldDescription")}</Label>
                    <TextArea id="ev-desc" fullWidth rows={3} value={values.description} placeholder={t("dashboard.calendar.descriptionPlaceholder")} onChange={(e) => set("description", e.target.value)} />
                    <span className="text-xs text-text-3">{t("dashboard.calendar.descriptionHint")}</span>
                  </div>
                </form>
              </div>
            </Modal.Body>
            <Modal.Footer>
              {isEdit && mayDelete && (
                <Button variant="ghost" isDisabled={busy} onPress={() => setConfirmDelete(true)} className="mr-auto text-danger">
                  <Trash2 size={14} /> {t("common.crud.delete")}
                </Button>
              )}
              {dirty && !busy && unsavedLabel && (
                <span className={cn("rn-dirty", !(isEdit && mayDelete) && "mr-auto")} role="status">
                  <span className="rn-dirty__dot" aria-hidden />
                  {unsavedLabel}
                </span>
              )}
              <Button variant="ghost" isDisabled={busy} onPress={requestClose}>{t("common.crud.cancel")}</Button>
              <Button variant="primary" type="submit" form="event-form" isDisabled={busy}>
                {busy ? <Spinner size="sm" /> : t(isEdit ? "common.crud.save" : "common.crud.add")}
              </Button>
            </Modal.Footer>

            {confirmDiscard && (
              <AlertDialog isOpen onOpenChange={(open) => { if (!open) setConfirmDiscard(false); }}>
                <AlertDialog.Backdrop isDismissable>
                  <AlertDialog.Container size="sm">
                    <AlertDialog.Dialog>
                      <AlertDialog.Header>
                        <AlertDialog.Icon status="warning">
                          <AlertTriangle className="h-5 w-5" aria-hidden />
                        </AlertDialog.Icon>
                        <AlertDialog.Heading>{t("common.crud.unsavedHeading")}</AlertDialog.Heading>
                      </AlertDialog.Header>
                      <AlertDialog.Body>{t("common.crud.unsavedBody")}</AlertDialog.Body>
                      <AlertDialog.Footer>
                        <Button variant="ghost" size="sm" onPress={() => setConfirmDiscard(false)}>
                          {t("common.crud.unsavedKeepEditing")}
                        </Button>
                        <Button variant="danger" size="sm" onPress={() => { setConfirmDiscard(false); onClose(); }}>
                          {t("common.crud.unsavedDiscard")}
                        </Button>
                      </AlertDialog.Footer>
                    </AlertDialog.Dialog>
                  </AlertDialog.Container>
                </AlertDialog.Backdrop>
              </AlertDialog>
            )}

            {confirmDelete && (
              <AlertDialog isOpen onOpenChange={(open) => { if (!open && !busy) setConfirmDelete(false); }}>
                <AlertDialog.Backdrop isDismissable={!busy}>
                  <AlertDialog.Container size="sm">
                    <AlertDialog.Dialog>
                      <AlertDialog.Header>
                        <AlertDialog.Icon status="danger">
                          <Trash2 className="h-5 w-5" aria-hidden />
                        </AlertDialog.Icon>
                        <AlertDialog.Heading>
                          {t("common.crud.deleteHeading").replace("{label}", event?.title ?? "")}
                        </AlertDialog.Heading>
                      </AlertDialog.Header>
                      <AlertDialog.Body>{t("common.crud.deleteBody")}</AlertDialog.Body>
                      <AlertDialog.Footer>
                        <Button variant="ghost" size="sm" isDisabled={busy} onPress={() => setConfirmDelete(false)}>
                          {t("common.crud.cancel")}
                        </Button>
                        <Button variant="danger" size="sm" isDisabled={busy} onPress={() => void remove()}>
                          {busy ? <Spinner size="sm" color="current" /> : <Trash2 className="h-4 w-4" />}{" "}
                          {t("common.crud.delete")}
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

export function CalendarView() {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-GB" : "pl-PL";
  const kindOptions = buildKindOptions(t);
  const kindLabels = buildKindLabels(t);
  const weekdays = buildWeekdays(t);
  const [anchor, setAnchor] = useState(() => new Date());
  const [mode, setMode] = useState<"month" | "week">("month");
  const [modalState, setModalState] = useState<{ event: CalendarEvent | null; defaultStart: Date | null } | null>(null);

  const { data, loading } = useQuery<{ getEvents: { items: CalendarEvent[] } }>(GET_EVENTS, {
    variables: { limit: 500 },
    fetchPolicy: "cache-and-network",
  });
  const events = useMemo(() => data?.getEvents.items ?? [], [data]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = dateKey(new Date(ev.startAt));
      (map.get(key) ?? map.set(key, []).get(key)!).push(ev);
    }
    return map;
  }, [events]);

  const goToday = () => setAnchor(new Date());
  const goPrev = () => setAnchor((d) => mode === "month" ? new Date(d.getFullYear(), d.getMonth() - 1, 1) : addDays(d, -7));
  const goNext = () => setAnchor((d) => mode === "month" ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : addDays(d, 7));

  const monthLabel = anchor.toLocaleDateString(dateLocale, { month: "long", year: "numeric" });
  const weekStart = startOfWeek(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${weekDays[0]!.toLocaleDateString(dateLocale, { day: "numeric", month: "short" })} – ${weekDays[6]!.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })}`;

  const today = new Date();

  const periodEvents = useMemo(() => {
    const from =
      mode === "month" ? new Date(anchor.getFullYear(), anchor.getMonth(), 1) : startOfWeek(anchor);
    const to =
      mode === "month"
        ? new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
        : addDays(startOfWeek(anchor), 7);
    return events.filter((ev) => {
      const s = new Date(ev.startAt);
      return s >= from && s < to;
    });
  }, [events, anchor, mode]);

  const kindCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ev of periodEvents) map[ev.kind] = (map[ev.kind] ?? 0) + 1;
    return map;
  }, [periodEvents]);

  const nowMs = today.getTime();
  const nextEvent =
    [...events]
      .filter((ev) => +new Date(ev.startAt) >= nowMs)
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" isIconOnly onPress={goPrev} aria-label={t("dashboard.calendar.prevPeriod")}><ChevronLeft size={16} /></Button>
          <Button variant="ghost" size="sm" onPress={goToday}>{t("dashboard.calendar.today")}</Button>
          <Button variant="ghost" size="sm" isIconOnly onPress={goNext} aria-label={t("dashboard.calendar.nextPeriod")}><ChevronRight size={16} /></Button>
          <span className="ml-2 font-display text-lg font-semibold capitalize text-foreground">
            {mode === "month" ? monthLabel : weekLabel}
          </span>
          {loading && <Spinner size="sm" />}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border/60 p-0.5">
            <button
              type="button"
              onClick={() => setMode("month")}
              className={cn("rounded-md px-3 py-1 text-xs font-semibold transition-colors", mode === "month" ? "bg-primary text-[var(--accent-ink)]" : "text-muted-foreground hover:text-foreground")}
            >
              {t("dashboard.calendar.viewMonth")}
            </button>
            <button
              type="button"
              onClick={() => setMode("week")}
              className={cn("rounded-md px-3 py-1 text-xs font-semibold transition-colors", mode === "week" ? "bg-primary text-[var(--accent-ink)]" : "text-muted-foreground hover:text-foreground")}
            >
              {t("dashboard.calendar.viewWeek")}
            </button>
          </div>
          <Button variant="primary" size="sm" onPress={() => setModalState({ event: null, defaultStart: new Date() })}>
            <Plus size={14} /> {t("dashboard.calendar.newEvent")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-[11px] font-semibold text-foreground">
          {t("dashboard.calendar.periodCount").replace("{n}", String(periodEvents.length))}
        </span>
        {kindOptions.map((o) => (
          <span
            key={o.value}
            className={cn(
              "flex items-center gap-1.5 text-[11px]",
              kindCounts[o.value] ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", KIND_STYLE[o.value]!.dot)} aria-hidden />
            {o.label}
            <span className="tabular-nums">{kindCounts[o.value] ?? 0}</span>
          </span>
        ))}
        {nextEvent && (
          <span className="ml-auto min-w-0 truncate text-[11px] text-muted-foreground">
            {t("dashboard.calendar.nextUp")}{" "}
            <span className="font-medium text-foreground">{nextEvent.title}</span>
            {" · "}
            <span className="tabular-nums">{fmtDateTime(nextEvent.startAt)}</span>
          </span>
        )}
      </div>

      {periodEvents.length === 0 && !loading && (
        <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-border bg-surface px-3.5 py-3">
          <CalendarPlus size={16} className="mt-0.5 shrink-0 text-text-4" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {t("dashboard.calendar.emptyPeriod")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.calendar.emptyPeriodHint")}
            </p>
          </div>
        </div>
      )}

      {mode === "month" ? (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30">
            {weekdays.map((w) => (
              <div key={w} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthGridDays(anchor).map((day, i) => {
              const inMonth = day.getMonth() === anchor.getMonth();
              const isToday = sameDay(day, today);
              const dayEvents = (eventsByDay.get(dateKey(day)) ?? []).sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
              const shown = dayEvents.slice(0, 3);
              const overflow = dayEvents.length - shown.length;
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => setModalState({ event: null, defaultStart: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9) })}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setModalState({ event: null, defaultStart: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9) }); } }}
                  className={cn(
                    "flex min-h-[92px] cursor-pointer flex-col gap-1 border-b border-r border-border/40 p-1.5 text-left transition-colors hover:bg-muted/30",
                    i % 7 === 6 && "border-r-0",
                    !inMonth && "bg-muted/10",
                  )}
                >
                  <span className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                    isToday ? "bg-primary text-[var(--accent-ink)]" : inMonth ? "text-foreground" : "text-text-3",
                  )}>
                    {day.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {shown.map((ev) => (
                      <EventChip
                        key={ev.id}
                        ev={ev}
                        kindLabel={kindLabels[ev.kind] ?? ev.kind}
                        onClick={() => setModalState({ event: ev, defaultStart: null })}
                      />
                    ))}
                    {overflow > 0 && (
                      <span className="px-1.5 text-[10px] text-muted-foreground">
                        {t("dashboard.calendar.moreEvents").replace("{count}", String(overflow))}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-border/60 bg-muted/30">
            <div />
            {weekDays.map((day) => {
              const isToday = sameDay(day, today);
              return (
                <div key={dateKey(day)} className="border-l border-border/40 px-2 py-2 text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {day.toLocaleDateString(dateLocale, { weekday: "short" })}
                  </div>
                  <div className={cn("mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", isToday ? "bg-primary text-[var(--accent-ink)]" : "text-foreground")}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="relative grid grid-cols-[48px_repeat(7,1fr)]" style={{ height: (HOUR_END - HOUR_START) * ROW_PX }}>
            <div className="relative">
              {Array.from({ length: HOUR_END - HOUR_START }, (_, h) => (
                <div key={h} className="absolute left-0 right-0 -translate-y-1/2 pr-1.5 text-right text-[10px] text-muted-foreground" style={{ top: h * ROW_PX }}>
                  {String(HOUR_START + h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {weekDays.map((day) => {
              const dayEvents = eventsByDay.get(dateKey(day)) ?? [];
              const laidOut = layoutColumns(dayEvents);
              return (
                <div
                  key={dateKey(day)}
                  className="relative border-l border-border/40"
                  onClick={() => setModalState({ event: null, defaultStart: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9) })}
                >
                  {Array.from({ length: HOUR_END - HOUR_START }, (_, h) => (
                    <div key={h} className="absolute left-0 right-0 border-t border-border/20" style={{ top: h * ROW_PX }} />
                  ))}
                  {laidOut.map((ev) => {
                    const start = new Date(ev.startAt);
                    const end = new Date(ev.endAt);
                    const startFrac = Math.max(0, start.getHours() + start.getMinutes() / 60 - HOUR_START);
                    const endFrac = Math.min(HOUR_END - HOUR_START, end.getHours() + end.getMinutes() / 60 - HOUR_START);
                    const top = startFrac * ROW_PX;
                    const height = Math.max(18, (endFrac - startFrac) * ROW_PX - 2);
                    const width = 100 / ev.cols;
                    const style = KIND_STYLE[ev.kind] ?? KIND_STYLE.OTHER!;
                    const hhmm = (d: Date) => d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
                    const roomy = height >= ROW_PX;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setModalState({ event: ev, defaultStart: null }); }}
                        className={cn("absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[10px] font-medium leading-tight", style.chip)}
                        style={{ top, height, left: `calc(${ev.col * width}% + 2px)`, width: `calc(${width}% - 4px)` }}
                        title={eventTooltip(ev, kindLabels[ev.kind] ?? ev.kind, dateLocale)}
                      >
                        <span className={cn("mb-0.5 block h-0.5 w-4 rounded-full", style.bar)} aria-hidden />
                        <span className="block truncate font-semibold">{ev.title}</span>
                        <span className="block truncate tabular-nums opacity-80">
                          {hhmm(start)}–{hhmm(end)}
                        </span>
                        {roomy && (
                          <span className="block truncate opacity-80">
                            {ev.location || kindLabels[ev.kind] || ev.kind}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modalState && (
        <EventModal
          key={modalState.event?.id ?? "new"}
          event={modalState.event}
          defaultStart={modalState.defaultStart}
          allEvents={events}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}
