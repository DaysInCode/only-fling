"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/providers/locale-provider";
import { useSession } from "@/components/providers/session-provider";

const primaryLinks = [
  { href: "/account", label: "Account" },
  { href: "/account/settings", label: "Settings" },
  { href: "/account/security", label: "Security" },
  { href: "/media", label: "Media" },
  { href: "/earnings", label: "Earnings" },
  { href: "/account/wallet", label: "Wallet" },
  { href: "/challenges", label: "Challenges" },
  { href: "/account/audit", label: "Audit" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useSession();
  const { messages } = useLocale();

  return (
    <main className="shell section">
      <nav className="nav">
        <div className="brand">{messages.common.brand}</div>
        <div className="navLinks">
          <Link href="/">{messages.common.home}</Link>
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? "navLinkActive" : undefined}>
              {link.href === "/account"
                ? messages.common.account
                : link.href === "/account/settings"
                  ? messages.common.settings
                  : link.href === "/account/security"
                    ? messages.common.security
                    : link.href === "/media"
                      ? messages.common.media
                      : link.href === "/earnings"
                        ? messages.common.earnings
                        : link.href === "/account/wallet"
                          ? messages.common.wallet
                          : link.href === "/challenges"
                            ? messages.common.challenges
                            : messages.common.audit}
            </Link>
          ))}
          <Link href="/admin">{messages.common.admin}</Link>
          {user ? (
            <button
              className="linkButton"
              type="button"
              onClick={() => {
                signOut();
                window.location.assign("/auth/sign-in/");
              }}
            >
              {messages.appShell.signOut}
            </button>
          ) : (
            <Link href="/auth/sign-in">{messages.appShell.signIn}</Link>
          )}
        </div>
      </nav>
      {children}
    </main>
  );
}
