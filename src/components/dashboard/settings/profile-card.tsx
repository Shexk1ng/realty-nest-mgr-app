"use client";

// Edycja danych profilowych zalogowanego użytkownika wraz ze zdjęciem

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { AlertTriangle, CheckCircle2, Loader2, UserRound, ImageDown } from "lucide-react";
import { Button, Input, TextArea } from "@heroui/react";
import {
  ME,
  UPDATE_PROFILE,
  type MeUser,
  type ProfileInput,
} from "@/lib/graphql/queries/account";
import { AvatarUploader } from "@/components/dashboard/avatar-uploader";
import { SingleImageUploader } from "@/components/uploads/single-image-uploader";
import { useI18n } from "@/i18n/i18n-context";

function displayName(me: MeUser): string {
  return me.profile.fullName || me.name || me.email;
}

function ProfileForm({ me }: { me: MeUser }) {
  const { messages, t } = useI18n();
  const [runUpdate, { loading: saving }] = useMutation(UPDATE_PROFILE);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(me.profile.avatarUrl);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(me.profile.profilePictureUrl);
  const [firstName, setFirstName] = useState(me.profile.firstName ?? "");
  const [lastName, setLastName] = useState(me.profile.lastName ?? "");
  const [phone, setPhone] = useState(me.profile.phone ?? "");
  const [phoneMobile, setPhoneMobile] = useState(me.profile.phoneMobile ?? "");
  const [jobTitle, setJobTitle] = useState(me.profile.jobTitle ?? "");
  const [licenseNumber, setLicenseNumber] = useState(me.profile.licenseNumber ?? "");
  const [bio, setBio] = useState(me.profile.bio ?? "");

  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const previewName = [firstName, lastName].filter(Boolean).join(" ") || displayName(me);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setError(null);
    const profile: ProfileInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || null,
      phoneMobile: phoneMobile.trim() || null,
      jobTitle: jobTitle.trim() || null,
      licenseNumber: licenseNumber.trim() || null,
      bio: bio.trim() || null,
      avatarUrl: avatarUrl || null,
      profilePictureUrl: profilePictureUrl || null,
    };
    try {
      await runUpdate({ variables: { id: me.id, profile } });
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setError(
        (err instanceof Error ? err.message : t("dashboard.settingsProfile.errSave")).replace(
          /^(ApolloError|Error):\s*/i,
          "",
        ),
      );
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <AvatarUploader
        value={avatarUrl}
        name={previewName}
        disabled={saving}
        onChange={(v) => { setAvatarUrl(v); setStatus("idle"); }}
      />

      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <SingleImageUploader
          value={profilePictureUrl}
          onChange={(v) => { setProfilePictureUrl(v); setStatus("idle"); }}
          folder="profile-pictures"
          variant="portrait"
          disabled={saving}
          label={t("dashboard.settingsProfile.profilePictureLabel")}
        />
        {profilePictureUrl && (
          <Button
            variant="ghost"
            size="sm"
            isDisabled={saving}
            onPress={() => { setAvatarUrl(profilePictureUrl); setStatus("idle"); }}
            className="mt-2"
          >
            <ImageDown className="h-3.5 w-3.5" /> {t("dashboard.settingsProfile.setAsAvatar")}
          </Button>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("dashboard.settingsProfile.profilePictureHint")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="rn-field">
          <span className="rn-label">{t("dashboard.settingsProfile.fieldFirstName")}</span>
          <Input fullWidth value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t("dashboard.settingsProfile.phFirstName")} />
        </label>
        <label className="rn-field">
          <span className="rn-label">{t("dashboard.settingsProfile.fieldLastName")}</span>
          <Input fullWidth value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t("dashboard.settingsProfile.phLastName")} />
        </label>
        <label className="rn-field">
          <span className="rn-label">{t("dashboard.settingsProfile.fieldPhone")}</span>
          <Input fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("dashboard.settingsProfile.phPhone")} />
        </label>
        <label className="rn-field">
          <span className="rn-label">{t("dashboard.settingsProfile.fieldPhoneMobile")}</span>
          <Input fullWidth value={phoneMobile} onChange={(e) => setPhoneMobile(e.target.value)} placeholder={t("dashboard.settingsProfile.phPhoneMobile")} />
        </label>
        <label className="rn-field">
          <span className="rn-label">{t("dashboard.settingsProfile.fieldJobTitle")}</span>
          <Input fullWidth value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder={t("dashboard.settingsProfile.phJobTitle")} />
        </label>
        <label className="rn-field">
          <span className="rn-label">{t("dashboard.settingsProfile.fieldLicense")}</span>
          <Input fullWidth value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder={t("dashboard.settingsProfile.phLicense")} />
        </label>
        <label className="rn-field sm:col-span-2">
          <span className="rn-label">{t("dashboard.settingsProfile.fieldBio")}</span>
          <TextArea fullWidth value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder={t("dashboard.settingsProfile.phBio")} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="rn-field">
          <span className="rn-label">{t("dashboard.settingsProfile.fieldEmail")}</span>
          <Input fullWidth value={me.email} disabled readOnly />
          <span className="rn-hint">{t("dashboard.settingsProfile.hintEmail")}</span>
        </label>
        <label className="rn-field">
          <span className="rn-label">{t("dashboard.settingsProfile.fieldRole")}</span>
          <Input fullWidth value={(messages.roles as Record<string, { label: string }>)[me.role]?.label ?? me.role} disabled readOnly />
        </label>
        <label className="rn-field sm:col-span-2">
          <span className="rn-label">{t("dashboard.settingsProfile.fieldCompany")}</span>
          <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/30 px-3 py-2.5">
            {me.company?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.company.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-md object-contain" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-semibold text-accent-on-soft">
                {(me.company?.name ?? "—").slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="text-sm text-foreground">{me.company?.name ?? t("dashboard.settingsProfile.noCompany")}</span>
          </div>
          <span className="rn-hint">{t("dashboard.settingsProfile.hintCompany")}</span>
        </label>
      </div>

      {status === "error" && error && (
        <div className="rn-banner rn-banner--error">
          <AlertTriangle className="h-4 w-4 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {status === "ok" && (
        <div className="rn-banner rn-banner--success">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> <span>{t("dashboard.settingsProfile.savedBanner")}</span>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="primary" type="submit" isDisabled={saving}>
          {saving ? <span className="rn-spin" /> : null} {t("dashboard.settingsProfile.saveButton")}
        </Button>
      </div>
    </form>
  );
}

export function ProfileCard() {
  const { t } = useI18n();
  const { data, loading, error } = useQuery<{ me: MeUser | null }>(ME, {
    fetchPolicy: "cache-and-network",
  });
  const me = data?.me ?? null;

  return (
    <section className="space-y-4 rn-panel">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <UserRound className="h-5 w-5 text-primary" aria-hidden /> {t("dashboard.settingsProfile.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.settingsProfile.description")}
        </p>
      </div>

      {loading && !me ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("dashboard.settingsProfile.loading")}
        </div>
      ) : error && !me ? (
        <div className="rn-banner rn-banner--error">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {t("dashboard.settingsProfile.errLoad").replace(
              "{error}",
              error.message.replace(/^(ApolloError|Error):\s*/i, ""),
            )}
          </span>
        </div>
      ) : me ? (
        <ProfileForm key={me.id} me={me} />
      ) : null}
    </section>
  );
}
