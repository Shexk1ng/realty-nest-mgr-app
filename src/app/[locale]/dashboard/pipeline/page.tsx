"use client";

// Ekran lejka sprzedaży osadzający tablicę kanban

import { GitBranch } from "lucide-react";
import { PipelineBoard } from "@/components/dashboard/pipeline-board";
import { useI18n } from "@/i18n/i18n-context";

export default function DashboardPipelinePage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6 pb-10">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2.5 font-display text-3xl font-semibold tracking-tight text-foreground">
          <GitBranch className="h-7 w-7 text-primary" aria-hidden /> {t("dashboard.pipeline.pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.pipeline.pageDescription")}</p>
      </header>
      <PipelineBoard />
    </div>
  );
}
