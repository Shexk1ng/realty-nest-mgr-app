"use client";

// Ekran kalendarza pulpitu osadzający terminarz prezentacji i zadań

import { CalendarDays } from "lucide-react";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { useI18n } from "@/i18n/i18n-context";

export default function DashboardCalendarPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6 pb-10">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2.5 font-display text-3xl font-semibold tracking-tight text-foreground">
          <CalendarDays className="h-7 w-7 text-primary" aria-hidden /> {t("dashboard.calendar.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.calendar.subtitle")}</p>
      </header>
      <CalendarView />
    </div>
  );
}
