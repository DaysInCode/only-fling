"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SessionList } from "@/components/account/session-list";
import { SettingsShell } from "@/components/account/settings-shell";
import { VerificationReadinessCard } from "@/components/account/verification-readiness-card";
import { AppShell } from "@/components/layout/app-shell";
import { FormField } from "@/components/ui/form-field";
import { useLocale } from "@/components/providers/locale-provider";
import { useSession } from "@/components/providers/session-provider";
import type {
  AccountProfileResponse,
  AccountSessionsResponse,
  AccountSettingsResponse,
  CloseAccountResponse,
  VerificationReadinessResponse,
} from "@/lib/contracts";
import { apiGet, apiPost } from "@/lib/api";

export default function AccountSecurityPage() {
  const { token, user } = useSession();
  const { messages } = useLocale();
  const [profile, setProfile] = useState<AccountProfileResponse["profile"] | null>(null);
  const [settings, setSettings] = useState<AccountSettingsResponse["settings"] | null>(null);
  const [sessions, setSessions] = useState<AccountSessionsResponse["sessions"]>([]);
  const [readiness, setReadiness] = useState<VerificationReadinessResponse["readiness"] | null>(null);
  const [status, setStatus] = useState<string>(messages.accountSecurityPage.status);
  const [revokingId, setRevokingId] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [confirmDisplayName, setConfirmDisplayName] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [retentionAck, setRetentionAck] = useState(false);
  const [accessAck, setAccessAck] = useState(false);

  const load = useCallback(async () => {
    const [profileResult, settingsResult, sessionsResult, readinessResult] = await Promise.all([
      apiGet<AccountProfileResponse>("/account/profile", token),
      apiGet<AccountSettingsResponse>("/account/settings", token),
      apiGet<AccountSessionsResponse>("/account/sessions", token),
      apiGet<VerificationReadinessResponse>("/account/verification-readiness", token),
    ]);

    if (profileResult.data) {
      setProfile(profileResult.data.profile);
    }

    if (settingsResult.data) {
      setSettings(settingsResult.data.settings);
    }

    if (sessionsResult.data) {
      setSessions(sessionsResult.data.sessions);
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
    }, 12000);
    return () => {
      window.clearTimeout(initialHandle);
      window.clearInterval(intervalHandle);
    };
  }, [load, token]);

  const summary = useMemo(
    () => ({
      displayName: profile?.displayName ?? user?.email?.split("@")[0] ?? messages.accountSecurityPage.fallbackName,
      email: user?.email ?? "",
      role: user?.role ?? "creator",
      avatarUrl: profile?.avatarUrl,
    }),
    [messages.accountSecurityPage.fallbackName, profile?.avatarUrl, profile?.displayName, user?.email, user?.role],
  );

  async function revokeSession(sessionId: string) {
    setRevokingId(sessionId);
    const result = await apiPost<{ session: AccountSessionsResponse["sessions"][number] }>(
      "/account/sessions/revoke",
      { sessionId },
      token,
    );
    setStatus(result.error ?? messages.accountSecurityPage.revokeSuccess);
    setRevokingId("");
    await load();
  }

  async function closeAccount(action: "request" | "close") {
    const result = await apiPost<CloseAccountResponse>(
      "/account/close",
      {
        action,
        confirmDisplayName,
        confirmEmail,
        confirmRetentionAcknowledged: retentionAck,
        confirmAccessLossAcknowledged: accessAck,
        reason: closeReason,
      },
      token,
    );

    if (result.data) {
      const closeAccount = result.data.closeAccount;
      setSettings((current) => (current ? { ...current, closeAccount } : current));
      setStatus(action === "request" ? messages.accountSecurityPage.requestSuccess : messages.accountSecurityPage.closeSuccess);
      return;
    }

    setStatus(result.error ?? messages.accountSecurityPage.closeFailed);
  }

  const canFinalize =
    confirmDisplayName === (profile?.displayName ?? "") &&
    confirmEmail.toLowerCase() === (user?.email ?? "").toLowerCase() &&
    retentionAck &&
    accessAck;

  return (
    <AuthGuard>
      <AppShell>
        <SettingsShell
          title={messages.accountSecurityPage.title}
          description={messages.accountSecurityPage.description}
          currentPath="/account/security"
          summary={summary}
          settings={settings}
          readiness={readiness}
        >
          {readiness ? <VerificationReadinessCard readiness={readiness} /> : null}
          <SessionList sessions={sessions} onRevoke={revokeSession} revokingId={revokingId} />

          <section className="panel dangerPanel">
            <div className="sectionHeader">
              <div>
                <div className="label">{messages.accountSecurityPage.danger}</div>
                <h2 style={{ marginTop: 8 }}>{messages.accountSecurityPage.closeAccount}</h2>
              </div>
              <span className="muted">{status}</span>
            </div>
            <p className="muted" style={{ marginTop: 12 }}>
              {messages.accountSecurityPage.closeDescription}
            </p>
            <div className="form" style={{ marginTop: 18 }}>
              <FormField label={messages.accountSecurityPage.reason}>
                <textarea className="textarea" rows={4} value={closeReason} onChange={(event) => setCloseReason(event.target.value)} />
              </FormField>
              <div className="formGrid">
                <FormField label={messages.accountSecurityPage.confirmDisplayName}>
                  <input className="input" value={confirmDisplayName} onChange={(event) => setConfirmDisplayName(event.target.value)} />
                </FormField>
                <FormField label={messages.accountSecurityPage.confirmEmail}>
                  <input className="input" type="email" value={confirmEmail} onChange={(event) => setConfirmEmail(event.target.value)} />
                </FormField>
              </div>
              <label className="checkRow">
                <input type="checkbox" checked={retentionAck} onChange={(event) => setRetentionAck(event.target.checked)} />
                <span>{messages.accountSecurityPage.retentionAck}</span>
              </label>
              <label className="checkRow">
                <input type="checkbox" checked={accessAck} onChange={(event) => setAccessAck(event.target.checked)} />
                <span>{messages.accountSecurityPage.accessAck}</span>
              </label>
            </div>
            <div className="inlineActions" style={{ marginTop: 18 }}>
              <button className="buttonSecondary" type="button" onClick={() => void closeAccount("request")}>
                {messages.accountSecurityPage.requestClosure}
              </button>
              <button
                className="button"
                type="button"
                disabled={settings?.closeAccount.status !== "requested" || !canFinalize}
                onClick={() => void closeAccount("close")}
              >
                {messages.accountSecurityPage.finalizeClosure}
              </button>
            </div>
          </section>
        </SettingsShell>
      </AppShell>
    </AuthGuard>
  );
}
