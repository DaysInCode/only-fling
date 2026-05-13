"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/components/providers/session-provider";
import { trackEvent } from "@/lib/analytics";
import { apiPost, setStoredToken } from "@/lib/api";
import type { AuthRequestResponse, AuthVerifyResponse } from "@/lib/contracts";

function SignInContent() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/account/";
  const { signIn } = useSession();
  const [email, setEmail] = useState("creator@example.com");
  const [mobileNumber, setMobileNumber] = useState("");
  const [deviceName, setDeviceName] = useState("Web browser");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode() {
    setLoading(true);
    const result = await apiPost<AuthRequestResponse>("/auth/request-link", { email });
    if (!result.error) {
      trackEvent("auth_code_requested", {
        flow: "passwordless",
      });
    }
    setMessage(
      result.error
        ? result.error
        : `Use code ${result.data?.developmentCode ?? "sent by provider"} to continue. New emails create an account on first verify.`,
    );
    setLoading(false);
  }

  async function verifyCode() {
    setLoading(true);
    const result = await apiPost<AuthVerifyResponse>("/auth/verify", { email, code, deviceName });
    if (result.data) {
      setStoredToken(result.data.token);
      await signIn(result.data.token);
      trackEvent("auth_verified", {
        role: result.data.user.role,
      });
      setMessage(`Signed in as ${result.data.user.role}. Redirecting…`);
      window.location.assign(returnTo);
      return;
    }

    setMessage(result.error ?? "Sign-in failed.");
    setLoading(false);
  }

  return (
    <main className="shell section">
      <nav className="nav">
        <div className="brand">OnlyFling Starter</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>
      </nav>

      <div className="pageGrid">
        <section className="heroCard">
          <div className="eyebrow">Create account or sign in</div>
          <h1 className="heroTitle">Create a creator account, then land directly in protected account tools.</h1>
          <p className="heroLead">
            This starter keeps auth lightweight: request a development code, verify it, and the backend creates the
            account automatically on first use. Session storage stays local to the browser until sign out.
          </p>
          <ul className="list" style={{ marginTop: 24 }}>
            <li>Use a unique email to create a new account.</li>
            <li>Name the current device so session management stays readable.</li>
            <li>Protected account pages redirect back here when you are signed out.</li>
          </ul>
        </section>

        <section className="panel">
          <form className="form" onSubmit={(event) => event.preventDefault()}>
            <label className="field fieldBlock">
              <span>Email</span>
              <input
                className="input"
                type="email"
                data-cy="auth-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="field fieldBlock">
              <span>Device name</span>
              <input
                className="input"
                type="text"
                data-cy="auth-device"
                value={deviceName}
                onChange={(event) => setDeviceName(event.target.value)}
              />
            </label>
            <div className="heroActions">
              <button className="button" type="button" data-cy="auth-request" onClick={requestCode} disabled={loading}>
                {loading ? "Requesting…" : "Request code"}
              </button>
            </div>
            <label className="field fieldBlock">
              <span>Verification code</span>
              <input
                className="input"
                inputMode="numeric"
                data-cy="auth-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
              <button className="buttonSecondary" type="button" data-cy="auth-verify" onClick={verifyCode} disabled={loading}>
                Verify and open account
              </button>
            </form>
            <section className="panel" style={{ marginTop: 16 }}>
              <div className="label">Other sign-in entry points</div>
              <p className="muted" style={{ marginTop: 8 }}>
                GitHub, Microsoft, Facebook, and mobile-number entry points are surfaced here as connector slots. The
                live path remains passwordless email until provider wiring is added.
              </p>
              <div className="formGrid" style={{ marginTop: 16 }}>
                <label className="field fieldBlock">
                  <span>Mobile number</span>
                  <input
                    className="input"
                    type="tel"
                    data-cy="auth-mobile"
                    value={mobileNumber}
                    onChange={(event) => setMobileNumber(event.target.value)}
                  />
                </label>
              </div>
              <div className="inlineActions" style={{ marginTop: 16 }}>
                <button className="buttonSecondary" type="button" data-cy="auth-sso-github" disabled>
                  Continue with GitHub
                </button>
                <button className="buttonSecondary" type="button" data-cy="auth-sso-microsoft" disabled>
                  Continue with Microsoft
                </button>
                <button className="buttonSecondary" type="button" data-cy="auth-sso-facebook" disabled>
                  Continue with Facebook
                </button>
              </div>
            </section>
            {message ? <div className="banner" data-cy="auth-message" style={{ marginTop: 16 }}>{message}</div> : null}
            <p className="muted" style={{ marginTop: 16 }}>
              Already exploring? Go to <Link href="/account">Account</Link> after signing in.
            </p>
        </section>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="shell section"><div className="panel">Loading sign-in…</div></main>}>
      <SignInContent />
    </Suspense>
  );
}
