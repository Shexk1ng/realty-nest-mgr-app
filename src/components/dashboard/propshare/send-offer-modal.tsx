"use client";

// Okno wysyłki propozycji współpracy PropShare z ustaleniem podziału prowizji

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@apollo/client/react";
import Image from "next/image";
import { Button, ListBox, ListBoxItem, Modal, Select, TextArea } from "@heroui/react";
import { Building2, ImageOff, MapPin, Percent, Sparkles } from "lucide-react";
import {
  GET_PROPSHARE_OFFERS,
  SEND_PROPSHARE_OFFER,
  scoreMatch,
  type PropShareProperty,
} from "@/lib/graphql/queries/propshare";
import { toast } from "@/components/ui/toast";
import { isSeedImage } from "@/lib/images";
import { useI18n } from "@/i18n/i18n-context";
import { formatPrice, propertyTypeLabel, transactionTypeLabel } from "./listing-card";

export interface EnquiryOption {
  id: string;
  name: string;
  budget: number | null;
  location: string | null;
  propertyInterest: string | null;
}

const COMMISSION_PRESETS = [1.5, 2, 2.5, 3];
const DEFAULT_COMMISSION = 2;
const COMMISSION_SCALE = COMMISSION_PRESETS[COMMISSION_PRESETS.length - 1];

function decimal(value: number): string {
  return value.toString().replace(".", ",");
}

