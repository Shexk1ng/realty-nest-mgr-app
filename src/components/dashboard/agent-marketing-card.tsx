"use client";

// Wizytówka agenta z danymi kontaktowymi trafiającymi na materiały wysyłane klientom

import { useQuery } from "@apollo/client/react";
import { BadgeCheck, Mail, Phone } from "lucide-react";
import { ME, type MeUser } from "@/lib/graphql/queries/account";
import { useI18n } from "@/i18n/i18n-context";

export function AgentMarketingCard() {
  const { t } = useI18n();
  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const { data } = useQuery<{ me: MeUser | null }>(ME, { fetchPolicy: "cache-and-network" });
  const me = data?.me ?? null;
  if (!me) return null;

  const portrait = me.profile.profilePictureUrl || me.profile.avatarUrl || null;
  const name = me.profile.fullName || me.name;
  const company = me.company;

  return (
    <section className="card-surface mb-6 overflow-hidden rounded-2xl">
      <div className="border-b border-border/60 px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">{tf("dashboard.marketing.cardTitle", "Twoja wizytówka")}</h2>
        <p className="text-xs text-muted-foreground">{tf("dashboard.marketing.cardSubtitle", "Dane, które trafiają na materiały wysyłane klientom.")}</p>
      </div>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted">
          {portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portrait} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
              {name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-display text-lg font-semibold text-foreground">
            {name}
            {me.profile.licenseNumber && <BadgeCheck className="h-4 w-4 text-primary" aria-label={tf("dashboard.marketing.licensedAgent", "Agent z licencją")} />}
          </p>
          {me.profile.jobTitle && <p className="text-sm text-muted-foreground">{me.profile.jobTitle}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {me.email}</span>
            {me.profile.phoneMobile && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {me.profile.phoneMobile}</span>}
            {me.profile.licenseNumber && <span>Lic. {me.profile.licenseNumber}</span>}
          </div>
        </div>

        {company && (
          <div className="flex items-center gap-2 self-start rounded-xl border border-border/60 bg-muted/30 px-3 py-2 sm:self-center">
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt="" className="h-8 w-8 rounded-md object-contain" />
            ) : null}
            <span className="text-sm font-medium text-foreground">{company.name}</span>
          </div>
        )}
      </div>
    </section>
  );
}
