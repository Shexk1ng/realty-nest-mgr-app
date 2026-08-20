"use client";

// Lista powiadomień w górnym pasku, odświeżana cyklicznym odpytywaniem serwera

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@apollo/client/react";
import { Bell, Handshake, Inbox, ListChecks } from "lucide-react";
import { Button, Popover } from "@heroui/react";
import { useI18n } from "@/i18n/i18n-context";
import { GET_ENQUIRIES } from "@/lib/graphql/queries/enquiries";
import { GET_TASKS } from "@/lib/graphql/queries/tasks";
import { GET_PROPSHARE_OFFERS } from "@/lib/graphql/queries/propshare";

const POLL_MS = 60_000;

interface EnquiryRow { id: string; shortId: number; name: string; status: string | null; createdAt: string | null }
interface TaskRow { id: string; shortId: number; title: string; status: string | null; dueAt: string | null }
interface OfferRow { id: string; toAgentId: string | null; status: string | null; fromAgentName: string | null }

interface Item {
  key: string;
  icon: typeof Inbox;
  label: string;
  detail: string;
  href: string;
}

function isOverdue(dueAt: string | null): boolean {
  return dueAt != null && new Date(dueAt).getTime() < Date.now();
}

export function NotificationsPanel({ isAdmin }: { isAdmin: boolean }) {
  const { t, localeHref } = useI18n();
  const { data: session } = useSession();
  const myId = session?.user?.id;

  const opts = { fetchPolicy: "cache-and-network" as const, errorPolicy: "all" as const, pollInterval: POLL_MS };

  const enquiriesQ = useQuery<{ getEnquiries: { items: EnquiryRow[] } }>(GET_ENQUIRIES, {
    ...opts,
    variables: { limit: 30 },
  });
  const tasksQ = useQuery<{ getTasks: { items: TaskRow[] } }>(GET_TASKS, { ...opts, variables: { limit: 30 } });
  const offersQ = useQuery<{ getPropShareOffers: OfferRow[] }>(GET_PROPSHARE_OFFERS, opts);

  const newEnquiries = (enquiriesQ.data?.getEnquiries?.items ?? []).filter((e) => e.status === "NEW");
  const overdueTasks = (tasksQ.data?.getTasks?.items ?? []).filter(
    (t) => t.status !== "DONE" && isOverdue(t.dueAt),
  );
  const pendingOffers = (offersQ.data?.getPropShareOffers ?? []).filter(
    (o) => o.toAgentId === myId && (o.status === "PENDING" || o.status === "VIEWED"),
  );

  const items: Item[] = [
    ...newEnquiries.slice(0, 4).map((e) => ({
      key: `enq-${e.id}`,
      icon: Inbox,
      label: t("dashboard.notifications.itemNewEnquiry"),
      detail: `${e.name} · #${e.shortId}`,
      href: "/dashboard/enquiries",
    })),
    ...pendingOffers.slice(0, 4).map((o) => ({
      key: `ps-${o.id}`,
      icon: Handshake,
      label: t("dashboard.notifications.itemPropShareOffer"),
      detail: o.fromAgentName ?? t("dashboard.notifications.fromOtherAgency"),
      href: "/dashboard/propshare",
    })),
    ...overdueTasks.slice(0, 4).map((task) => ({
      key: `task-${task.id}`,
      icon: ListChecks,
      label: t("dashboard.notifications.itemOverdueTask"),
      detail: task.title,
      href: "/dashboard/tasks",
    })),
  ];

  const total = newEnquiries.length + pendingOffers.length + overdueTasks.length;

  return (
    <Popover.Root>
      <Popover.Trigger>
        <Button
          variant="ghost"
          isIconOnly
          aria-label={
            total > 0
              ? t("dashboard.notifications.ariaCount").replace("{count}", String(total))
              : t("dashboard.notifications.ariaNone")
          }
          className="relative"
        >
          <Bell size={16} strokeWidth={1.8} />
          {total > 0 && (
            <span
              className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-[var(--danger-ink)]"
              aria-hidden
            >
              {total > 9 ? "9+" : total}
            </span>
          )}
        </Button>
      </Popover.Trigger>

      <Popover.Content placement="bottom end" className="w-80 p-0">
        <Popover.Dialog>
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5">
            <span className="text-sm font-bold text-foreground">{t("dashboard.notifications.title")}</span>
            {total > 0 && <span className="rn-badge chip-hue--red">{total}</span>}
          </div>

          {items.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Bell size={28} className="mx-auto mb-2.5 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">{t("dashboard.notifications.empty")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("dashboard.notifications.emptyHint")}
              </p>
            </div>
          ) : (
            <ul className="max-h-80 divide-y divide-border/60 overflow-y-auto">
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <li key={it.key}>
                    <Link
                      href={localeHref(it.href)}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <Icon size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-foreground">{it.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{it.detail}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {isAdmin && (
            <div className="px-3 pb-3 pt-2">
              <Link
                href={localeHref("/dashboard/security")}
                className="block rounded-lg bg-primary/12 px-3 py-2.5 text-center text-xs font-semibold text-primary transition-colors hover:bg-primary/18"
              >
                {t("dashboard.notifications.auditLog")} →
              </Link>
            </div>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover.Root>
  );
}
