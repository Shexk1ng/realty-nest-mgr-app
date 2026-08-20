"use client";

// Tablica kanban lejka sprzedaży z przenoszeniem szans między etapami

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useSession } from "next-auth/react";
import { roleIs } from "@/lib/roles";
import { AlertTriangle, Building2, GitBranch, GripVertical, Plus, Radio, Trash2, User } from "lucide-react";
import {
  Alert,
  AlertDialog,
  Button,
  EmptyState,
  Label,
  ListBox,
  ListBoxItem,
  Modal,
  Select,
  Spinner,
  Input,
} from "@heroui/react";
import {
  ADD_LEAD,
  DELETE_LEAD,
  GET_LEADS,
  UPDATE_LEAD,
  type PipelineLead,
} from "@/lib/graphql/queries/leads";
import { LeadPreview } from "@/components/dashboard/lead-preview";
import { fmtMoney } from "@/lib/dashboard-format";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-context";

function optionalText(t: (key: string) => string, key: string): string {
  const value = t(key);
  return value === key ? "" : value;
}

const SETTLED_STAGES = new Set(["CLOSED", "LOST"]);

const STAGES = [
  { value: "NEW", accent: "bg-sky-500" },
  { value: "QUALIFYING", accent: "bg-violet-500" },
  { value: "SHOWING", accent: "bg-amber-500" },
  { value: "NURTURE", accent: "bg-slate-400" },
  { value: "OFFER", accent: "bg-orange-500" },
  { value: "CLOSED", accent: "bg-emerald-500" },
  { value: "LOST", accent: "bg-rose-500" },
] as const;

function buildStages(t: (k: string) => string) {
  return STAGES.map((s) => ({ ...s, label: t(`common.status.${s.value}`) }));
}

interface LeadFormState {
  title: string;
  stage: string;
  source: string;
  estValue: string;
}

