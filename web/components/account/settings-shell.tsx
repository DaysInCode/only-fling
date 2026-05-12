"use client";

import Link from "next/link";
import { formatMessage, useLocale } from "@/components/providers/locale-provider";
import type { AccountSettings, VerificationReadiness } from "@/lib/contracts";
import { formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";

const accountLinks = [
  { href: "/account", label: "Profile summary" },
  { href: "/account/settings", label: "Preferences" },
  { href: "/account/security", label: "Security & devices" },
  { href: "/account/wallet", label: "Wallet & invoices" },
  { href: "/account/audit", label: "Audit trail" },
];

type SettingsShellProps = {
  title: string;
  description: string;
  currentPath: string;
  summary: {
    displayName: string;
    email: string;
    role: string;
    avatarUrl?: string;
  };
  settings?: AccountSettings | null;
  readiness?: VerificationReadiness | null;
  children: React.ReactNode;
};

export function SettingsShell({
  title,
  description,
  currentPath,
  summary,
  settings,
  readiness,
  children,
}: SettingsShellProps) {
  const { messages } = useLocale();
  return (
    <div className="settingsStack">
      <section className="profileSummary">
        <div className="profileSummaryIdentity">
          <div className="avatarCircle" aria-hidden="true">
            {summary.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={summary.avatarUrl} alt="" className="avatarImage" />
            ) : (
              summary.displayName.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="stackCompact">
            <div className="eyebrow">{messages.settingsShell.eyebrow}</div>
            <h1>{summary.displayName}</h1>
            <p className="muted">
              {summary.email} · {summary.role}
            </p>
          </div>
        </div>
        <div className="profileSummaryMeta">
          <div>
            <div className="label">{messages.settingsShell.verificationReadiness}</div>
            <div style={{ marginTop: 8 }}>{readiness ? <StatusPill value={readiness.status} /> : messages.common.emptyValue}</div>
          </div>
          <div>
            <div className="label">{messages.settingsShell.deviceSync}</div>
            <p className="muted" style={{ marginTop: 8 }}>
              {settings?.deviceSync.enabled
                ? formatMessage(messages.settingsShell.syncTemplate, { count: settings.deviceSync.sessionCount })
                : messages.settingsShell.localOnly}
            </p>
          </div>
          <div>
            <div className="label">{messages.settingsShell.lastSync}</div>
            <p className="muted" style={{ marginTop: 8 }}>
              {formatDateTime(settings?.deviceSync.canonicalUpdatedAt)}
            </p>
          </div>
        </div>
      </section>

      <section className="settingsLayout">
        <aside className="settingsSidebar">
          <div className="label">{messages.settingsShell.workspace}</div>
          <div className="stackCompact" style={{ marginTop: 12 }}>
            {accountLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`settingsNavLink ${currentPath === link.href ? "settingsNavLinkActive" : ""}`}>
                {link.href === "/account"
                  ? messages.settingsShell.links.profile
                  : link.href === "/account/settings"
                    ? messages.settingsShell.links.preferences
                    : link.href === "/account/security"
                      ? messages.settingsShell.links.security
                      : link.href === "/account/wallet"
                        ? messages.settingsShell.links.wallet
                        : messages.settingsShell.links.audit}
              </Link>
            ))}
          </div>
          <div className="panel" style={{ marginTop: 18 }}>
            <div className="label">{messages.settingsShell.syncModel}</div>
            <p className="muted" style={{ marginTop: 10 }}>
              {messages.settingsShell.syncDescription}
            </p>
          </div>
        </aside>
        <div className="settingsContent">
          <div className="panel">
            <div className="eyebrow">{title}</div>
            <p className="muted" style={{ marginTop: 12 }}>
              {description}
            </p>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
