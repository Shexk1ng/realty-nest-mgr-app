// Lista wszystkich firm na platformie z przejściem do zakładania nowej

import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { CompaniesTable } from "@/components/companies/companies-table";

export default function CompaniesPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Building2 className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Companies
            </h1>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            All companies on the platform. Create and manage client organisations, assign admins, and control access.
          </p>
        </div>

        <Link href="companies/new" className="realty-nest__btn realty-nest__btn--primary">
          <Plus className="h-4 w-4" aria-hidden />
          New company
        </Link>
      </header>

      <CompaniesTable />
    </div>
  );
}
