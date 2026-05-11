"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost, setStoredToken } from "@/lib/api";

type VerifyPayload = {
  token: string;
  user: {
    email: string;
    role: string;
  };
};

export default function SignInPage() {
  const [email, setEmail] = useState("admin@example.com");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  async function requestCode() {
    const result = await apiPost<{ developmentCode?: string }>("/auth/request-link", { email });
    setMessage(result.error ? result.error : `Use code ${result.data?.developmentCode ?? "sent by provider"} to continue.`);
  }

  async function verifyCode() {
    const result = await apiPost<VerifyPayload>("/auth/verify", { email, code });
    if (result.data) {
      setStoredToken(result.data.token);
      setMessage(`Signed in as ${result.data.user.role}. Token stored locally.`);
      return;
    }

    setMessage(result.error ?? "Sign-in failed.");
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
          <div className="eyebrow">Passwordless sign-in</div>
          <h1 className="heroTitle">Get creators or admins in with almost no friction.</h1>
          <p className="heroLead">
            This starter uses a local magic-link style flow. In development it returns the code directly so the funnel
            stays fast while the real email provider is still pending.
          </p>
        </section>

        <section className="panel">
          <form className="form" onSubmit={(event) => event.preventDefault()}>
            <label className="field">
              <span>Email</span>
              <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <button className="button" type="button" onClick={requestCode}>
              Request code
            </button>
            <label className="field">
              <span>Verification code</span>
              <input className="input" value={code} onChange={(event) => setCode(event.target.value)} />
            </label>
            <button className="buttonSecondary" type="button" onClick={verifyCode}>
              Verify and store session
            </button>
          </form>
          {message ? <div className="banner" style={{ marginTop: 16 }}>{message}</div> : null}
        </section>
      </div>
    </main>
  );
}