function LeadModal({
  lead,
  defaultStage,
  onClose,
}: {
  lead: PipelineLead | null;
  defaultStage: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const stages = buildStages(t);
  const isEdit = Boolean(lead);
  const [baseline] = useState<LeadFormState>(() =>
    lead
      ? { title: lead.title, stage: lead.stage, source: lead.source ?? "", estValue: String(lead.estValue ?? "") }
      : { title: "", stage: defaultStage, source: "", estValue: "" },
  );
  const [values, setValues] = useState<LeadFormState>(() => baseline);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k: keyof LeadFormState, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const [runCreate, createState] = useMutation(ADD_LEAD, { refetchQueries: [GET_LEADS] });
  const [runUpdate, updateState] = useMutation(UPDATE_LEAD, { refetchQueries: [GET_LEADS] });
  const [runDelete, deleteState] = useMutation(DELETE_LEAD, { refetchQueries: [GET_LEADS] });
  const busy = createState.loading || updateState.loading || deleteState.loading;

  const { data: session } = useSession();
  const mayDelete = roleIs.canDelete(session?.user?.role);

  const dirty = (Object.keys(values) as (keyof LeadFormState)[]).some(
    (k) => values[k] !== baseline[k],
  );
  const unsavedLabel = optionalText(t, "common.crud.unsavedIndicator");

  const requestClose = () => {
    if (busy) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const previewValues: Record<string, unknown> = { ...(lead ?? {}), ...values };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) { setError(t("dashboard.pipelineBoard.errTitleRequired")); return; }
    setError(null);
    const vars = {
      title: values.title.trim(),
      stage: values.stage,
      source: values.source || null,
      estValue: values.estValue === "" ? null : Number(values.estValue),
    };
    try {
      if (isEdit) await runUpdate({ variables: { id: lead!.id, ...vars } });
      else await runCreate({ variables: vars });
      toast.success(t(isEdit ? "dashboard.pipelineBoard.toastUpdated" : "dashboard.pipelineBoard.toastCreated"));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.pipelineBoard.errSave"));
    }
  };

  const remove = async () => {
    if (!lead) return;
    try {
      await runDelete({ variables: { id: lead.id } });
      setConfirmDelete(false);
      toast.success(t("dashboard.pipelineBoard.toastDeleted"));
      onClose();
    } catch (err) {
      setConfirmDelete(false);
      setError(err instanceof Error ? err.message : t("dashboard.pipelineBoard.errDelete"));
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
              <Modal.Heading>{t(isEdit ? "dashboard.pipelineBoard.editLead" : "dashboard.pipelineBoard.newLead")}</Modal.Heading>
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
                <LeadPreview values={previewValues} mode={isEdit ? "edit" : "new"} />
              </aside>

              <div className="scrollbar flex min-h-0 flex-col gap-4 lg:overflow-y-auto lg:border-l lg:border-l-border lg:pl-5 lg:pr-1">
                {error && (
                  <Alert status="danger">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{error}</span>
                  </Alert>
                )}
                <form onSubmit={submit} id="lead-form" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="lead-title" isRequired>{t("dashboard.pipelineBoard.fieldTitle")}</Label>
                    <Input id="lead-title" value={values.title} placeholder={t("dashboard.pipelineBoard.titlePlaceholder")} onChange={(e) => set("title", e.target.value)} />
                    <span className="text-xs text-text-3">{t("dashboard.pipelineBoard.titleHint")}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>{t("dashboard.pipelineBoard.fieldStage")}</Label>
                    <Select selectedKey={values.stage} onSelectionChange={(k) => set("stage", k as string)} fullWidth>
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {stages.map((s) => <ListBoxItem key={s.value} id={s.value}>{s.label}</ListBoxItem>)}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lead-value">{t("dashboard.pipelineBoard.fieldEstValue")}</Label>
                    <Input id="lead-value" type="number" min={0} value={values.estValue} onChange={(e) => set("estValue", e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="lead-source">{t("dashboard.pipelineBoard.fieldSource")}</Label>
                    <Input id="lead-source" value={values.source} placeholder={t("dashboard.pipelineBoard.sourcePlaceholder")} onChange={(e) => set("source", e.target.value)} />
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
              <Button variant="primary" type="submit" form="lead-form" isDisabled={busy}>
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
                          {t("common.crud.deleteHeading").replace("{label}", lead?.title ?? "")}
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

function leadAgeDays(createdAt: string | null | undefined): number | null {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return null;
  const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return Math.max(0, Math.round((midnight(new Date()) - midnight(created)) / 86_400_000));
}

function LeadCard({ lead, onOpen }: { lead: PipelineLead; onOpen: () => void }) {
  const { t } = useI18n();
  const age = leadAgeDays(lead.createdAt);
  const ageText =
    age == null
      ? ""
      : age === 0
        ? t("dashboard.pipelineBoard.cardAgeToday")
        : age === 1
          ? t("dashboard.pipelineBoard.cardAgeOneDay")
          : t("dashboard.pipelineBoard.cardAgeDays").replace("{n}", String(age));

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onOpen}
      className="group cursor-grab rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-foreground">{lead.title}</p>
        <GripVertical size={13} className="mt-0.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </div>
      {lead.estValue != null && lead.estValue > 0 && (
        <p className="mt-1 text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{fmtMoney(lead.estValue)}</p>
      )}
      <div className="mt-2 flex flex-col gap-1">
        {lead.contactName && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <User size={11} className="shrink-0" aria-hidden /><span className="truncate">{lead.contactName}</span>
          </span>
        )}
        {lead.propertyTitle && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Building2 size={11} className="shrink-0" aria-hidden /><span className="truncate">{lead.propertyTitle}</span>
          </span>
        )}
        {lead.source && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Radio size={11} className="shrink-0" aria-hidden /><span className="truncate">{lead.source}</span>
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] text-muted-foreground">
          #{lead.shortId}
          {ageText ? ` · ${ageText}` : ""}
        </span>
        {lead.agentName && (
          <span className="rn-badge chip-hue--slate shrink-0" title={lead.agentName}>
            {lead.agentName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

export function PipelineBoard() {
  const { t } = useI18n();
  const stages = buildStages(t);
  const { data, loading } = useQuery<{ getLeads: { items: PipelineLead[] } }>(GET_LEADS, {
    variables: { limit: 500 },
    fetchPolicy: "cache-and-network",
  });
  const [modalState, setModalState] = useState<{ lead: PipelineLead | null; stage: string } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [runUpdate] = useMutation(UPDATE_LEAD, { refetchQueries: [GET_LEADS] });

  const leads = useMemo(() => data?.getLeads.items ?? [], [data]);
  const byStage = useMemo(() => {
    const map = new Map<string, PipelineLead[]>();
    for (const l of leads) (map.get(l.stage) ?? map.set(l.stage, []).get(l.stage)!).push(l);
    return map;
  }, [leads]);

  const moveToStage = async (leadId: string, stage: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === stage) return;
    try {
      await runUpdate({ variables: { id: leadId, stage } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard.pipelineBoard.errMoveStage"));
    }
  };

  const openLeads = leads.filter((l) => !SETTLED_STAGES.has(l.stage));
  const openValue = openLeads.reduce((sum, l) => sum + (l.estValue ?? 0), 0);
  const wonValue = leads
    .filter((l) => l.stage === "CLOSED")
    .reduce((sum, l) => sum + (l.estValue ?? 0), 0);

  const isEmpty = !loading && leads.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[11px] text-muted-foreground">
          {t("dashboard.pipelineBoard.summaryOpen")}{" "}
          <span className="font-semibold text-foreground">{openLeads.length}</span>
        </span>
        <span className="text-[11px] text-muted-foreground">
          {t("dashboard.pipelineBoard.summaryOpenValue")}{" "}
          <span className="font-semibold tabular-nums text-foreground">{fmtMoney(openValue)}</span>
        </span>
        <span className="text-[11px] text-muted-foreground">
          {t("dashboard.pipelineBoard.summaryWonValue")}{" "}
          <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {fmtMoney(wonValue)}
          </span>
        </span>
        {loading && <Spinner size="sm" />}
        <Button variant="primary" size="sm" className="ml-auto" onPress={() => setModalState({ lead: null, stage: "NEW" })}>
          <Plus size={14} /> {t("dashboard.pipelineBoard.newLead")}
        </Button>
      </div>

      {isEmpty ? (
        <EmptyState className="rounded-2xl border border-border/60 py-16">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <GitBranch className="h-6 w-6" aria-hidden />
          </span>
          <span className="font-medium text-foreground">{t("dashboard.pipelineBoard.emptyTitle")}</span>
          <span className="max-w-sm text-center text-sm text-muted-foreground">
            {t("dashboard.pipelineBoard.emptyHint")}
          </span>
          <Button variant="primary" size="sm" className="mt-1" onPress={() => setModalState({ lead: null, stage: "NEW" })}>
            <Plus size={14} /> {t("dashboard.pipelineBoard.newLead")}
          </Button>
        </EmptyState>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stages.map((stage) => {
            const items = byStage.get(stage.value) ?? [];
            const total = items.reduce((sum, l) => sum + (l.estValue ?? 0), 0);
            return (
              <div
                key={stage.value}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.value); }}
                onDragLeave={() => setDragOverStage((s) => (s === stage.value ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const leadId = e.dataTransfer.getData("text/plain");
                  if (leadId) void moveToStage(leadId, stage.value);
                }}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-2xl border border-border/60 bg-muted/20 transition-colors",
                  dragOverStage === stage.value && "border-primary/60 bg-primary/5",
                )}
              >
                <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
                  <span className={cn("h-2 w-2 rounded-full", stage.accent)} aria-hidden />
                  <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                  <span className="rn-badge chip-hue--slate ml-auto">{items.length}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label={t("dashboard.pipelineBoard.addToStage").replace("{stage}", stage.label)}
                    onPress={() => setModalState({ lead: null, stage: stage.value })}
                  >
                    <Plus size={13} />
                  </Button>
                </div>
                {total > 0 && (
                  <div className="border-b border-border/60 px-3 py-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                    {fmtMoney(total)}
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 p-2.5" style={{ minHeight: 120 }}>
                  {items.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} onOpen={() => setModalState({ lead, stage: lead.stage })} />
                  ))}
                  {items.length === 0 && (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/50 px-2 py-6 text-center text-[11px] text-muted-foreground">
                      {t("dashboard.pipelineBoard.dropHere")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalState && (
        <LeadModal
          key={modalState.lead?.id ?? "new"}
          lead={modalState.lead}
          defaultStage={modalState.stage}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}
