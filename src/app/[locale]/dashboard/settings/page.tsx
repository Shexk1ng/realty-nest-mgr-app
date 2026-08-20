"use client";

// Ustawienia konta: profil, hasło, logowanie dwuskładnikowe, paleta barw i zespół

import { Palette } from "lucide-react";
import { useI18n } from "@/i18n/i18n-context";
import { useSession } from "next-auth/react";
import { DashboardPaletteSelect } from "@/components/dashboard/dashboard-palette-select";
import { ProfileCard } from "@/components/dashboard/settings/profile-card";
import { PasswordCard } from "@/components/dashboard/settings/password-card";
import { TwoFactorCard } from "@/components/dashboard/settings/two-factor-card";
import { AllocationQueueCard } from "@/components/dashboard/settings/allocation-queue-card";
import { TeamCard } from "@/components/dashboard/settings/team-card";
import { roleIs, type Role } from "@/lib/roles";

export default function DashboardSettingsPage() {
  const { messages } = useI18n();
  const d = messages.dashboard.settings;
  const { data: session } = useSession();
  const userRole = (session?.user?.role ?? "AGENT") as Role;
  const isAdmin = roleIs.adminLevel(userRole);
  const seesTeam = roleIs.canManageUsers(userRole);

  return (
    <>
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          {d.title}
        </h1>
        <p className="text-sm text-muted-foreground">{d.subtitle}</p>
      </header>

      <div className="settings-grid">
        <ProfileCard />

        <div className="settings-aside">
          <PasswordCard />
          <TwoFactorCard />
          <section className="rn-panel space-y-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Palette className="h-5 w-5 text-primary" aria-hidden /> {d.appearanceTitle}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{d.ephemeralNote}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{d.paletteLabel}</p>
              <DashboardPaletteSelect />
            </div>
          </section>
        </div>
      </div>

      {seesTeam && <TeamCard />}
      {isAdmin && <AllocationQueueCard />}
    </>
  );
}
