// Ekran zakładania nowej firmy klienckiej wraz z jej pierwszym kontem administratora

import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { CreateCompanyForm } from "@/components/companies/company-form";

export default function NewCompanyPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Link
          href="../companies"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          All companies
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Building2 className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            New company
          </h1>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Creates a new client organisation and provisions its first Company Admin account.
        </p>
      </header>

      <CreateCompanyForm />
    </div>
  );
}
