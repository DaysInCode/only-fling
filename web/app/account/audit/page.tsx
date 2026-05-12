"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuditTable } from "@/components/account/audit-table";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SettingsShell } from "@/components/account/settings-shell";
import { AppShell } from "@/components/layout/app-shell";
import { useLocale } from "@/components/providers/locale-provider";
import { useSession } from "@/components/providers/session-provider";
import type {
  AccountProfileResponse,
  AccountSettingsResponse,
  AuditResponse,
  VerificationReadinessResponse,
} from "@/lib/contracts";
import { apiGet } from "@/lib/api";

export default function AccountAuditPage() {
  const { token, user } = useSession();
  const { messages } = useLocale();
  const [profile, setProfile] = useState<AccountProfileResponse["profile"] | null>(null);
  const [settings, setSettings] = useState<AccountSettingsResponse["settings"] | null>(null);
  const [readiness, setReadiness] = useState<VerificationReadinessResponse["readiness"] | null>(null);
  const [events, setEvents] = useState<AuditResponse["events"]>([]);

  const load = useCallback(async () => {
    const [profileResult, settingsResult, readinessResult, auditResult] = await Promise.all([
      apiGet<AccountProfileResponse>("/account/profile", token),
      apiGet<AccountSettingsResponse>("/account/settings", token),
      apiGet<VerificationReadinessResponse>("/account/verification-readiness", token),
      apiGet<AuditResponse>("/account/audit?limit=100", token),
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

    if (auditResult.data) {
      setEvents(auditResult.data.events);
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

  const summary = useMemo(
    () => ({
      displayName: profile?.displayName ?? user?.email?.split("@")[0] ?? messages.accountAuditPage.fallbackName,
      email: user?.email ?? "",
      role: user?.role ?? "creator",
      avatarUrl: profile?.avatarUrl,
    }),
    [messages.accountAuditPage.fallbackName, profile?.avatarUrl, profile?.displayName, user?.email, user?.role],
  );

  return (
    <AuthGuard>
      <AppShell>
        <SettingsShell
          title={messages.accountAuditPage.title}
          description={messages.accountAuditPage.description}
          currentPath="/account/audit"
          summary={summary}
          settings={settings}
          readiness={readiness}
        >
          <AuditTable events={events} />
        </SettingsShell>
      </AppShell>
    </AuthGuard>
  );
}
