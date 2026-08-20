// Profil własnej firmy zalogowanego użytkownika: mapa nieruchomości i formularz danych

import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/graphql/auth";
import { EditCompanyForm } from "@/components/companies/company-form";
import { CompanyPropertiesMap } from "@/components/companies/company-properties-map";

export default async function MyCompanyPage() {
  const session = await auth();
  const companyId = session?.user?.companyId;

  if (!companyId) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Building2 className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            My company
          </h1>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          View and update your company&apos;s details, contact information, and settings.
        </p>
      </header>

      <CompanyPropertiesMap />

      <EditCompanyForm id={companyId} redirectAfterSave="/company" />
    </div>
  );
}
