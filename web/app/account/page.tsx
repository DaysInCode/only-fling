"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SettingsShell } from "@/components/account/settings-shell";
import { FormField } from "@/components/ui/form-field";
import { useLocale } from "@/components/providers/locale-provider";
import { useSession } from "@/components/providers/session-provider";
import type {
  AccountProfileResponse,
  AccountSettingsResponse,
  UserAccountProfile,
  VerificationReadinessResponse,
} from "@/lib/contracts";
import { apiGet, apiPost } from "@/lib/api";
import { joinList, parseCommaList } from "@/lib/format";

const emptyProfile: UserAccountProfile = {
  userId: "",
  displayName: "",
  bio: "",
  avatarUrl: "",
  preferences: {
    contentTags: [],
    collaborationInterests: [],
    languages: [],
  },
  privacy: {
    profileVisibility: "private",
    discoverable: false,
    showActivity: false,
    allowDirectMessages: false,
  },
  contact: {
    supportEmail: "",
    emailOptIn: false,
    marketingOptIn: false,
  },
  createdAt: "",
  updatedAt: "",
};

export default function AccountPage() {
  const { token, user } = useSession();
  const { messages } = useLocale();
  const [profile, setProfile] = useState<UserAccountProfile>(emptyProfile);
  const [settings, setSettings] = useState<AccountSettingsResponse["settings"] | null>(null);
  const [readiness, setReadiness] = useState<VerificationReadinessResponse["readiness"] | null>(null);
  const [status, setStatus] = useState<string>(messages.accountPage.status);
  const [tagText, setTagText] = useState("");
  const [interestText, setInterestText] = useState("");
  const [languageText, setLanguageText] = useState("");

  const load = useCallback(async () => {
    const [profileResult, settingsResult, readinessResult] = await Promise.all([
      apiGet<AccountProfileResponse>("/account/profile", token),
      apiGet<AccountSettingsResponse>("/account/settings", token),
      apiGet<VerificationReadinessResponse>("/account/verification-readiness", token),
    ]);

    if (profileResult.data) {
      setProfile(profileResult.data.profile);
      setTagText(joinList(profileResult.data.profile.preferences.contentTags));
      setInterestText(joinList(profileResult.data.profile.preferences.collaborationInterests));
      setLanguageText(joinList(profileResult.data.profile.preferences.languages));
    }

    if (settingsResult.data) {
      setSettings(settingsResult.data.settings);
    }

    if (readinessResult.data) {
      setReadiness(readinessResult.data.readiness);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      const handle = window.setTimeout(() => {
        void load();
      }, 0);

      return () => window.clearTimeout(handle);
    }
  }, [load, token]);

  const profileSummary = useMemo(
    () => ({
      displayName: profile.displayName || user?.email?.split("@")[0] || messages.accountPage.fallbackName,
      email: user?.email ?? "",
      role: user?.role ?? "creator",
      avatarUrl: profile.avatarUrl,
    }),
    [messages.accountPage.fallbackName, profile.avatarUrl, profile.displayName, user?.email, user?.role],
  );

  async function saveProfile() {
    const payload = {
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      preferences: {
        contentTags: parseCommaList(tagText),
        collaborationInterests: parseCommaList(interestText),
        languages: parseCommaList(languageText),
      },
      privacy: profile.privacy,
      contact: profile.contact,
    };

    const result = await apiPost<AccountProfileResponse>("/account/profile", payload, token);
    if (result.data) {
      setProfile(result.data.profile);
      setStatus(messages.accountPage.saveSuccess);
      return;
    }

    setStatus(result.error ?? messages.accountPage.saveFailed);
  }

  return (
    <AuthGuard>
      <AppShell>
        <SettingsShell
          title={messages.accountPage.title}
          description={messages.accountPage.description}
          currentPath="/account"
          summary={profileSummary}
          settings={settings}
          readiness={readiness}
        >
          <section className="panel">
            <div className="sectionHeader">
              <div>
                <div className="label">{messages.accountPage.overview}</div>
                <h2 style={{ marginTop: 8 }}>{messages.accountPage.overviewTitle}</h2>
              </div>
              <span className="muted">{status}</span>
            </div>
            <div className="formGrid" style={{ marginTop: 18 }}>
              <FormField label={messages.accountPage.displayName} description={messages.accountPage.displayNameHint}>
                <input
                  className="input"
                  value={profile.displayName}
                  onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))}
                />
              </FormField>
              <FormField label={messages.accountPage.supportEmail} description={messages.accountPage.supportEmailHint}>
                <input
                  className="input"
                  type="email"
                  value={profile.contact.supportEmail}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      contact: { ...current.contact, supportEmail: event.target.value },
                    }))
                  }
                />
              </FormField>
              <FormField label={messages.accountPage.avatarUrl} description={messages.accountPage.avatarHint}>
                <input
                  className="input"
                  value={profile.avatarUrl}
                  onChange={(event) => setProfile((current) => ({ ...current, avatarUrl: event.target.value }))}
                />
              </FormField>
              <FormField label={messages.accountPage.profileVisibility}>
                <select
                  className="select"
                  value={profile.privacy.profileVisibility}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      privacy: {
                        ...current.privacy,
                        profileVisibility: event.target.value as UserAccountProfile["privacy"]["profileVisibility"],
                      },
                    }))
                  }
                >
                  <option value="private">{messages.accountPage.visibility.private}</option>
                  <option value="followers">{messages.accountPage.visibility.followers}</option>
                  <option value="public">{messages.accountPage.visibility.public}</option>
                </select>
              </FormField>
            </div>
            <div className="form" style={{ marginTop: 18 }}>
              <FormField label={messages.accountPage.bio}>
                <textarea
                  className="textarea"
                  rows={4}
                  value={profile.bio}
                  onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))}
                />
              </FormField>
              <div className="formGrid">
                <FormField label={messages.accountPage.contentTags} description={messages.accountPage.contentTagsHint}>
                  <input className="input" value={tagText} onChange={(event) => setTagText(event.target.value)} />
                </FormField>
                <FormField label={messages.accountPage.collaborationInterests} description={messages.accountPage.collaborationInterestsHint}>
                  <input className="input" value={interestText} onChange={(event) => setInterestText(event.target.value)} />
                </FormField>
                <FormField label={messages.accountPage.languages} description={messages.accountPage.languagesHint}>
                  <input className="input" value={languageText} onChange={(event) => setLanguageText(event.target.value)} />
                </FormField>
              </div>
            </div>
            <div className="formGrid" style={{ marginTop: 18 }}>
              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={profile.privacy.discoverable}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      privacy: { ...current.privacy, discoverable: event.target.checked },
                    }))
                  }
                />
                <span>{messages.accountPage.toggles.discoverable}</span>
              </label>
              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={profile.privacy.showActivity}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      privacy: { ...current.privacy, showActivity: event.target.checked },
                    }))
                  }
                />
                <span>{messages.accountPage.toggles.showActivity}</span>
              </label>
              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={profile.privacy.allowDirectMessages}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      privacy: { ...current.privacy, allowDirectMessages: event.target.checked },
                    }))
                  }
                />
                <span>{messages.accountPage.toggles.allowDirectMessages}</span>
              </label>
              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={profile.contact.emailOptIn}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      contact: { ...current.contact, emailOptIn: event.target.checked },
                    }))
                  }
                />
                <span>{messages.accountPage.toggles.emailOptIn}</span>
              </label>
              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={profile.contact.marketingOptIn}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      contact: { ...current.contact, marketingOptIn: event.target.checked },
                    }))
                  }
                />
                <span>{messages.accountPage.toggles.marketingOptIn}</span>
              </label>
            </div>
            <div className="heroActions" style={{ marginTop: 18 }}>
              <button className="button" type="button" onClick={saveProfile}>
                {messages.accountPage.saveProfile}
              </button>
            </div>
          </section>
        </SettingsShell>
      </AppShell>
    </AuthGuard>
  );
}
