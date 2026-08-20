"use client";

// Dodawanie i edycja oferty: dane, zdjęcia i opis z AI; błąd geokodowania nie blokuje zapisu

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  Share2,
  Sparkles,
  Star,
  Wand2,
  X,
} from "lucide-react";
import {
  Button,
  Input,
  InputGroup,
  Label,
  ListBox,
  ListBoxItem,
  Select,
  TextArea,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import {
  ADD_PROPERTY,
  GET_PROPERTIES,
  GET_PROPERTY_BY_ID,
  UPDATE_PROPERTY,
  type Property,
} from "@/lib/graphql/queries/properties";
import { GET_PROPSHARE_OFFER_COUNT, TOGGLE_PROPSHARE } from "@/lib/graphql/queries/propshare";
import { GET_USERS, type User } from "@/lib/graphql/queries/users";
import { canManagePropShare, roleIs } from "@/lib/roles";
import {
  CONDITIONS,
  ENERGY_CLASSES,
  FEATURE_TAGS,
  HEATING_TYPES,
  MARKET_TYPES,
  OWNERSHIP_TYPES,
  PROPERTY_TYPES,
  STATUSES,
  TRANSACTION_TYPES,
} from "@/lib/property-options";
import { ALLOWED_IMAGE_HOSTS, isAllowedImageUrl } from "@/lib/images";
import { PropertyPreview, type PropertyDraft } from "@/components/dashboard/property-preview";
import { ImageDropzone } from "@/components/uploads/image-dropzone";
import {
  DESC_SECTIONS,
  generateDescription,
  type DescSection,
  type GenerateTone,
} from "@/lib/ai/description";
import { useI18n } from "@/i18n/i18n-context";
import { PropertyValuation } from "@/components/dashboard/property-valuation";
import { Toggle } from "@/components/ui/toggle";

interface FormState {
  title: string;
  agentId: string;
  transactionType: string;
  propertyType: string;
  market: string;
  status: string;
  price: string;
  monthlyRent: string;
  deposit: string;
  location: string;
  street: string;
  district: string;
  city: string;
  postalCode: string;
  country: string;
  area: string;
  plotArea: string;
  rooms: string;
  bedrooms: string;
  bathrooms: string;
  floor: string;
  totalFloors: string;
  yearBuilt: string;
  condition: string;
  ownership: string;
  heating: string;
  energyClass: string;
  availableFrom: string;
  features: string[];
  images: string[];
  sections: Record<DescSection, string>;
  description: string;
}

const MAX_IMAGES = 30;

const EMPTY: FormState = {
  title: "", agentId: "",
  transactionType: "SALE", propertyType: "APARTMENT", market: "SECONDARY", status: "ACTIVE",
  price: "", monthlyRent: "", deposit: "",
  location: "", street: "", district: "", city: "", postalCode: "", country: "PL",
  area: "", plotArea: "", rooms: "", bedrooms: "", bathrooms: "", floor: "", totalFloors: "", yearBuilt: "",
  condition: "", ownership: "", heating: "", energyClass: "", availableFrom: "",
  features: [], images: [],
  sections: { intro: "", layout: "", location: "", additional: "" },
  description: "",
};

type Translate = (key: string) => string;

function buildOptions(t: Translate) {
  const map = (
    opts: { value: string; label: string }[],
    path: (value: string) => string,
  ) => opts.map((o) => ({ value: o.value, label: t(path(o.value)) }));

  return {
    transaction: map(TRANSACTION_TYPES, (v) => `dashboard.propertyForm.tx${v}`),
    propertyType: map(PROPERTY_TYPES, (v) => `dashboard.properties.type.${v}`),
    market: map(MARKET_TYPES, (v) => `dashboard.propertyForm.market${v}`),
    status: map(STATUSES, (v) => `common.status.${v}`),
    ownership: map(OWNERSHIP_TYPES, (v) => `dashboard.propertyForm.ownership${v}`),
    condition: map(CONDITIONS, (v) => `dashboard.propertyForm.condition${v}`),
    heating: map(HEATING_TYPES, (v) => `dashboard.propertyForm.heating${v}`),
    features: map(FEATURE_TAGS, (v) => `dashboard.propertyForm.feature${v.toUpperCase()}`),
    energyClass: ENERGY_CLASSES,
  };
}

function buildDescSections(t: Translate) {
  return DESC_SECTIONS.map((meta) => {
    const k = meta.id.charAt(0).toUpperCase() + meta.id.slice(1);
    return {
      id: meta.id,
      title: t(`dashboard.propertyForm.desc${k}Title`),
      help: t(`dashboard.propertyForm.desc${k}Help`),
      placeholder: t(`dashboard.propertyForm.desc${k}Placeholder`),
    };
  });
}

function normalizeNumeric(s: string): string {
  return s
    .replace(/[\s  ']/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
}

const parseNum = (s: string): number | null => {
  if (!s.trim()) return null;
  const cleaned = normalizeNumeric(s);
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
};

const num = (s: string): number | null => {
  const n = parseNum(s);
  return n == null || Number.isNaN(n) ? null : n;
};
const int = (s: string): number | null => {
  const n = parseNum(s);
  return n == null || Number.isNaN(n) ? null : Math.round(n);
};

function Field({
  label, htmlFor, required, hint, error, span, children,
}: {
  label: string; htmlFor?: string; required?: boolean; hint?: string; error?: string | null;
  span?: "2" | "full"; children: React.ReactNode;
}) {
  return (
    <div className={`rn-field${span === "2" ? " rn-col-span-2" : span === "full" ? " rn-col-span-full" : ""}`}>
      <Label htmlFor={htmlFor} isRequired={required} isInvalid={Boolean(error)}>
        {label}
      </Label>
      {children}
      {error ? (
        <span id={htmlFor ? `${htmlFor}-err` : undefined} className="rn-hint" style={{ color: "var(--danger)" }}>
          {error}
        </span>
      ) : (
        hint && <span id={htmlFor ? `${htmlFor}-hint` : undefined} className="rn-hint">{hint}</span>
      )}
    </div>
  );
}

function Picker({
  id, value, onChange, options, placeholder,
}: {
  id?: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <Select
      id={id}
      fullWidth
      selectedKey={value || "__none"}
      onSelectionChange={(k) => onChange(String(k) === "__none" ? "" : String(k))}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {placeholder ? <ListBoxItem id="__none">{placeholder}</ListBoxItem> : null}
          {options.map((o) => (
            <ListBoxItem key={o.value} id={o.value}>
              {o.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function NumInput({
  id, value, onChange, placeholder, suffix, invalid,
}: {
  id?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; suffix?: string; invalid?: boolean;
}) {
  const describedBy = id ? (invalid ? `${id}-err` : undefined) : undefined;
  if (!suffix) {
    return (
      <Input
        id={id}
        fullWidth
        inputMode="decimal"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    );
  }
  return (
    <InputGroup fullWidth>
      <InputGroup.Input
        id={id}
        inputMode="decimal"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <InputGroup.Suffix>{suffix}</InputGroup.Suffix>
    </InputGroup>
  );
}

function AiGenerator({
  facts, sections, setSection, onAssemble,
}: {
  facts: PropertyDraft;
  sections: Record<DescSection, string>;
  setSection: (s: DescSection, v: string) => void;
  onAssemble: () => void;
}) {
  const { t } = useI18n();
  const [tone, setTone] = useState<GenerateTone>("professional");
  const [notes, setNotes] = useState<Record<DescSection, string>>({ intro: "", layout: "", location: "", additional: "" });
  const [busy, setBusy] = useState<DescSection | "full" | null>(null);
  const [error, setError] = useState("");
  const descSections = buildDescSections(t);

  const aiFacts = {
    title: facts.title, transactionType: facts.transactionType, propertyType: facts.propertyType,
    market: facts.market, area: facts.area, plotArea: facts.plotArea, rooms: facts.rooms,
    bedrooms: facts.bedrooms, bathrooms: facts.bathrooms, floor: facts.floor, totalFloors: facts.totalFloors,
    yearBuilt: facts.yearBuilt, location: facts.location, district: facts.address?.district,
    city: facts.address?.city, price: facts.price, monthlyRent: facts.monthlyRent, deposit: facts.deposit,
    ownership: facts.ownership, condition: facts.condition, heating: facts.heating,
    energyClass: facts.energyClass, features: facts.features ?? undefined,
  };

  const genSection = async (s: DescSection) => {
    setBusy(s); setError("");
    try {
      const res = await generateDescription({ mode: "section", section: s, facts: aiFacts, notes: notes[s], tone });
      if (res.text) setSection(s, res.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dashboard.propertyForm.aiGenerateFailed"));
    } finally {
      setBusy(null);
    }
  };

  const genAll = async () => {
    setBusy("full"); setError("");
    try {
      const res = await generateDescription({ mode: "full", facts: aiFacts, tone });
      if (res.sections) {
        (Object.keys(res.sections) as DescSection[]).forEach((k) => setSection(k, res.sections![k] ?? ""));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dashboard.propertyForm.aiGenerateFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rn-card">
      <div className="rn-card__head" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <h2 className="rn-card__title"><Sparkles size={15} style={{ color: "var(--accent)" }} /> {t("dashboard.propertyForm.aiTitle")}</h2>
          <p className="rn-card__sub">{t("dashboard.propertyForm.aiSub")}</p>
        </div>
        <div className="rn-ai__toolbar">
          <select className="rn-select" style={{ height: 34, width: "auto" }} value={tone} onChange={(e) => setTone(e.target.value as GenerateTone)}>
            <option value="professional">{t("dashboard.propertyForm.aiToneProfessional")}</option>
            <option value="warm">{t("dashboard.propertyForm.aiToneWarm")}</option>
            <option value="premium">{t("dashboard.propertyForm.aiTonePremium")}</option>
            <option value="concise">{t("dashboard.propertyForm.aiToneConcise")}</option>
          </select>
          <Button variant="primary" size="sm" onPress={() => void genAll()} isDisabled={busy !== null}>
            {busy === "full" ? <span className="rn-spin" /> : <Wand2 size={14} />}
            {t("dashboard.propertyForm.aiGenerateAll")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rn-banner rn-banner--error" style={{ marginBottom: 12 }}>
          <Info size={15} /> {error}
        </div>
      )}

      {descSections.map((meta, i) => (
        <div className="rn-ai__section" key={meta.id}>
          <div className="rn-ai__section-head">
            <span className="rn-ai__section-num">{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="rn-ai__section-title">{meta.title}</div>
              <div className="rn-hint">{meta.help}</div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => void genSection(meta.id)}
              isDisabled={busy !== null}
            >
              {busy === meta.id ? <span className="rn-spin" /> : <Sparkles size={13} />}
              {t("dashboard.propertyForm.aiGenerate")}
            </Button>
          </div>
          <div className="rn-ai__section-body">
            <input
              className="rn-input"
              placeholder={meta.placeholder}
              value={notes[meta.id]}
              onChange={(e) => setNotes((n) => ({ ...n, [meta.id]: e.target.value }))}
            />
            <textarea
              className="rn-textarea"
              style={{ minHeight: 64 }}
              placeholder={t("dashboard.propertyForm.aiOutputPlaceholder")}
              value={sections[meta.id]}
              onChange={(e) => setSection(meta.id, e.target.value)}
            />
          </div>
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <Button variant="ghost" size="sm" onPress={onAssemble}>
          <Check size={14} /> {t("dashboard.propertyForm.aiAssemble")}
        </Button>
      </div>
    </section>
  );
}

function PropShareSection({ property }: { property: Property }) {
  const { t, locale, localeHref } = useI18n();
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const mayManage = canManagePropShare(session?.user, property);

  const [togglePropShare] = useMutation(TOGGLE_PROPSHARE);
  const { data: countData } = useQuery<{ getPropertyById: { id: string; propShareOfferCount: number | null } }>(
    GET_PROPSHARE_OFFER_COUNT,
    { variables: { id: property.id }, skip: !mayManage },
  );

  if (!mayManage) return null;

  const listed = Boolean(property.propShareListed);
  const offerCount = countData?.getPropertyById?.propShareOfferCount ?? null;
  const listedSince = property.propShareListedAt ? new Date(property.propShareListedAt) : null;

  const onToggle = async (next: boolean) => {
    setBusy(true);
    setErrorMsg("");
    try {
      await togglePropShare({ variables: { propertyId: property.id, listed: next } });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : tf("dashboard.propertyForm.propShareFailed", "Nie udało się zmienić udostępnienia w sieci PropShare."),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rn-card">
      <div className="rn-card__head">
        <h2 className="rn-card__title">
          <Share2 size={15} style={{ color: listed ? "var(--accent)" : undefined }} />{" "}
          {tf("dashboard.propertyForm.propShareTitle", "Sieć PropShare")}
        </h2>
        <p className="rn-card__sub">
          {tf("dashboard.propertyForm.propShareSub", "Udostępnianie tej oferty agentom z innych agencji.")}
        </p>
      </div>

      <div style={{ borderRadius: 12, border: "1px solid var(--border-soft)", padding: "14px 16px" }}>
        <Toggle
          label={
            listed
              ? tf("dashboard.propertyForm.propShareOn", "Oferta widoczna w sieci PropShare")
              : tf("dashboard.propertyForm.propShareOff", "Oferta niewidoczna w sieci PropShare")
          }
          checked={listed}
          disabled={busy}
          onChange={(v) => void onToggle(v)}
          hint={
            listed
              ? tf(
                  "dashboard.propertyForm.propShareOnHint",
                  "Agenci z innych agencji widzą tę ofertę i mogą wysłać propozycję współpracy przy transakcji.",
                )
              : tf(
                  "dashboard.propertyForm.propShareOffHint",
                  "Oferta zostaje wyłącznie w Twojej agencji. Włącz, żeby zebrać propozycje współpracy z sieci.",
                )
          }
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12, fontSize: 11, color: "var(--text-3)" }}>
          {listedSince && !Number.isNaN(listedSince.getTime()) && (
            <span>
              {tf("dashboard.propertyForm.propShareSince", "Udostępniona od")}{" "}
              {listedSince.toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL")}
            </span>
          )}
          {offerCount != null && (
            <span>
              {tf("dashboard.propertyForm.propShareOffers", "Propozycje z sieci")}:{" "}
              <strong style={{ color: "var(--text)" }}>{offerCount}</strong>
              {offerCount > 0 && (
                <>
                  {" · "}
                  <a href={localeHref("/dashboard/propshare")} style={{ color: "var(--accent)" }}>
                    {tf("dashboard.propertyForm.propShareOpen", "zobacz w PropShare")}
                  </a>
                </>
              )}
            </span>
          )}
          <span>
            {tf(
              "dashboard.propertyForm.propShareInstantSave",
              "Przełącznik zapisuje się od razu, niezależnie od przycisku zapisu formularza.",
            )}
          </span>
        </div>

        {errorMsg && (
          <div className="rn-banner rn-banner--error" style={{ marginTop: 12 }}>
            <Info size={15} /> {errorMsg}
          </div>
        )}
      </div>
    </section>
  );
}

export function PropertyForm({ id }: { id?: string }) {
  const router = useRouter();
  const { t, localeHref } = useI18n();
  const isEdit = Boolean(id);
  const options = buildOptions(t);

  const [f, setF] = useState<FormState>(EMPTY);
  const set = <K extends keyof FormState>(k: K) => (v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const setSection = (s: DescSection, v: string) =>
    setF((p) => ({ ...p, sections: { ...p.sections, [s]: v } }));

  const [imageInput, setImageInput] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const { data, loading: fetching, error: fetchError } = useQuery<{ getPropertyById: Property | null }>(
    GET_PROPERTY_BY_ID,
    { variables: { id: id ?? "" }, skip: !isEdit },
  );

  const hydratedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const p = data?.getPropertyById;
    if (!p || hydratedIdRef.current === p.id) return;
    hydratedIdRef.current = p.id;
    const a = p.address ?? {};
    const s = p.descriptionSections ?? {};
    startTransition(() => setF({
      title: p.title ?? "", agentId: p.agentId ?? "",
      transactionType: p.transactionType ?? "SALE", propertyType: p.propertyType ?? "APARTMENT",
      market: p.market ?? "SECONDARY", status: p.status ?? "ACTIVE",
      price: p.price != null ? String(p.price) : "", monthlyRent: p.monthlyRent != null ? String(p.monthlyRent) : "",
      deposit: p.deposit != null ? String(p.deposit) : "",
      location: p.location ?? "", street: a.street ?? "", district: a.district ?? "", city: a.city ?? "",
      postalCode: a.postalCode ?? "", country: a.country ?? "PL",
      area: p.area != null ? String(p.area) : "", plotArea: p.plotArea != null ? String(p.plotArea) : "",
      rooms: p.rooms != null ? String(p.rooms) : "", bedrooms: p.bedrooms != null ? String(p.bedrooms) : "",
      bathrooms: p.bathrooms != null ? String(p.bathrooms) : "", floor: p.floor != null ? String(p.floor) : "",
      totalFloors: p.totalFloors != null ? String(p.totalFloors) : "", yearBuilt: p.yearBuilt != null ? String(p.yearBuilt) : "",
      condition: p.condition ?? "", ownership: p.ownership ?? "", heating: p.heating ?? "", energyClass: p.energyClass ?? "",
      availableFrom: p.availableFrom ? p.availableFrom.slice(0, 10) : "",
      features: p.features ?? [], images: p.images ?? (p.imageUrl ? [p.imageUrl] : []),
      sections: { intro: s.intro ?? "", layout: s.layout ?? "", location: s.location ?? "", additional: s.additional ?? "" },
      description: p.description ?? "",
    }));
  }, [data]);

  const [addProperty] = useMutation(ADD_PROPERTY, { refetchQueries: [{ query: GET_PROPERTIES }] });
  const [updateProperty] = useMutation<{ updateProperty: Property | null }>(UPDATE_PROPERTY, {
    refetchQueries: [{ query: GET_PROPERTIES }],
  });

  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const numErr = (v: string): string | null =>
    Number.isNaN(parseNum(v) as number)
      ? tf("dashboard.propertyForm.invalidNumber", "Podaj liczbę, np. 485 000 albo 62,5")
      : null;

  const hasNumErrors = [
    f.price, f.monthlyRent, f.deposit, f.area, f.plotArea, f.rooms, f.bedrooms,
    f.bathrooms, f.floor, f.totalFloors, f.yearBuilt,
  ].some((v) => Number.isNaN(parseNum(v) as number));

  const { data: session } = useSession();
  const viewer = session?.user;
  const canAssignAgent = roleIs.canAssignPropertyAgent(viewer?.role);

  const property = data?.getPropertyById;
  const agentCompanyId = property?.companyId ?? viewer?.companyId ?? undefined;

  const { data: usersData } = useQuery<{ getUsers: { items: User[] } }>(GET_USERS, {
    variables: { companyId: agentCompanyId, limit: 200 },
    skip: !canAssignAgent,
  });

  const agentOptions = useMemo(() => {
    const opts = (usersData?.getUsers.items ?? [])
      .filter((u) => u.isActive && roleIs.agent(u.role))
      .map((u) => ({ value: u.id, label: u.name || u.email }));
    if (f.agentId && !opts.some((o) => o.value === f.agentId)) {
      opts.unshift({ value: f.agentId, label: property?.ownerAgentName || f.agentId });
    }
    return opts;
  }, [usersData, f.agentId, property?.ownerAgentName]);

  const me = viewer?.id ?? "";
  const defaultAgentId =
    !isEdit && canAssignAgent && me && agentOptions.some((o) => o.value === me) ? me : "";
  const leadAgentId = f.agentId || defaultAgentId;

  const draft: PropertyDraft = useMemo(() => {
    const area = num(f.area);
    const price = num(f.price);
    return {
      title: f.title, location: f.location, price: price ?? undefined,
      transactionType: f.transactionType as Property["transactionType"],
      propertyType: f.propertyType as Property["propertyType"],
      market: f.market as Property["market"], status: f.status as Property["status"],
      area: area ?? undefined, plotArea: num(f.plotArea) ?? undefined,
      rooms: int(f.rooms) ?? undefined, bedrooms: int(f.bedrooms) ?? undefined, bathrooms: int(f.bathrooms) ?? undefined,
      floor: int(f.floor) ?? undefined, totalFloors: int(f.totalFloors) ?? undefined, yearBuilt: int(f.yearBuilt) ?? undefined,
      monthlyRent: num(f.monthlyRent) ?? undefined,
      pricePerM2: price && area ? Math.round(price / area) : undefined,
      ownership: f.ownership as Property["ownership"], condition: f.condition as Property["condition"],
      heating: f.heating || undefined, energyClass: f.energyClass || undefined,
      features: f.features, images: f.images, imageUrl: f.images[0],
      address: { street: f.street, district: f.district, city: f.city, postalCode: f.postalCode, country: f.country },
      descriptionSections: f.sections, description: f.description,
    };
  }, [f]);

  const [vision, setVision] = useState<{
    urls: string[];
    images: { room: string; quality: number; caption: string }[];
    bestCoverIndex: number;
    tags: string[];
  } | null>(null);
  const [visionBusy, setVisionBusy] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);

  const addImage = (url: string) => {
    const u = url.trim();
    if (!u) return;
    if (f.images.length >= MAX_IMAGES) {
      setImageError(
        tf("dashboard.propertyForm.imageLimit", "Osiągnięto limit zdjęć w ofercie: ") +
          MAX_IMAGES,
      );
      return;
    }
    if (!isAllowedImageUrl(u)) {
      setImageError(
        tf(
          "dashboard.propertyForm.imageHostRejected",
          "Ten adres nie jest dozwolony. Wgraj plik albo użyj adresu z: ",
        ) + ALLOWED_IMAGE_HOSTS.join(", "),
      );
      return;
    }
    setImageError(null);
    setF((p) => (p.images.includes(u) ? p : { ...p, images: [...p.images, u] }));
    setImageInput("");
  };
  const addSample = () => {
    const seed = Math.random().toString(36).slice(2, 8);
    addImage(`https://picsum.photos/seed/${seed}/1280/860`);
  };
  const removeImage = (i: number) =>
    setF((p) => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }));
  const moveToCover = (i: number) =>
    setF((p) => (i <= 0 ? p : { ...p, images: [p.images[i]!, ...p.images.filter((_, idx) => idx !== i)] }));
  const moveImage = (from: number, to: number) => {
    setF((p) => {
      if (to < 0 || to >= p.images.length || from === to) return p;
      const next = [...p.images];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return { ...p, images: next };
    });
  };

  const analyzePhotos = async () => {
    if (f.images.length === 0) return;
    const analyzed = f.images.slice(0, 4);
    setVisionBusy(true);
    setVisionError(null);
    setVision(null);
    try {
      const res = await fetch("/api/ai/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls: analyzed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("dashboard.propertyForm.visionFailed"));
      setVision({ ...json, urls: analyzed });
    } catch (err) {
      setVisionError(err instanceof Error ? err.message : t("dashboard.propertyForm.visionError"));
    } finally {
      setVisionBusy(false);
    }
  };

  const bestCoverUrl = vision?.urls[vision.bestCoverIndex] ?? null;
  const bestCoverPos = bestCoverUrl ? f.images.indexOf(bestCoverUrl) : -1;

  const setFeatures = (vals: string[]) => setF((p) => ({ ...p, features: vals }));

  const assembleDescription = () => {
    const joined = [f.sections.intro, f.sections.layout, f.sections.location, f.sections.additional]
      .map((x) => x.trim())
      .filter(Boolean)
      .join("\n\n");
    set("description")(joined);
  };

  const canSubmit = Boolean(
    f.title.trim() && f.location.trim() && (num(f.price) ?? 0) > 0 && (!canAssignAgent || leadAgentId)
      && !hasNumErrors,
  );

  const missingFields = [
    !f.title.trim() && t("dashboard.propertyForm.fieldTitle"),
    !f.location.trim() && t("dashboard.propertyForm.fieldLocation"),
    !((num(f.price) ?? 0) > 0) &&
      t(
        f.transactionType === "RENT"
          ? "dashboard.propertyForm.fieldMonthlyPrice"
          : "dashboard.propertyForm.fieldPrice",
      ),
    canAssignAgent && !leadAgentId && tf("dashboard.propertyForm.fieldAgent", "Agent prowadzący"),
  ].filter((x): x is string => Boolean(x));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("saving"); setErrorMsg("");

    const sectionsInput = {
      intro: f.sections.intro || null, layout: f.sections.layout || null,
      location: f.sections.location || null, additional: f.sections.additional || null,
    };
    const original = (data as { getPropertyById?: Property } | undefined)?.getPropertyById?.address;
    let lat: number | null = typeof original?.lat === "number" ? original.lat : null;
    let lng: number | null = typeof original?.lng === "number" ? original.lng : null;
    const addrParts = [f.street, f.city, f.postalCode, f.country].filter(Boolean);
    const geoQuery = (addrParts.length ? addrParts.join(", ") : f.location).trim();
    const addressChanged =
      isEdit &&
      ((original?.street ?? "") !== f.street ||
        (original?.city ?? "") !== f.city ||
        (original?.postalCode ?? "") !== f.postalCode ||
        (original?.country ?? "") !== f.country ||
        (original?.district ?? "") !== f.district ||
        (property?.location ?? "") !== f.location);
    if (addressChanged) { lat = null; lng = null; }
    if ((lat == null || lng == null) && geoQuery.length >= 3) {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(geoQuery)}`);
        if (res.ok) {
          const j = (await res.json()) as { lat: number; lng: number };
          lat = j.lat; lng = j.lng;
        }
      } catch { }
    }

    const variables = {
      title: f.title.trim(),
      price: num(f.price),
      location: f.location.trim(),
      description: f.description.trim() || null,
      descriptionSections: sectionsInput,
      transactionType: f.transactionType,
      propertyType: f.propertyType,
      market: f.market,
      status: f.status,
      area: num(f.area), plotArea: num(f.plotArea),
      rooms: int(f.rooms), bedrooms: int(f.bedrooms), bathrooms: int(f.bathrooms),
      floor: int(f.floor), totalFloors: int(f.totalFloors), yearBuilt: int(f.yearBuilt),
      monthlyRent: num(f.monthlyRent),
      deposit: f.transactionType === "RENT" ? num(f.deposit) : null,
      ownership: f.ownership || null, condition: f.condition || null,
      heating: f.heating || null, energyClass: f.energyClass || null,
      availableFrom: f.availableFrom || null,
      features: f.features,
      address: {
        street: f.street || null, district: f.district || null, city: f.city || null,
        postalCode: f.postalCode || null, country: f.country || null,
        lat, lng,
      },
      imageUrl: f.images[0] || null,
      images: f.images,
      ...(canAssignAgent && leadAgentId ? { agentId: leadAgentId } : {}),
    };

    try {
      if (isEdit) {
        const res = await updateProperty({ variables: { id, ...variables } });
        if (!res.data?.updateProperty) {
          setErrorMsg(
            tf(
              "dashboard.propertyForm.saveMissing",
              "Oferta nie istnieje albo nie masz do niej dostępu — zmiany nie zostały zapisane.",
            ),
          );
          setStatus("error");
          return;
        }
      } else {
        await addProperty({ variables });
      }
      setStatus("success");
      setTimeout(() => router.push(localeHref("/dashboard/properties")), 1100);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("dashboard.propertyForm.saveFailed"));
      setStatus("error");
    }
  };

  if (isEdit && fetching && !data) {
    return (
      <div className="rn-grid rn-grid--2" style={{ gap: 24 }}>
        <div className="rn-form">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rn-card" style={{ height: 200 }}>
              <div className="rn-skel" style={{ width: "40%", height: 16, marginBottom: 16 }} />
              <div className="rn-skel" style={{ width: "100%", height: 40, marginBottom: 12 }} />
              <div className="rn-skel" style={{ width: "100%", height: 40 }} />
            </div>
          ))}
        </div>
        <div className="rn-card" style={{ height: 420 }} />
      </div>
    );
  }

  if (isEdit && !fetching && (fetchError || !data?.getPropertyById)) {
    return (
      <div className="rn-card" style={{ maxWidth: 560 }}>
        <div className="rn-banner rn-banner--error" style={{ marginBottom: 14 }}>
          <Info size={15} />{" "}
          {tf(
            "dashboard.propertyForm.loadMissing",
            "Nie znaleziono tej oferty albo nie masz do niej dostępu.",
          )}
        </div>
        <Button variant="secondary" onPress={() => router.push(localeHref("/dashboard/properties"))}>
          {tf("dashboard.propertyForm.backToList", "Wróć do listy ofert")}
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rn-property-form"
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        const el = e.target as HTMLElement;
        if (el.tagName === "INPUT" && (el as HTMLInputElement).type !== "submit") {
          e.preventDefault();
        }
      }}
    >
      <div className="rn-property-form__grid">
        <div className="rn-form">
          <section className="rn-card">
            <div className="rn-card__head">
              <h2 className="rn-card__title">{t("dashboard.propertyForm.basicsTitle")}</h2>
              <p className="rn-card__sub">{t("dashboard.propertyForm.basicsSub")}</p>
            </div>
            <div className="rn-grid rn-grid--2">
              <Field label={t("dashboard.propertyForm.fieldTitle")} htmlFor="title" required span="full">
                <Input id="title" fullWidth value={f.title} onChange={(e) => set("title")(e.target.value)} placeholder={t("dashboard.propertyForm.placeholderTitle")} />
              </Field>

              {canAssignAgent && (
                <Field
                  label={tf("dashboard.propertyForm.fieldAgent", "Agent prowadzący")}
                  htmlFor="agentId"
                  required
                  span="full"
                  hint={agentOptions.length === 0
                    ? tf("dashboard.propertyForm.hintAgentEmpty", "Brak agentów w tej firmie — dodaj ich w ustawieniach zespołu.")
                    : tf("dashboard.propertyForm.hintAgent", "Oferta trafia na listę wskazanego agenta.")}
                >
                  <Picker
                    id="agentId"
                    value={leadAgentId}
                    onChange={set("agentId")}
                    options={agentOptions}
                    placeholder={tf("dashboard.propertyForm.placeholderAgent", "Wybierz agenta prowadzącego")}
                  />
                </Field>
              )}

              <Field label={t("dashboard.propertyForm.fieldTransaction")}>
                <ToggleButtonGroup
                  size="sm"
                  selectionMode="single"
                  disallowEmptySelection
                  selectedKeys={new Set([f.transactionType])}
                  onSelectionChange={(keys) => {
                    const next = [...(keys as Set<string>)][0];
                    if (next) set("transactionType")(next);
                  }}
                >
                  {options.transaction.map((o) => (
                    <ToggleButton key={o.value} id={o.value}>
                      {o.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Field>

              <Field label={t("dashboard.propertyForm.fieldStatus")}>
                <Picker value={f.status} onChange={set("status")} options={options.status} />
              </Field>

              <Field label={t("dashboard.propertyForm.fieldPropertyType")}>
                <Picker value={f.propertyType} onChange={set("propertyType")} options={options.propertyType} />
              </Field>

              <Field label={t("dashboard.propertyForm.fieldMarket")}>
                <Picker value={f.market} onChange={set("market")} options={options.market} />
              </Field>

              <Field
                label={t(f.transactionType === "RENT" ? "dashboard.propertyForm.fieldMonthlyPrice" : "dashboard.propertyForm.fieldPrice")}
                htmlFor="price"
                required
                hint={t("dashboard.propertyForm.hintPrice")}
                error={numErr(f.price)}
              >
                <NumInput id="price" value={f.price} onChange={set("price")} placeholder="485000" suffix="zł" invalid={Boolean(numErr(f.price))} />
              </Field>

              <Field label={t("dashboard.propertyForm.fieldMonthlyRent")} htmlFor="monthlyRent" error={numErr(f.monthlyRent)}>
                <NumInput id="monthlyRent" value={f.monthlyRent} onChange={set("monthlyRent")} placeholder="650" suffix="zł" invalid={Boolean(numErr(f.monthlyRent))} />
              </Field>

              {f.transactionType === "RENT" && (
                <Field label={t("dashboard.propertyForm.fieldDeposit")} htmlFor="deposit" error={numErr(f.deposit)}>
                  <NumInput id="deposit" value={f.deposit} onChange={set("deposit")} placeholder="2000" suffix="zł" invalid={Boolean(numErr(f.deposit))} />
                </Field>
              )}
            </div>

            <PropertyValuation
              area={num(f.area) ?? undefined}
              location={f.location || null}
              city={f.city || null}
              district={f.district || null}
              propertyType={f.propertyType}
              transactionType={f.transactionType}
              condition={f.condition || undefined}
              floor={int(f.floor) ?? undefined}
              totalFloors={int(f.totalFloors) ?? undefined}
              yearBuilt={int(f.yearBuilt) ?? undefined}
              rooms={int(f.rooms) ?? undefined}
              features={f.features}
            />
          </section>

          <section className="rn-card">
            <div className="rn-card__head">
              <h2 className="rn-card__title"><MapPin size={15} /> {t("dashboard.propertyForm.locationTitle")}</h2>
              <p className="rn-card__sub">{t("dashboard.propertyForm.locationSub")}</p>
            </div>
            <div className="rn-grid rn-grid--2">
              <Field label={t("dashboard.propertyForm.fieldLocation")} htmlFor="loc" required span="full" hint={t("dashboard.propertyForm.hintLocation")}>
                <Input id="loc" fullWidth value={f.location} onChange={(e) => set("location")(e.target.value)} placeholder={t("dashboard.propertyForm.placeholderLocation")} />
              </Field>
              <Field label={t("dashboard.propertyForm.fieldStreet")} span="2">
                <Input fullWidth value={f.street} onChange={(e) => set("street")(e.target.value)} placeholder={t("dashboard.propertyForm.placeholderStreet")} />
              </Field>
              <Field label={t("dashboard.propertyForm.fieldDistrict")}>
                <Input fullWidth value={f.district} onChange={(e) => set("district")(e.target.value)} placeholder={t("dashboard.propertyForm.placeholderDistrict")} />
              </Field>
              <Field label={t("dashboard.propertyForm.fieldCity")}>
                <Input fullWidth value={f.city} onChange={(e) => set("city")(e.target.value)} placeholder={t("dashboard.propertyForm.placeholderCity")} />
              </Field>
              <Field label={t("dashboard.propertyForm.fieldPostalCode")}>
                <Input fullWidth value={f.postalCode} onChange={(e) => set("postalCode")(e.target.value)} placeholder="02-566" />
              </Field>
              <Field label={t("dashboard.propertyForm.fieldCountry")}>
                <Input fullWidth value={f.country} onChange={(e) => set("country")(e.target.value)} placeholder="PL" />
              </Field>
            </div>
          </section>

          <section className="rn-card">
            <div className="rn-card__head">
              <h2 className="rn-card__title">{t("dashboard.propertyForm.detailsTitle")}</h2>
              <p className="rn-card__sub">{t("dashboard.propertyForm.detailsSub")}</p>
            </div>
            <div className="rn-grid rn-grid--3">
              <Field label={t("dashboard.propertyForm.fieldArea")} htmlFor="area" error={numErr(f.area)}><NumInput id="area" value={f.area} onChange={set("area")} placeholder="62" suffix="m²" invalid={Boolean(numErr(f.area))} /></Field>
              <Field label={t("dashboard.propertyForm.fieldPlotArea")} htmlFor="plotArea" error={numErr(f.plotArea)}><NumInput id="plotArea" value={f.plotArea} onChange={set("plotArea")} placeholder="720" suffix="m²" invalid={Boolean(numErr(f.plotArea))} /></Field>
              <Field label={t("dashboard.propertyForm.fieldRooms")} htmlFor="rooms" error={numErr(f.rooms)}><NumInput id="rooms" value={f.rooms} onChange={set("rooms")} placeholder="3" invalid={Boolean(numErr(f.rooms))} /></Field>
              <Field label={t("dashboard.propertyForm.fieldBedrooms")} htmlFor="bedrooms" error={numErr(f.bedrooms)}><NumInput id="bedrooms" value={f.bedrooms} onChange={set("bedrooms")} placeholder="2" invalid={Boolean(numErr(f.bedrooms))} /></Field>
              <Field label={t("dashboard.propertyForm.fieldBathrooms")} htmlFor="bathrooms" error={numErr(f.bathrooms)}><NumInput id="bathrooms" value={f.bathrooms} onChange={set("bathrooms")} placeholder="1" invalid={Boolean(numErr(f.bathrooms))} /></Field>
              <Field label={t("dashboard.propertyForm.fieldYearBuilt")} htmlFor="yearBuilt" error={numErr(f.yearBuilt)}><NumInput id="yearBuilt" value={f.yearBuilt} onChange={set("yearBuilt")} placeholder="2018" invalid={Boolean(numErr(f.yearBuilt))} /></Field>
              <Field label={t("dashboard.propertyForm.fieldFloor")} htmlFor="floor" error={numErr(f.floor)}><NumInput id="floor" value={f.floor} onChange={set("floor")} placeholder="4" invalid={Boolean(numErr(f.floor))} /></Field>
              <Field label={t("dashboard.propertyForm.fieldTotalFloors")} htmlFor="totalFloors" error={numErr(f.totalFloors)}><NumInput id="totalFloors" value={f.totalFloors} onChange={set("totalFloors")} placeholder="6" invalid={Boolean(numErr(f.totalFloors))} /></Field>
              <Field label={t("dashboard.propertyForm.fieldEnergyClass")}>
                <Picker value={f.energyClass} onChange={set("energyClass")} options={options.energyClass} placeholder="—" />
              </Field>
              <Field label={t("dashboard.propertyForm.fieldCondition")}>
                <Picker value={f.condition} onChange={set("condition")} options={options.condition} placeholder="—" />
              </Field>
              <Field label={t("dashboard.propertyForm.fieldOwnership")}>
                <Picker value={f.ownership} onChange={set("ownership")} options={options.ownership} placeholder="—" />
              </Field>
              <Field label={t("dashboard.propertyForm.fieldHeating")}>
                <Picker value={f.heating} onChange={set("heating")} options={options.heating} placeholder="—" />
              </Field>
              <Field label={t("dashboard.propertyForm.fieldAvailableFrom")} hint={t("dashboard.propertyForm.hintAvailableFrom")}>
                <Input type="date" fullWidth value={f.availableFrom} onChange={(e) => set("availableFrom")(e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="rn-card">
            <div className="rn-card__head">
              <h2 className="rn-card__title">{t("dashboard.propertyForm.featuresTitle")}</h2>
              <p className="rn-card__sub">{t("dashboard.propertyForm.featuresSub")}</p>
            </div>
            <ToggleButtonGroup
              isDetached
              size="sm"
              selectionMode="multiple"
              selectedKeys={new Set(f.features)}
              onSelectionChange={(keys) => setFeatures([...(keys as Set<string>)])}
              className="flex flex-wrap gap-2"
            >
              {options.features.map((tag) => (
                <ToggleButton key={tag.value} id={tag.value}>
                  <Check size={13} />
                  {tag.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </section>

          <section className="rn-card">
            <div className="rn-card__head">
              <h2 className="rn-card__title">{t("dashboard.propertyForm.mediaTitle")}</h2>
              <p className="rn-card__sub">{t("dashboard.propertyForm.mediaSub")}</p>
            </div>
            <div style={{ marginBottom: 12 }}>
              <ImageDropzone
                folder="properties"
                onUploaded={addImage}
                disabled={f.images.length >= MAX_IMAGES}
              />
              <p className="rn-hint" style={{ marginTop: 6 }}>
                {`${f.images.length} / ${MAX_IMAGES}`}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                className="rn-input"
                value={imageInput}
                onChange={(e) => { setImageInput(e.target.value); setImageError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImage(imageInput); } }}
                placeholder="https://…/photo.jpg"
                aria-invalid={Boolean(imageError)}
                aria-describedby={imageError ? "image-url-err" : undefined}
              />
              <Button variant="ghost" onPress={() => addImage(imageInput)}>{t("common.crud.add")}</Button>
              {process.env.NODE_ENV !== "production" && (
                <Button variant="secondary" onPress={addSample}>
                  <ImagePlus size={14} /> {t("dashboard.propertyForm.addPlaceholder")}
                </Button>
              )}
            </div>
            {imageError && (
              <p id="image-url-err" className="rn-hint" style={{ color: "var(--danger)", marginBottom: 12 }} role="alert">
                {imageError}
              </p>
            )}
            {f.images.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                {f.images.map((src, i) => (
                  <div key={src + i} style={{ position: "relative", width: 92 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" style={{ width: 92, height: 66, objectFit: "cover", borderRadius: 9, border: i === 0 ? "2px solid var(--accent)" : "1px solid var(--border-soft)" }} />
                    {i === 0 && <span className="rn-badge rn-badge--accent" style={{ position: "absolute", bottom: 4, left: 4, fontSize: 9, padding: "1px 6px" }}>{t("dashboard.propertyForm.coverBadge")}</span>}
                    <Button variant="danger" size="sm" isIconOnly onPress={() => removeImage(i)} aria-label={t("dashboard.propertyForm.removeImage")} style={{ position: "absolute", top: -8, right: -8 }}>
                      <X size={12} />
                    </Button>
                    <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: "var(--text-3)", minWidth: 14 }}>{i + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        isIconOnly
                        isDisabled={i === 0}
                        onPress={() => moveImage(i, i - 1)}
                        aria-label={tf("dashboard.propertyForm.imageMoveLeft", "Przesuń zdjęcie wcześniej")}
                      >
                        <ChevronLeft size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        isIconOnly
                        isDisabled={i === f.images.length - 1}
                        onPress={() => moveImage(i, i + 1)}
                        aria-label={tf("dashboard.propertyForm.imageMoveRight", "Przesuń zdjęcie później")}
                      >
                        <ChevronRight size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        isIconOnly
                        isDisabled={i === 0}
                        onPress={() => moveToCover(i)}
                        aria-label={tf("dashboard.propertyForm.imageSetCover", "Ustaw jako zdjęcie okładkowe")}
                      >
                        <Star size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {f.images.length > 0 && (
              <div style={{ marginTop: 14, borderTop: "1px solid var(--border-soft)", paddingTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <Button variant="secondary" size="sm" isDisabled={visionBusy} onPress={() => void analyzePhotos()}>
                    {visionBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {t("dashboard.propertyForm.analyzePhotos")}
                  </Button>
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>{t("dashboard.propertyForm.analyzeHint")}</span>
                </div>

                {visionError && <p className="text-[11px] text-danger" style={{ marginTop: 8 }}>{visionError}</p>}

                {vision && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {vision.images.map((im, i) => {
                        const url = vision.urls[i];
                        if (!url || !f.images.includes(url)) return null;
                        return (
                        <div key={url} style={{ width: 130, fontSize: 11 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 8, border: url === bestCoverUrl ? "2px solid var(--accent)" : "1px solid var(--border-soft)" }} />
                          <div style={{ fontWeight: 600, marginTop: 4, color: "var(--text)" }}>{im.room} · {im.quality}/100</div>
                          <div style={{ color: "var(--text-3)" }}>{im.caption}</div>
                        </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {bestCoverPos > 0 && (
                        <Button variant="ghost" size="sm" onPress={() => moveToCover(bestCoverPos)}>
                          <Check size={13} /> {t("dashboard.propertyForm.setBestCover")}
                        </Button>
                      )}
                      {vision.tags?.length > 0 && (
                        <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                          {t("dashboard.propertyForm.suggestedTags").replace("{tags}", vision.tags.join(", "))}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <AiGenerator facts={draft} sections={f.sections} setSection={setSection} onAssemble={assembleDescription} />

          <section className="rn-card">
            <div className="rn-card__head">
              <h2 className="rn-card__title">{t("dashboard.propertyForm.finalTitle")}</h2>
              <p className="rn-card__sub">{t("dashboard.propertyForm.finalSub")}</p>
            </div>
            <TextArea fullWidth style={{ minHeight: 160 }} value={f.description} onChange={(e) => set("description")(e.target.value)} placeholder={t("dashboard.propertyForm.finalPlaceholder")} />
          </section>

          {isEdit && property && <PropShareSection property={property} />}
        </div>

        <aside className="rn-property-form__aside">
          <div className="section-label" style={{ marginBottom: 10 }}>{t("dashboard.propertyForm.previewLabel")}</div>
          <PropertyPreview property={draft} />
        </aside>
      </div>

      {status === "error" && (
        <div className="rn-banner rn-banner--error" style={{ marginTop: 16 }}>
          <Info size={15} /> {errorMsg}
        </div>
      )}
      {status === "success" && (
        <div className="rn-banner rn-banner--success" style={{ marginTop: 16 }}>
          <Check size={15} /> {t("dashboard.propertyForm.savedRedirect")}
        </div>
      )}

      <div className="rn-form-actions">
        <Button variant="ghost" onPress={() => router.push(localeHref("/dashboard/properties"))}>
          {t("common.crud.cancel")}
        </Button>
        <div className="rn-form-actions__spacer" />
        {!canSubmit && status !== "saving" && status !== "success" && (
          <p className="text-[11px] text-text-3" style={{ marginRight: 12, textAlign: "right" }}>
            {hasNumErrors
              ? tf("dashboard.propertyForm.fixInvalid", "Popraw pola oznaczone na czerwono.")
              : `${tf("dashboard.propertyForm.missingFields", "Uzupełnij:")} ${missingFields.join(", ")}`}
          </p>
        )}
        <Button variant="primary" type="submit" isDisabled={!canSubmit || status === "saving" || status === "success"}>
          {status === "saving" ? <Loader2 size={15} className="rn-spin" /> : <Check size={15} />}
          {t(isEdit ? "dashboard.propertyForm.submitSave" : "dashboard.propertyForm.submitAdd")}
        </Button>
      </div>
    </form>
  );
}
