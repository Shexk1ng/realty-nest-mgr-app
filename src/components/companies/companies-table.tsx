"use client";

// Lista firm dla administratora systemu z dezaktywacją konta i przejściem do edycji

import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery } from "@apollo/client/react";
import { AnimatePresence, motion } from "motion/react";
import {
  Building2,
  ExternalLink,
  Pencil,
  PowerOff,
  ShieldCheck,
  Undo2,
  UserX,
  Users,
} from "lucide-react";
import { useState } from "react";
import { AlertDialog, Button, buttonVariants } from "@heroui/react";
import { useSession } from "next-auth/react";
import { GET_COMPANIES, UPDATE_COMPANY } from "@/lib/graphql/queries/companies";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { isAllowedImageUrl, isSeedImage } from "@/lib/images";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

interface Company {
  id: string;
  shortId: number;
  name: string;
  domain?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  type: string;
  userCount: number;
  createdAt?: string | null;
}

function fmtCreated(raw: string | null | undefined, locale: string): string {
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initialsOf(name: string): string {
  return (name || "—").slice(0, 2).toUpperCase();
}

function CompanyMark({ company, size }: { company: Company; size: "sm" | "lg" }) {
  const px = size === "lg" ? 48 : 36;
  const box = size === "lg" ? "h-12 w-12 rounded-2xl" : "h-9 w-9 rounded-xl";

  if (isAllowedImageUrl(company.logoUrl)) {
    return (
      <Image
        src={company.logoUrl as string}
        alt=""
        width={px}
        height={px}
        unoptimized={isSeedImage(company.logoUrl)}
        className={cn("shrink-0 bg-surface object-contain ring-1 ring-border", box)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-primary/8 ring-1 ring-primary/15",
        box,
      )}
    >
      {size === "lg" ? (
        <span className="text-sm font-semibold text-accent-on-soft">
          {initialsOf(company.name)}
        </span>
      ) : (
        <Building2 className="h-4 w-4 text-primary/70" aria-hidden />
      )}
    </div>
  );
}

function StatusBadge({ isActive, type }: { isActive: boolean; type: string }) {
  const { t } = useI18n();

  if (type === "PLATFORM") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-on-soft">
        <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
        {t("dashboard.companies.badgePlatform")}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        isActive
          ? "border-success/20 bg-success-soft text-success"
          : "border-border/60 bg-muted text-muted-foreground",
      )}
    >
      {isActive
        ? t("dashboard.companies.statusActive")
        : t("dashboard.companies.statusInactive")}
    </span>
  );
}

function CompanyRow({
  company,
  localeHref,
  onDeactivate,
}: {
  company: Company;
  localeHref: (path: string) => string;
  onDeactivate: (company: Company) => void;
}) {
  const { t, locale } = useI18n();

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="group border-b border-border/60 transition-colors hover:bg-muted/30"
    >
      <td className="py-3.5 pl-4 pr-3">
        <div className="flex items-center gap-3">
          <CompanyMark company={company} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{company.name}</p>
            {company.domain ? (
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                {company.domain}
                <ExternalLink className="h-2.5 w-2.5 shrink-0" aria-hidden />
              </p>
            ) : (
              <p className="text-xs text-text-3">{t("dashboard.companies.noDomain")}</p>
            )}
          </div>
        </div>
      </td>

      <td className="px-3 py-3.5">
        <span className="font-mono text-xs text-muted-foreground">#{company.shortId}</span>
      </td>

      <td className="px-3 py-3.5">
        <StatusBadge isActive={company.isActive} type={company.type} />
      </td>

      <td className="px-3 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" aria-hidden />
          {company.userCount}
        </span>
      </td>

      <td className="px-3 py-3.5 text-xs text-muted-foreground">
        {fmtCreated(company.createdAt, locale)}
      </td>

      <td className="py-3.5 pl-3 pr-4">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Link
            href={localeHref(`/companies/edit/${company.id}`)}
            className={buttonVariants({ variant: "ghost", size: "sm", isIconOnly: true })}
            aria-label={t("dashboard.companies.ariaEdit")}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </Link>
          {company.type !== "PLATFORM" && company.isActive && (
            <Button
              variant="danger-soft"
              size="sm"
              isIconOnly
              onPress={() => onDeactivate(company)}
              aria-label={t("dashboard.companies.ariaDeactivate")}
            >
              <PowerOff className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
        </div>
      </td>
    </motion.tr>
  );
}

function Consequence({
  icon: Icon,
  children,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  tone: "danger" | "neutral";
}) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon
        className={cn(
          "mt-0.5 h-3.5 w-3.5 shrink-0",
          tone === "danger" ? "text-danger" : "text-text-3",
        )}
        aria-hidden
      />
      <span className="text-sm leading-relaxed text-text-2">{children}</span>
    </li>
  );
}

