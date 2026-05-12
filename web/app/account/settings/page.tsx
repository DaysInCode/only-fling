"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SettingsShell } from "@/components/account/settings-shell";
import { AppShell } from "@/components/layout/app-shell";
import { FormField } from "@/components/ui/form-field";
import { useLocale } from "@/components/providers/locale-provider";
import { useSession } from "@/components/providers/session-provider";
import type {
  AccountProfileResponse,
  AccountSettings,
  AccountSettingsResponse,
  VerificationReadinessResponse,
} from "@/lib/contracts";
import { apiGet, apiPost } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const emptySettings: AccountSettings = {
  userId: "",
  notifications: {
    email: true,
    push: false,
    product: true,
    payouts: true,
    security: true,
  },
  deviceSync: {
    enabled: true,
    canonicalUpdatedAt: "",
    sessionCount: 0,
  },
  payoutPreferences: {
    settlementCurrency: "GBP",
    schedule: "manual",
    methodStatus: "not-configured",
  },
  purchasePreferences: {
    ageVerifiedAdult: false,
    labelAsEntertainment: true,
    entertainmentLabelValue: "Entertainment content",
  },
  closeAccount: {
    status: "active",
  },
  createdAt: "",
  updatedAt: "",
};

export default function AccountSettingsPage() {
  const { token, user } = useSession();
  const { messages } = useLocale();
  const [profile, setProfile] = useState<AccountProfileResponse["profile"] | null>(null);
  const [settings, setSettings] = useState<AccountSettings>(emptySettings);
  const [readiness, setReadiness] = useState<VerificationReadinessResponse["readiness"] | null>(null);
  const [status, setStatus] = useState<string>(messages.accountSettingsPage.status);

  const load = useCallback(async () => {
    const [profileResult, settingsResult, readinessResult] = await Promise.all([
      apiGet<AccountProfileResponse>("/account/profile", token),
      apiGet<AccountSettingsResponse>("/account/settings", token),
      apiGet<VerificationReadinessResponse>("/account/verification-readiness", token),
    ]);

    if (profileResult.data) {
      setProfile(profileResult.data.profile);
    }

    if (settingsResult.data) {
      setSettings(settingsResult.data.settings);
    }

    if (readinessResult.data) {
      setReadiness(readinessResult.data.readiness);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const initialHandle = window.setTimeout(() => {
      void load();
    }, 0);
    const intervalHandle = window.setInterval(() => {
      void load();
    }, 15000);
    return () => {
      window.clearTimeout(initialHandle);
      window.clearInterval(intervalHandle);
    };
  }, [load, token]);

  const summary = useMemo(
    () => ({
      displayName: profile?.displayName ?? user?.email?.split("@")[0] ?? messages.accountPage.fallbackName,
      email: user?.email ?? "",
      role: user?.role ?? "creator",
      avatarUrl: profile?.avatarUrl,
    }),
    [messages.accountPage.fallbackName, profile?.avatarUrl, profile?.displayName, user?.email, user?.role],
  );

  async function saveSettings() {
    const payload = {
      notifications: settings.notifications,
      deviceSync: {
        enabled: settings.deviceSync.enabled,
        lastSyncedSessionId: settings.deviceSync.enabled ? user?.sessionId : undefined,
      },
      payoutPreferences: settings.payoutPreferences,
      purchasePreferences: settings.purchasePreferences,
    };

    const result = await apiPost<AccountSettingsResponse>("/account/settings", payload, token);
    if (result.data) {
      setSettings(result.data.settings);
      setStatus(messages.accountSettingsPage.saveSuccess);
      return;
    }

    setStatus(result.error ?? messages.accountSettingsPage.saveFailed);
  }

  return (
    <AuthGuard>
      <AppShell>
        <SettingsShell
          title={messages.accountSettingsPage.title}
          description={messages.accountSettingsPage.description}
          currentPath="/account/settings"
          summary={summary}
          settings={settings}
          readiness={readiness}
        >
          <section className="panel">
            <div className="sectionHeader">
              <div>
                <div className="label">{messages.accountSettingsPage.notifications}</div>
                <h2 style={{ marginTop: 8 }}>{messages.accountSettingsPage.notificationsTitle}</h2>
              </div>
              <span className="muted">{status}</span>
            </div>
            <div className="formGrid" style={{ marginTop: 18 }}>
              {(
                [
                  ["email", messages.accountSettingsPage.notificationLabels.email],
                  ["push", messages.accountSettingsPage.notificationLabels.push],
                  ["product", messages.accountSettingsPage.notificationLabels.product],
                  ["payouts", messages.accountSettingsPage.notificationLabels.payouts],
                  ["security", messages.accountSettingsPage.notificationLabels.security],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="checkRow">
                  <input
                    type="checkbox"
                    checked={settings.notifications[key]}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        notifications: { ...current.notifications, [key]: event.target.checked },
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="sectionHeader">
              <div>
                <div className="label">{messages.accountSettingsPage.deviceSync}</div>
                <h2 style={{ marginTop: 8 }}>{messages.accountSettingsPage.deviceSyncTitle}</h2>
              </div>
            </div>
            <label className="checkRow" style={{ marginTop: 18 }}>
              <input
                type="checkbox"
                checked={settings.deviceSync.enabled}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    deviceSync: { ...current.deviceSync, enabled: event.target.checked },
                  }))
                }
              />
              <span>{messages.accountSettingsPage.syncDescription}</span>
            </label>
            <div className="cardGrid" style={{ marginTop: 18 }}>
              <div className="card">
                <div className="label">{messages.accountSettingsPage.currentDevice}</div>
                <p className="muted" style={{ marginTop: 8 }}>
                  {user?.sessionId ?? messages.common.emptyValue}
                </p>
              </div>
              <div className="card">
                <div className="label">{messages.accountSettingsPage.lastCanonicalUpdate}</div>
                <p className="muted" style={{ marginTop: 8 }}>
                  {formatDateTime(settings.deviceSync.canonicalUpdatedAt)}
                </p>
              </div>
              <div className="card">
                <div className="label">{messages.accountSettingsPage.activeSessions}</div>
                <p className="muted" style={{ marginTop: 8 }}>
                  {settings.deviceSync.sessionCount}
                </p>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="sectionHeader">
              <div>
                <div className="label">{messages.accountSettingsPage.payoutPreferences}</div>
                <h2 style={{ marginTop: 8 }}>{messages.accountSettingsPage.payoutPreferencesTitle}</h2>
              </div>
            </div>
            <div className="formGrid" style={{ marginTop: 18 }}>
              <FormField label={messages.accountSettingsPage.settlementCurrency}>
                <input
                  className="input"
                  value={settings.payoutPreferences.settlementCurrency}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      payoutPreferences: {
                        ...current.payoutPreferences,
                        settlementCurrency: event.target.value.toUpperCase(),
                      },
                    }))
                  }
                />
              </FormField>
              <FormField label={messages.accountSettingsPage.schedule}>
                <select
                  className="select"
                  value={settings.payoutPreferences.schedule}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      payoutPreferences: {
                        ...current.payoutPreferences,
                        schedule: event.target.value as AccountSettings["payoutPreferences"]["schedule"],
                      },
                    }))
                  }
                >
                  <option value="manual">{messages.accountSettingsPage.scheduleOptions.manual}</option>
                  <option value="weekly">{messages.accountSettingsPage.scheduleOptions.weekly}</option>
                  <option value="monthly">{messages.accountSettingsPage.scheduleOptions.monthly}</option>
                </select>
              </FormField>
              <FormField label={messages.accountSettingsPage.methodStatus}>
                <select
                  className="select"
                  value={settings.payoutPreferences.methodStatus}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      payoutPreferences: {
                        ...current.payoutPreferences,
                        methodStatus: event.target.value as AccountSettings["payoutPreferences"]["methodStatus"],
                      },
                    }))
                  }
                >
                  <option value="not-configured">{messages.accountSettingsPage.methodOptions["not-configured"]}</option>
                  <option value="pending">{messages.accountSettingsPage.methodOptions.pending}</option>
                  <option value="ready">{messages.accountSettingsPage.methodOptions.ready}</option>
                </select>
              </FormField>
            </div>

            <div className="formGrid" style={{ marginTop: 18 }}>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span>{messages.accountSettingsPage.purchasePreferencesTitle}</span>
              </div>
              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={settings.purchasePreferences.ageVerifiedAdult}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      purchasePreferences: {
                        ...current.purchasePreferences,
                        ageVerifiedAdult: event.target.checked,
                      },
                    }))
                  }
                />
                <span>{messages.accountSettingsPage.adultVerified}</span>
              </label>
              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={settings.purchasePreferences.labelAsEntertainment}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      purchasePreferences: {
                        ...current.purchasePreferences,
                        labelAsEntertainment: event.target.checked,
                      },
                    }))
                  }
                />
                <span>{messages.accountSettingsPage.labelAsEntertainment}</span>
              </label>
              <FormField label={messages.accountSettingsPage.entertainmentLabelValue}>
                <input
                  className="input"
                  value={settings.purchasePreferences.entertainmentLabelValue}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      purchasePreferences: {
                        ...current.purchasePreferences,
                        entertainmentLabelValue: event.target.value,
                      },
                    }))
                  }
                />
              </FormField>
            </div>

            <div className="heroActions" style={{ marginTop: 18 }}>
              <button className="button" type="button" onClick={saveSettings}>
                {messages.accountSettingsPage.saveSettings}
              </button>
            </div>
          </section>
        </SettingsShell>
      </AppShell>
    </AuthGuard>
  );
}
