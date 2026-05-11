"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost, getStoredToken } from "@/lib/api";

export default function OnboardingPage() {
  const [message, setMessage] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Launch Collective");
  const [displayName, setDisplayName] = useState("Creator One");
  const [region, setRegion] = useState("UK");

  async function submit() {
    const result = await apiPost(
      "/onboarding/complete",
      {
        workspaceName,
        displayName,
        region,
        acceptsTerms: true,
        acceptsPrivacy: true,
        acceptsMarketplacePolicy: true,
      },
      getStoredToken(),
    );

    setMessage(result.error ?? "Onboarding complete. Next step: request a secure upload URL and publish your first item.");
  }

  return (
    <main className="shell section">
      <nav className="nav">
        <div className="brand">OnlyFling Starter</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/auth/sign-in">Sign in</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>
      </nav>

      <div className="pageGrid">
        <section className="heroCard">
          <div className="eyebrow">Five-click activation</div>
          <h1 className="heroTitle">Terms accepted to first upload prep in a single short flow.</h1>
          <p className="heroLead">
            This page is intentionally compressed: name the workspace, confirm display name, pick a region, accept the
            policy bundle, and move straight into uploads and invites.
          </p>
        </section>

        <section className="panel">
          <div className="form">
            <label className="field">
              <span>Workspace name</span>
              <input className="input" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
            </label>
            <label className="field">
              <span>Display name</span>
              <input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
            <label className="field">
              <span>Region</span>
              <select className="select" value={region} onChange={(event) => setRegion(event.target.value)}>
                <option value="UK">UK</option>
                <option value="EU">EU</option>
                <option value="GLOBAL">Global</option>
              </select>
            </label>
            <label className="checkRow">
              <input type="checkbox" checked readOnly />
              <span>I accept the terms, privacy notice, and marketplace policy.</span>
            </label>
            <button className="button" type="button" onClick={submit}>
              Complete onboarding
            </button>
          </div>
          {message ? <div className="banner" style={{ marginTop: 16 }}>{message}</div> : null}
        </section>
      </div>
    </main>
  );
}