function ConfirmDialog({
  company,
  busy,
  onConfirm,
  onCancel,
}: {
  company: Company;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();

  return (
    <AlertDialog isOpen onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
      <AlertDialog.Backdrop isDismissable={!busy}>
        <AlertDialog.Container size="md">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger">
                <PowerOff className="h-5 w-5" aria-hidden />
              </AlertDialog.Icon>
              <AlertDialog.Heading>
                {t("dashboard.companies.deactivateHeading")}
              </AlertDialog.Heading>
            </AlertDialog.Header>

            <AlertDialog.Body>
              <div className="space-y-4">
                <section className="rounded-xl border border-border bg-surface-hi p-3.5">
                  <div className="flex items-start gap-3">
                    <CompanyMark company={company} size="lg" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="break-words font-display text-base font-semibold leading-tight text-foreground">
                        {company.name}
                      </p>
                      <p className="break-all text-xs text-muted-foreground">
                        {company.domain || t("dashboard.companies.noDomain")}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-text-3">
                      #{company.shortId}
                    </span>
                  </div>

                  <dl className="mt-3 space-y-2 border-t border-border pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-text-3">
                        {t("dashboard.companies.previewAfterSave")}
                      </dt>
                      <dd className="flex items-center gap-2">
                        <StatusBadge isActive type={company.type} />
                        <span className="text-text-3" aria-hidden>→</span>
                        <StatusBadge isActive={false} type={company.type} />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-text-3">
                        {t("dashboard.companyForm.statUsers")}
                      </dt>
                      <dd className="text-sm font-semibold tabular-nums text-foreground">
                        {company.userCount}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-text-3">
                        {t("dashboard.companyForm.statCreated")}
                      </dt>
                      <dd className="text-sm text-foreground">
                        {fmtCreated(company.createdAt, locale)}
                      </dd>
                    </div>
                  </dl>
                </section>

                <ul className="space-y-2">
                  <Consequence icon={UserX} tone="danger">
                    {t("dashboard.companies.deactivateLosesAccess").replace(
                      "{count}",
                      String(company.userCount),
                    )}
                  </Consequence>
                  <Consequence icon={Undo2} tone="neutral">
                    {t("dashboard.companies.deactivateReversible")}
                  </Consequence>
                </ul>
              </div>
            </AlertDialog.Body>

            <AlertDialog.Footer>
              <Button variant="ghost" onPress={onCancel} isDisabled={busy}>
                {t("common.crud.cancel")}
              </Button>
              <Button variant="danger" onPress={onConfirm} isDisabled={busy}>
                <PowerOff className="h-4 w-4" aria-hidden />{" "}
                {t("dashboard.companies.deactivateConfirm")}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

export function CompaniesTable() {
  const { t, localeHref } = useI18n();
  const { status } = useSession();
  const [page, setPage] = useState(0);
  const { data, loading, error } = useQuery<{ getCompanies: { items: Company[]; totalCount: number } }>(
    GET_COMPANIES,
    {
      skip: status === "loading",
      fetchPolicy: "cache-and-network",
      variables: { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    },
  );
  const [updateCompany] = useMutation(UPDATE_COMPANY, {
    refetchQueries: [{ query: GET_COMPANIES, variables: { limit: PAGE_SIZE, offset: page * PAGE_SIZE } }],
  });

  const [confirm, setConfirm] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);

  const handleDeactivate = async () => {
    if (!confirm) return;
    setSaving(true);
    try {
      await updateCompany({ variables: { id: confirm.id, isActive: false } });
      setConfirm(null);
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive/90">
        {t("dashboard.companies.loadError")}: {error.message}
      </div>
    );
  }

  const companies: Company[] = data?.getCompanies?.items ?? [];
  const totalCount = data?.getCompanies?.totalCount ?? 0;

  return (
    <>
      <AnimatePresence>
        {confirm && (
          <ConfirmDialog
            company={confirm}
            busy={saving}
            onConfirm={handleDeactivate}
            onCancel={() => setConfirm(null)}
          />
        )}
      </AnimatePresence>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-(--shadow-xs)">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="py-3 pl-4 pr-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("dashboard.companies.colCompany")}</th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("dashboard.companies.colId")}</th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("dashboard.companies.colStatus")}</th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("dashboard.companies.colUsers")}</th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("dashboard.companies.colCreated")}</th>
                <th className="py-3 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("common.crud.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && !companies.length ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-3.5 pl-4 pr-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-xl" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-32 rounded" />
                          <Skeleton className="h-3 w-24 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5"><Skeleton className="h-3 w-10 rounded" /></td>
                    <td className="px-3 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-3 py-3.5"><Skeleton className="h-3 w-8 rounded" /></td>
                    <td className="px-3 py-3.5"><Skeleton className="h-3 w-20 rounded" /></td>
                    <td className="py-3.5 pl-3 pr-4" />
                  </tr>
                ))
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                    {t("dashboard.companies.empty")}
                  </td>
                </tr>
              ) : (
                <AnimatePresence initial={false}>
                  {companies.map((c) => (
                    <CompanyRow
                      key={c.id}
                      company={c}
                      localeHref={localeHref}
                      onDeactivate={setConfirm}
                    />
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
        {companies.length > 0 && (
          <div className="border-t border-border/60 bg-muted/20 px-4 py-3">
            <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} disabled={loading} />
          </div>
        )}
      </div>
    </>
  );
}