export function SendOfferModal({
  property,
  enquiries,
  onClose,
}: {
  property: PropShareProperty | null;
  enquiries: EnquiryOption[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [enquiryId, setEnquiryId] = useState("");
  const [commission, setCommission] = useState(DEFAULT_COMMISSION);
  const [message, setMessage] = useState("");
  const [brokenPhotoId, setBrokenPhotoId] = useState<string | null>(null);
  const [semanticMatch, setSemanticMatch] = useState<{ propertyId: string; scores: Record<string, number> } | null>(null);
  const [matchingWithAi, setMatchingWithAi] = useState(false);
  const semanticScores = semanticMatch && semanticMatch.propertyId === property?.id ? semanticMatch.scores : null;

  const [send, { loading }] = useMutation(SEND_PROPSHARE_OFFER, {
    refetchQueries: [{ query: GET_PROPSHARE_OFFERS }],
  });

  useEffect(() => {
    if (!property || enquiries.length === 0) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flips a loading flag for the fetch started right below, not derived render state
    setMatchingWithAi(true);
    fetch("/api/ai/smart-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property: {
          title: property.title,
          location: property.location,
          propertyType: property.propertyType,
          price: property.price,
          area: property.area,
          rooms: property.rooms,
          features: property.features,
          address: property.address,
        },
        enquiries: enquiries.map((e) => ({
          id: e.id,
          budget: e.budget,
          location: e.location,
          propertyInterest: e.propertyInterest,
        })),
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { scores?: Record<string, number> } | null) => {
        if (!cancelled && data?.scores) setSemanticMatch({ propertyId: property.id, scores: data.scores });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMatchingWithAi(false);
      });

    return () => {
      cancelled = true;
    };
  }, [property, enquiries]);

  const ranked = useMemo(() => {
    if (!property) return [];
    return [...enquiries]
      .map((e) => ({
        enquiry: e,
        score: semanticScores?.[e.id] ?? scoreMatch(property, e),
      }))
      .sort((a, b) => b.score - a.score);
  }, [enquiries, property, semanticScores]);

  const selectedEnquiry = enquiries.find((e) => e.id === enquiryId) ?? null;

  const close = () => {
    setEnquiryId("");
    setMessage("");
    setCommission(DEFAULT_COMMISSION);
    onClose();
  };

  const submit = async () => {
    if (!property) return;
    try {
      await send({
        variables: {
          propertyId: property.id,
          enquiryId: enquiryId || null,
          message: message.trim() || null,
          proposedCommission: commission,
        },
      });
      toast.success(t("dashboard.propshare.toastSent"));
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dashboard.propshare.toastSendError"));
    }
  };

  const source = property?.imageUrl ?? property?.images?.[0] ?? null;
  const photo = property && brokenPhotoId === property.id ? null : source;
  const price = property ? formatPrice(property.price) : null;
  const location = property
    ? [property.address?.district, property.address?.city ?? property.location]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <Modal
      isOpen={property != null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="lg" scroll="inside" className="sm:w-full">
          <Modal.Dialog className="max-w-none sm:max-w-5xl">
            <Modal.Header>
              <Modal.Heading>{t("dashboard.propshare.offerModalTitle")}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
              {property && (
                <>
                  <aside
                    role="region"
                    aria-label={t("common.crud.previewTitle")}
                    className="scrollbar max-h-[45vh] min-h-0 space-y-4 overflow-y-auto rounded-xl border border-border bg-surface-hi p-4 lg:max-h-none"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
                      {t("dashboard.propshare.previewListing")}
                    </p>

                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-surface-2">
                      {photo ? (
                        <Image
                          src={photo}
                          alt=""
                          fill
                          sizes="(max-width: 1024px) 100vw, 22rem"
                          unoptimized={isSeedImage(photo)}
                          onError={() => setBrokenPhotoId(property.id)}
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-text-3">
                          <ImageOff className="h-7 w-7" aria-hidden />
                        </div>
                      )}
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/70 to-transparent"
                        aria-hidden
                      />
                      <p className="absolute inset-x-0 bottom-0 p-3 text-base font-semibold leading-tight text-white">
                        {price ?? t("dashboard.propshare.priceOnRequest")}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-foreground">
                        {property.title}
                      </h3>
                      <p className="flex items-center gap-1.5 text-xs text-text-3">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {location || t("dashboard.propshare.locationUnknown")}
                      </p>
                    </div>

                    <ul className="flex flex-wrap gap-1.5">
                      {(
                        [
                          ["transaction", transactionTypeLabel(t, property.transactionType)],
                          ["type", propertyTypeLabel(t, property.propertyType)],
                          ["area", property.area != null ? `${property.area} m²` : null],
                          [
                            "rooms",
                            property.rooms != null
                              ? `${property.rooms} ${t("dashboard.properties.roomsShort")}`
                              : null,
                          ],
                        ] as [string, string | null][]
                      )
                        .filter((entry): entry is [string, string] => Boolean(entry[1]))
                        .map(([key, text]) => (
                          <li key={key} className="rn-badge chip-hue--slate">
                            {text}
                          </li>
                        ))}
                    </ul>

                    <div className="rounded-xl border border-border bg-surface p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
                        {t("dashboard.propshare.previewCounterparty")}
                      </p>
                      <p className="mt-1.5 truncate text-sm font-medium text-foreground">
                        {property.ownerAgentName ?? t("dashboard.propshare.agentFallback")}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-text-3">
                        <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {property.ownerCompanyName ?? "—"}
                      </p>
                    </div>

                    {property.propShareNotes && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
                          {t("dashboard.propshare.previewNotes")}
                        </p>
                        <p className="text-xs italic leading-relaxed text-text-2">
                          „{property.propShareNotes}”
                        </p>
                      </div>
                    )}

                    <div className="space-y-2 border-t border-border pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
                        {t("dashboard.propshare.summaryTitle")}
                      </p>

                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs text-text-3">
                          {t("dashboard.propshare.summaryCommission")}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {decimal(commission)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border" aria-hidden>
                        <div
                          className="h-full rounded-full transition-[width] duration-300 ease-out"
                          style={{
                            width: `${Math.min(100, (commission / COMMISSION_SCALE) * 100)}%`,
                            background: "var(--accent)",
                          }}
                        />
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <span className="shrink-0 text-xs text-text-3">
                          {t("dashboard.propshare.summaryEnquiry")}
                        </span>
                        <span className="min-w-0 truncate text-xs font-medium text-foreground">
                          {selectedEnquiry?.name ?? t("dashboard.propshare.summaryEnquiryNone")}
                        </span>
                      </div>

                      <p className="text-xs italic leading-relaxed text-text-2">
                        {message.trim()
                          ? `„${message.trim()}”`
                          : t("dashboard.propshare.summaryMessageNone")}
                      </p>
                    </div>
                  </aside>

                  <div className="scrollbar flex min-h-0 flex-col gap-5 lg:overflow-y-auto lg:border-l lg:border-l-border lg:pl-5 lg:pr-1">
                    <div className="space-y-2">
                      <label
                        htmlFor="ps-enquiry"
                        className="flex items-center gap-1.5 text-sm font-medium text-foreground"
                      >
                        {t("dashboard.propshare.fieldEnquiry")}
                        {matchingWithAi && (
                          <span className="inline-flex items-center gap-1 text-xs font-normal text-text-3">
                            <Sparkles className="h-3 w-3 animate-pulse" aria-hidden />
                            {t("dashboard.propshare.aiMatching")}
                          </span>
                        )}
                      </label>
                      <Select
                        id="ps-enquiry"
                        fullWidth
                        selectedKey={enquiryId || "__none"}
                        onSelectionChange={(k) => setEnquiryId(String(k) === "__none" ? "" : String(k))}
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            <ListBoxItem id="__none">
                              {t("dashboard.propshare.enquiryNone")}
                            </ListBoxItem>
                            {ranked.map(({ enquiry, score }) => (
                              <ListBoxItem key={enquiry.id} id={enquiry.id}>
                                {enquiry.name}
                                {enquiry.budget
                                  ? ` · ${t("dashboard.propshare.enquiryBudgetUpTo").replace(
                                      "{value}",
                                      Math.round(enquiry.budget).toLocaleString("pl-PL"),
                                    )}`
                                  : ""}
                                {score > 0
                                  ? ` · ${t("dashboard.propshare.enquiryMatch").replace(
                                      "{score}",
                                      String(score),
                                    )}`
                                  : ""}
                              </ListBoxItem>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      <p className="text-xs text-text-3">{t("dashboard.propshare.enquiryHint")}</p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-sm font-medium text-foreground">
                        {t("dashboard.propshare.fieldCommission")}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {COMMISSION_PRESETS.map((v) => (
                          <Button
                            key={v}
                            size="sm"
                            variant={commission === v ? "primary" : "ghost"}
                            onPress={() => setCommission(v)}
                          >
                            <Percent className="h-3.5 w-3.5" aria-hidden /> {decimal(v)}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-text-3">
                        {t("dashboard.propshare.commissionHint")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="ps-message" className="text-sm font-medium text-foreground">
                        {t("dashboard.propshare.fieldMessage")}
                      </label>
                      <TextArea
                        id="ps-message"
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t("dashboard.propshare.messagePlaceholder")}
                      />
                    </div>
                  </div>
                </>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button variant="ghost" size="sm" onPress={close} isDisabled={loading}>
                {t("common.crud.cancel")}
              </Button>
              <Button variant="primary" size="sm" onPress={submit} isDisabled={loading || !property}>
                {loading
                  ? t("dashboard.propshare.submitting")
                  : t("dashboard.propshare.submitOffer")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
