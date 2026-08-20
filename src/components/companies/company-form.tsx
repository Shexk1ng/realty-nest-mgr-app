"use client";

// Formularz zakładania i edycji firmy wraz z wysyłką logo i przełączaniem aktywności

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQuery } from "@apollo/client/react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@heroui/react";
import { startTransition, useEffect, useState } from "react";
import {
  CREATE_COMPANY,
  GET_COMPANIES,
  GET_COMPANY_BY_ID,
  UPDATE_COMPANY,
} from "@/lib/graphql/queries/companies";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";
import { roleIs } from "@/lib/roles";
import { SingleImageUploader } from "@/components/uploads/single-image-uploader";

function Field({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  hint,
  disabled,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden>*</span>}
      </label>
      <div
        className={cn(
          "flex items-center rounded-xl border bg-card px-4 py-3 transition-all duration-200",
          focused
            ? "border-primary shadow-[0_0_0_3px_rgba(29,78,216,0.1)]"
            : "border-border/80 shadow-(--shadow-xs)",
        )}
      >
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={type === "password" ? "new-password" : undefined}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none disabled:opacity-50"
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FeedbackBanner({ status, errorMsg }: { status: string; errorMsg: string }) {
  const { t } = useI18n();
  return (
    <AnimatePresence mode="wait">
      {status === "success" && (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          {t("dashboard.companyForm.savedBanner")}
        </motion.div>
      )}
      {status === "error" && (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive/90"
        >
          <XCircle className="h-4 w-4 shrink-0" aria-hidden />
          {errorMsg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CreateCompanyForm() {
  const router = useRouter();
  const { t, localeHref } = useI18n();

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [createCompany] = useMutation(CREATE_COMPANY, {
    refetchQueries: [{ query: GET_COMPANIES }],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !adminEmail.trim() || !adminName.trim() || !adminPassword) return;
    setStatus("loading");
    try {
      await createCompany({
        variables: {
          name: name.trim(),
          domain: domain.trim() || null,
          adminEmail: adminEmail.trim(),
          adminName: adminName.trim(),
          adminPassword,
        },
      });
      setStatus("success");
      setTimeout(() => router.push(localeHref("/companies")), 1200);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t("dashboard.companyForm.errorGeneric"));
      setStatus("error");
    }
  };

  const canSubmit = name.trim() && adminEmail.trim() && adminName.trim() && adminPassword;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-surface rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">{t("dashboard.companyForm.sectionCompany")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("dashboard.companyForm.sectionCompanyHint")}</p>
          </div>
          <Field label={t("dashboard.companyForm.fieldName")} id="name" value={name} onChange={setName} placeholder={t("dashboard.companyForm.phName")} required />
          <Field label={t("dashboard.companyForm.fieldDomain")} id="domain" value={domain} onChange={setDomain} placeholder="nestrealty.pl" hint={t("dashboard.companyForm.hintDomainOptional")} />
        </section>

        <section className="card-surface rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">{t("dashboard.companyForm.sectionAdmin")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("dashboard.companyForm.sectionAdminHint")}</p>
          </div>
          <Field label={t("dashboard.companyForm.fieldAdminName")} id="adminName" value={adminName} onChange={setAdminName} placeholder={t("dashboard.companyForm.phAdminName")} required />
          <Field label={t("dashboard.companyForm.fieldAdminEmail")} id="adminEmail" type="email" value={adminEmail} onChange={setAdminEmail} placeholder="admin@nestrealty.pl" required />
          <Field
            label={t("dashboard.companyForm.fieldAdminPassword")}
            id="adminPassword"
            type="password"
            value={adminPassword}
            onChange={setAdminPassword}
            placeholder={t("dashboard.companyForm.phPassword")}
            required
            hint={t("dashboard.companyForm.hintAdminPassword")}
          />
        </section>
      </div>

      <FeedbackBanner status={status} errorMsg={errorMsg} />

      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" onPress={() => router.push(localeHref("/companies"))}>
          {t("common.crud.cancel")}
        </Button>
        <Button
          variant="primary"
          type="submit"
          isDisabled={!canSubmit || status === "loading" || status === "success"}
          style={{ minWidth: 140 }}
        >
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : t("dashboard.companyForm.submitCreate")}
        </Button>
      </div>
    </form>
  );
}

interface EditState {
  name: string; domain: string; logoUrl: string; coverImageUrl: string; isActive: boolean;
  nip: string; website: string; phone: string; email: string;
  licenseNumber: string; timezone: string; language: string;
  street: string; city: string; postalCode: string; country: string;
}

const EMPTY_EDIT: EditState = {
  name: "", domain: "", logoUrl: "", coverImageUrl: "", isActive: true,
  nip: "", website: "", phone: "", email: "",
  licenseNumber: "", timezone: "UTC", language: "en",
  street: "", city: "", postalCode: "", country: "",
};

export function EditCompanyForm({
  id,
  redirectAfterSave,
}: {
  id: string;
  redirectAfterSave?: string;
}) {
  const router = useRouter();
  const { t, locale, localeHref } = useI18n();

  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const { data: session } = useSession();
  const mayEdit = roleIs.adminLevel(session?.user?.role);
  const readOnly = !mayEdit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, loading: fetching } = useQuery<any>(GET_COMPANY_BY_ID, { variables: { id } });

  const [f, setF] = useState<EditState>(EMPTY_EDIT);
  const set = (k: keyof EditState) => (v: string | boolean) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const c = data?.getCompanyById;
    if (!c) return;
    const s = c.settings ?? {};
    const a = s.address ?? {};
    startTransition(() => setF({
      name: c.name ?? "", domain: c.domain ?? "", logoUrl: c.logoUrl ?? "",
      coverImageUrl: c.coverImageUrl ?? "",
      isActive: c.isActive ?? true,
      nip: s.nip ?? "", website: s.website ?? "", phone: s.phone ?? "",
      email: s.email ?? "", licenseNumber: s.licenseNumber ?? "",
      timezone: s.timezone ?? "UTC", language: s.language ?? "en",
      street: a.street ?? "", city: a.city ?? "",
      postalCode: a.postalCode ?? "", country: a.country ?? "",
    }));
  }, [data]);

  const [updateCompany] = useMutation(UPDATE_COMPANY, {
    refetchQueries: [{ query: GET_COMPANIES }],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !f.name.trim()) return;
    setStatus("loading");
    try {
      await updateCompany({
        variables: {
          id,
          name: f.name.trim(),
          domain: f.domain.trim() || null,
          logoUrl: f.logoUrl.trim() || null,
          coverImageUrl: f.coverImageUrl.trim() || null,
          isActive: f.isActive,
          settings: {
            nip: f.nip.trim() || null,
            website: f.website.trim() || null,
            phone: f.phone.trim() || null,
            email: f.email.trim() || null,
            licenseNumber: f.licenseNumber.trim() || null,
            timezone: f.timezone.trim() || "UTC",
            language: f.language.trim() || "en",
            address: {
              street: f.street.trim() || null,
              city: f.city.trim() || null,
              postalCode: f.postalCode.trim() || null,
              country: f.country.trim() || null,
            },
          },
        },
      });
      setStatus("success");
      const dest = redirectAfterSave ?? "/companies";
      setTimeout(() => router.push(localeHref(dest)), 1200);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t("dashboard.companyForm.errorGeneric"));
      setStatus("error");
    }
  };

  if (fetching && !data) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {[...Array(2)].map((_, col) => (
          <div key={col} className="space-y-6">
            {[...Array(2)].map((__, i) => (
              <div key={i} className="card-surface rounded-2xl p-6 space-y-5">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  const company = data?.getCompanyById;
  const isPlatform = company?.type === "PLATFORM";
  const locked = isPlatform || readOnly;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {readOnly && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary/80">
          {tf(
            "dashboard.companyForm.readOnlyNotice",
            "Podgląd danych firmy. Zmiany może wprowadzać administrator firmy.",
          )}
        </div>
      )}
      <div className="card-surface relative overflow-hidden rounded-2xl">
        <div
          className="h-32 w-full bg-muted sm:h-40"
          style={f.coverImageUrl ? { backgroundImage: `url(${f.coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        />
        <div className="flex items-center gap-3 px-5 pb-4 pt-3">
          <div className="rn-panel rn-panel--flush -mt-10 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden">
            {f.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.logoUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-lg font-semibold text-accent-on-soft">{(f.name || "—").slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-foreground">{f.name || t("dashboard.companyForm.previewName")}</p>
            {f.domain && <p className="truncate text-xs text-muted-foreground">{f.domain}</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

        <div className="space-y-6">
          <section className="card-surface rounded-2xl p-6 space-y-5">
            <h2 className="font-display text-base font-semibold text-foreground">{t("dashboard.companyForm.sectionCompany")}</h2>

            <Field label={t("dashboard.companyForm.fieldName")} id="name" value={f.name} onChange={set("name")} placeholder={t("dashboard.companyForm.phName")} required disabled={locked} />
            <Field label={t("dashboard.companyForm.fieldDomain")} id="domain" value={f.domain} onChange={set("domain")} placeholder="nestrealty.pl" disabled={locked} hint={t("dashboard.companyForm.hintDomainDisplayOnly")} />

            <SingleImageUploader
              value={f.logoUrl || null}
              onChange={(v) => set("logoUrl")(v ?? "")}
              folder="company-logos"
              variant="logo"
              disabled={locked}
              label={t("dashboard.companyForm.fieldLogo")}
            />
            <p className="-mt-2 text-xs text-muted-foreground">{t("dashboard.companyForm.hintLogo")}</p>

            <SingleImageUploader
              value={f.coverImageUrl || null}
              onChange={(v) => set("coverImageUrl")(v ?? "")}
              folder="company-covers"
              variant="cover"
              disabled={locked}
              label={t("dashboard.companyForm.fieldCover")}
            />
            <p className="-mt-2 text-xs text-muted-foreground">{t("dashboard.companyForm.hintCover")}</p>

            {!isPlatform && (
              <Toggle label={t("dashboard.companyForm.fieldActive")} checked={f.isActive} onChange={set("isActive") as (v: boolean) => void} hint={t("dashboard.companyForm.hintActive")} disabled={readOnly} />
            )}
            {isPlatform && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary/80">
                {t("dashboard.companyForm.platformNotice")}
              </div>
            )}
          </section>

          <section className="card-surface rounded-2xl p-6 space-y-5">
            <h2 className="font-display text-base font-semibold text-foreground">{t("dashboard.companyForm.sectionContact")}</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("dashboard.companyForm.fieldEmail")} id="s-email" type="email" value={f.email} onChange={set("email")} placeholder={t("dashboard.companyForm.phEmail")}  disabled={readOnly} />
              <Field label={t("dashboard.companyForm.fieldPhone")} id="s-phone" value={f.phone} onChange={set("phone")} placeholder="+48 22 100 200"  disabled={readOnly} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("dashboard.companyForm.fieldWebsite")} id="s-website" value={f.website} onChange={set("website")} placeholder="https://company.pl"  disabled={readOnly} />
              <Field label={t("dashboard.companyForm.fieldNip")} id="s-nip" value={f.nip} onChange={set("nip")} placeholder="1234567890"  disabled={readOnly} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("dashboard.companyForm.fieldLicense")} id="s-license" value={f.licenseNumber} onChange={set("licenseNumber")} placeholder="AGN-123456"  disabled={readOnly} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t("dashboard.companyForm.fieldTimezone")} id="s-tz" value={f.timezone} onChange={set("timezone")} placeholder="Europe/Warsaw"  disabled={readOnly} />
                <Field label={t("dashboard.companyForm.fieldLanguage")} id="s-lang" value={f.language} onChange={set("language")} placeholder="pl"  disabled={readOnly} />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card-surface rounded-2xl p-6 space-y-5">
            <h2 className="font-display text-base font-semibold text-foreground">{t("dashboard.companyForm.sectionAddress")}</h2>
            <Field label={t("dashboard.companyForm.fieldStreet")} id="a-street" value={f.street} onChange={set("street")} placeholder={t("dashboard.companyForm.phStreet")}  disabled={readOnly} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Field label={t("dashboard.companyForm.fieldCity")} id="a-city" value={f.city} onChange={set("city")} placeholder={t("dashboard.companyForm.phCity")}  disabled={readOnly} />
              <Field label={t("dashboard.companyForm.fieldPostalCode")} id="a-postal" value={f.postalCode} onChange={set("postalCode")} placeholder="00-001"  disabled={readOnly} />
            </div>
            <Field label={t("dashboard.companyForm.fieldCountry")} id="a-country" value={f.country} onChange={set("country")} placeholder="PL"  disabled={readOnly} />
          </section>

          {company && (
            <section className="card-surface rounded-2xl p-6">
              <h2 className="mb-4 font-display text-base font-semibold text-foreground">{t("dashboard.companyForm.sectionStats")}</h2>
              <dl className="space-y-4">
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-muted-foreground">{t("dashboard.companyForm.statNumber")}</dt>
                  <dd className="font-mono text-sm font-medium text-foreground">#{company.shortId}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-muted-foreground">{t("dashboard.companyForm.statUsers")}</dt>
                  <dd className="text-sm font-medium text-foreground">{company.userCount}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-muted-foreground">{t("dashboard.companyForm.statCreated")}</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {company.createdAt
                      ? new Date(company.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-muted-foreground">{t("dashboard.companyForm.statType")}</dt>
                  <dd className="text-sm font-medium text-foreground">{company.type}</dd>
                </div>
              </dl>
            </section>
          )}
        </div>
      </div>

      <FeedbackBanner status={status} errorMsg={errorMsg} />

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="ghost"
          onPress={() => router.push(localeHref(redirectAfterSave ?? "/companies"))}
        >
          {readOnly ? tf("common.crud.back", "Wróć") : t("common.crud.cancel")}
        </Button>
        {!readOnly && (
          <Button
            variant="primary"
            type="submit"
            isDisabled={!f.name.trim() || status === "loading" || status === "success" || isPlatform}
            style={{ minWidth: 140 }}
          >
            {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : t("dashboard.companyForm.submitSave")}
          </Button>
        )}
      </div>
    </form>
  );
}
