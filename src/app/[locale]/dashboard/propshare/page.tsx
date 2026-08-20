"use client";

// Sieć PropShare: wymiana ofert między firmami, obsługa ofert i kolejka przydziału agentów

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery } from "@apollo/client/react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Handshake,
  Inbox,
  Percent,
  Share2,
  Store,
  Users,
} from "lucide-react";
import { Button, Tabs } from "@heroui/react";
import {
  GET_ALLOCATION_QUEUE,
  GET_PROPSHARE_LISTINGS,
  GET_PROPSHARE_OFFERS,
  UPDATE_PROPSHARE_OFFER,
  scoreMatch,
  type AllocationAgent,
  type PropShareOffer,
  type PropShareProperty,
} from "@/lib/graphql/queries/propshare";
import { GET_ENQUIRIES } from "@/lib/graphql/queries/enquiries";
import { Panel, StatWidget } from "@/components/dashboard/panel";
import { ListingCard } from "@/components/dashboard/propshare/listing-card";
import { OfferCard } from "@/components/dashboard/propshare/offer-card";
import { SendOfferModal, type EnquiryOption } from "@/components/dashboard/propshare/send-offer-modal";
import { toast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { canManagePropShare, roleIs } from "@/lib/roles";
import { useI18n } from "@/i18n/i18n-context";

function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hi text-text-3">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{hint}</p>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

function AllocationQueue({ agents }: { agents: AllocationAgent[] }) {
  const { t, locale } = useI18n();
  const ordered = useMemo(
    () =>
      [...agents].sort(
        (a, b) => (a.allocationQueueOrder ?? 999) - (b.allocationQueueOrder ?? 999) || a.name.localeCompare(b.name),
      ),
    [agents],
  );

  const nextUp = useMemo(() => {
    const eligible = ordered.filter((a) => a.allocationEnabled);
    if (eligible.length === 0) return null;
    return eligible.reduce((oldest, a) => {
      const ts = a.lastAllocatedAt ? new Date(a.lastAllocatedAt).getTime() : 0;
      const best = oldest.lastAllocatedAt ? new Date(oldest.lastAllocatedAt).getTime() : 0;
      return ts < best ? a : oldest;
    });
  }, [ordered]);

  if (ordered.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Users}
          title={t("dashboard.propshare.queueEmpty")}
          hint={t("dashboard.propshare.queueEmptyHint")}
        />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/60">
      {ordered.map((a) => {
        const last = a.lastAllocatedAt
          ? new Date(a.lastAllocatedAt).toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL", {
              day: "2-digit",
              month: "short",
            })
          : "—";
        return (
          <li key={a.agentId} className="flex items-center gap-3 px-4 py-3">
            <span className="w-6 shrink-0 text-center text-xs font-semibold text-muted-foreground">
              {a.allocationQueueOrder ?? "—"}
            </span>
            <Avatar src={a.avatarUrl} name={a.name} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.propshare.queueLastAllocated")}: {last}
              </p>
            </div>
            {nextUp?.agentId === a.agentId && (
              <span className="rn-badge chip-hue--blue shrink-0">{t("dashboard.propshare.queueNextUp")}</span>
            )}
            {!a.allocationEnabled && (
              <span className="rn-badge chip-hue--slate shrink-0">{t("dashboard.propshare.queueDisabled")}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function PropSharePage() {
  const { t, locale, localeHref } = useI18n();
  const { data: session } = useSession();
  const viewer = session?.user;
  const myId = viewer?.id;
  const myCompanyId = viewer?.companyId ?? null;

  const scopeId = roleIs.assistant(viewer?.role) ? (viewer?.assignedAgentId ?? null) : (myId ?? null);
  const canSeeQueue = roleIs.canManageUsers(viewer?.role);
  const unassignedAssistant = roleIs.assistant(viewer?.role) && !viewer?.assignedAgentId;

  const [tab, setTab] = useState("network");
  const [offerTarget, setOfferTarget] = useState<PropShareProperty | null>(null);

  const listingsQ = useQuery<{ getPropShareListings: PropShareProperty[] }>(GET_PROPSHARE_LISTINGS, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const offersQ = useQuery<{ getPropShareOffers: PropShareOffer[] }>(GET_PROPSHARE_OFFERS, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const queueQ = useQuery<{ getAllocationQueue: AllocationAgent[] }>(GET_ALLOCATION_QUEUE, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
    skip: !canSeeQueue,
  });
  const enquiriesQ = useQuery<{
    getEnquiries: { items: (EnquiryOption & { status: string | null })[] };
  }>(GET_ENQUIRIES, { fetchPolicy: "cache-and-network", errorPolicy: "all", variables: { limit: 30 } });

  const [respond, { loading: responding }] = useMutation(UPDATE_PROPSHARE_OFFER, {
    refetchQueries: [{ query: GET_PROPSHARE_OFFERS }],
  });

  const listings = useMemo(() => listingsQ.data?.getPropShareListings ?? [], [listingsQ.data]);
  const offers = useMemo(() => offersQ.data?.getPropShareOffers ?? [], [offersQ.data]);
  const queue = queueQ.data?.getAllocationQueue ?? [];

  const openEnquiries = useMemo(
    () =>
      (enquiriesQ.data?.getEnquiries?.items ?? []).filter(
        (e) => e.status !== "LOST" && e.status !== "CLOSED",
      ),
    [enquiriesQ.data],
  );

  const { incoming, outgoing } = useMemo(
    () => ({
      incoming: offers.filter((o) => o.toAgentId === scopeId),
      outgoing: offers.filter((o) => o.fromAgentId === scopeId),
    }),
    [offers, scopeId],
  );

  const offeredPropertyIds = useMemo(
    () => new Set(outgoing.map((o) => o.propertyId)),
    [outgoing],
  );

  const network = useMemo(
    () =>
      listings.map((p) => ({
        property: p,
        isOwn: myCompanyId != null && p.companyId === myCompanyId,
        canManage: canManagePropShare(viewer, p),
        matchCount: openEnquiries.filter((e) => scoreMatch(p, e) >= 70).length,
      })),
    [listings, myCompanyId, openEnquiries, viewer],
  );

  const sortedNetwork = useMemo(
    () =>
      [...network].sort((a, b) => {
        if (a.isOwn !== b.isOwn) return a.isOwn ? 1 : -1;
        return b.matchCount - a.matchCount;
      }),
    [network],
  );

  const pendingIncoming = incoming.filter((o) => o.status === "PENDING" || o.status === "VIEWED");
  const accepted = offers.filter((o) => o.status === "ACCEPTED");
  const avgCommission = useMemo(() => {
    const vals = offers.map((o) => o.proposedCommission).filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }, [offers]);

  const onRespond = async (offerId: string, status: "ACCEPTED" | "REJECTED") => {
    try {
      await respond({ variables: { offerId, status } });
      toast.success(
        status === "ACCEPTED"
          ? t("dashboard.propshare.toastAccepted")
          : t("dashboard.propshare.toastRejected"),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dashboard.propshare.toastError"));
    }
  };

  const externalCount = network.filter((n) => !n.isOwn).length;

  const shareListingLink = (
    <Link
      href={localeHref("/dashboard/properties")}
      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
    >
      {t("dashboard.propshare.emptyShareAction")}
    </Link>
  );

  return (
    <div className="space-y-6 pb-10">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2.5 font-display text-3xl font-semibold tracking-tight text-foreground">
          <Share2 className="h-7 w-7 text-primary" aria-hidden /> PropShare
        </h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.propshare.description")}</p>
      </header>

      {unassignedAssistant && (
        <p
          className="rounded-xl border border-warn px-4 py-3 text-sm text-text-2"
          style={{ background: "var(--warn-soft)" }}
          role="status"
        >
          {t("dashboard.propshare.unassignedAssistant")}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatWidget icon={Store} tone="accent" label={t("dashboard.propshare.statListings")} value={externalCount} />
        <StatWidget icon={Inbox} tone="amber" label={t("dashboard.propshare.statPending")} value={pendingIncoming.length} />
        <StatWidget icon={Handshake} tone="green" label={t("dashboard.propshare.statAccepted")} value={accepted.length} />
        <StatWidget
          icon={Percent}
          tone="violet"
          label={t("dashboard.propshare.statAvgCommission")}
          value={
            avgCommission != null
              ? `${avgCommission.toLocaleString(locale === "en" ? "en-GB" : "pl-PL", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}%`
              : "—"
          }
        />
      </div>

      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))}>
        <Tabs.List aria-label={t("dashboard.propshare.tabsLabel")}>
          <Tabs.Tab id="network">
            <Tabs.Indicator />
            {t("dashboard.propshare.tabNetwork")} ({externalCount})
          </Tabs.Tab>
          <Tabs.Tab id="incoming">
            <Tabs.Indicator />
            {t("dashboard.propshare.tabIncoming")} ({incoming.length})
          </Tabs.Tab>
          <Tabs.Tab id="outgoing">
            <Tabs.Indicator />
            {t("dashboard.propshare.tabOutgoing")} ({outgoing.length})
          </Tabs.Tab>
          {canSeeQueue && (
            <Tabs.Tab id="queue">
              <Tabs.Indicator />
              {t("dashboard.propshare.queueTitle")}
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel id="network" className="pt-5">
          {sortedNetwork.length === 0 ? (
            <EmptyState
              icon={Store}
              title={t("dashboard.propshare.networkEmpty")}
              hint={t("dashboard.propshare.networkEmptyHint")}
              action={shareListingLink}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedNetwork.map(({ property, isOwn, canManage, matchCount }) => (
                <ListingCard
                  key={property.id}
                  property={property}
                  isOwn={isOwn}
                  canManage={canManage}
                  canSendOffer={!unassignedAssistant}
                  matchCount={matchCount}
                  alreadyOffered={offeredPropertyIds.has(property.id)}
                  onSendOffer={() => setOfferTarget(property)}
                />
              ))}
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel id="incoming" className="pt-5">
          <Panel
            title={t("dashboard.propshare.incomingTitle")}
            description={t("dashboard.propshare.incomingDescription")}
            icon={ArrowDownLeft}
            flush
            bodyClassName="p-4"
          >
            {incoming.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={t("dashboard.propshare.incomingEmpty")}
                hint={t("dashboard.propshare.incomingEmptyHint")}
                action={shareListingLink}
              />
            ) : (
              <ul className="space-y-3">
                {incoming.map((o) => (
                  <OfferCard
                    key={o.id}
                    offer={o}
                    incoming
                    busy={responding}
                    onRespond={(s) => onRespond(o.id, s)}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </Tabs.Panel>

        <Tabs.Panel id="outgoing" className="pt-5">
          <Panel
            title={t("dashboard.propshare.outgoingTitle")}
            description={t("dashboard.propshare.outgoingDescription")}
            icon={ArrowUpRight}
            flush
            bodyClassName="p-4"
          >
            {outgoing.length === 0 ? (
              <EmptyState
                icon={ArrowUpRight}
                title={t("dashboard.propshare.outgoingEmpty")}
                hint={t("dashboard.propshare.outgoingEmptyHint")}
                action={
                  <Button size="sm" variant="ghost" onPress={() => setTab("network")}>
                    <Store className="h-3.5 w-3.5" aria-hidden />
                    {t("dashboard.propshare.outgoingEmptyAction")}
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {outgoing.map((o) => (
                  <OfferCard key={o.id} offer={o} incoming={false} />
                ))}
              </ul>
            )}
          </Panel>
        </Tabs.Panel>

        {canSeeQueue && (
          <Tabs.Panel id="queue" className="pt-5">
            <Panel
              title={t("dashboard.propshare.queueTitle")}
              description={t("dashboard.propshare.queueDescription")}
              icon={Users}
              flush
            >
              <AllocationQueue agents={queue} />
            </Panel>
          </Tabs.Panel>
        )}
      </Tabs>

      <SendOfferModal
        property={offerTarget}
        enquiries={openEnquiries}
        onClose={() => setOfferTarget(null)}
      />
    </div>
  );
}
