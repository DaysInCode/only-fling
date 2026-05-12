"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, getStoredToken } from "@/lib/api";

type MePayload = {
  user: {
    email: string;
    role: string;
    userId: string;
  };
};

type SummaryPayload = {
  summary: {
    creators: number;
    items: number;
    openModerationCases: number;
    activeConnectors: number;
    monthlyGrossMinor: number;
    currency: string;
  };
};

type AffiliateCampaignPayload = {
  campaign: {
    shareCode: string;
    ctaCopy: string;
    rewardPercent: number;
    capSalesCount: number;
    capDays: number;
    activeReferrals: number;
  };
  landingUrl: string;
  rewardRule: string;
};

type MemberRequestSummaryPayload = {
  summary: {
    open: number;
    promised: number;
    fulfilled: number;
  };
};

export default function DashboardPage() {
  const [me, setMe] = useState<MePayload["user"] | null>(null);
  const [summary, setSummary] = useState<SummaryPayload["summary"] | null>(null);
  const [affiliate, setAffiliate] = useState<AffiliateCampaignPayload | null>(null);
  const [requestSummary, setRequestSummary] = useState<MemberRequestSummaryPayload["summary"] | null>(null);
  const [status] = useState("");

  const token = getStoredToken();

  const loadAll = useCallback(() => {
    apiGet<MePayload>("/me", token).then((result) => result.data && setMe(result.data.user));
    apiGet<SummaryPayload>("/dashboard/summary", token).then((result) => result.data && setSummary(result.data.summary));
    apiGet<AffiliateCampaignPayload>("/affiliate/launch", token).then((result) => result.data && setAffiliate(result.data));
    apiGet<MemberRequestSummaryPayload>("/member-requests", token).then((result) => result.data && setRequestSummary(result.data.summary));
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <main className="shell section">
      <nav className="nav">
        <div className="brand">OnlyFling Starter</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/account">Account</Link>
          <Link href="/account/security">Security</Link>
          <Link href="/media">Media</Link>
          <Link href="/earnings">Earnings</Link>
          <Link href="/account/audit">Audit</Link>
        </div>
      </nav>

      <section className="pageGrid">
        <div className="heroCard">
          <div className="eyebrow">Creator + operator dashboard</div>
          <h1 className="heroTitle">Track account readiness, media, earnings, and next secure actions.</h1>
          <p className="heroLead">
            The dashboard now pushes the signed-in user into protected account journeys: finish profile controls,
            keep canonical settings synced, upload with consent artifacts, and move earnings into payout requests.
          </p>
        </div>
        <div className="stack">
          <div className="panel">
            <div className="label">Signed in</div>
            <div className="muted">{me ? `${me.email} · ${me.role}` : "Sign in to load dashboard data."}</div>
          </div>
          <div className="panel">
            <div className="label">Account journeys</div>
            <div className="kpi">Ready</div>
            <p className="muted">Profile, settings, security, media, earnings, and audit now live under one account area.</p>
          </div>
          <div className="panel">
            <div className="label">Affiliate launch</div>
            <div className="muted">{affiliate?.campaign.ctaCopy ?? "Create your first launch CTA."}</div>
            {status ? <p className="muted" style={{ marginTop: 8 }}>{status}</p> : null}
          </div>
        </div>
      </section>

      <section className="section cardGrid">
        <div className="card">
          <div className="label">Creators</div>
          <div className="kpi">{summary?.creators ?? "--"}</div>
        </div>
        <div className="card">
          <div className="label">Catalog items</div>
          <div className="kpi">{summary?.items ?? "--"}</div>
        </div>
        <div className="card">
          <div className="label">Open moderation cases</div>
          <div className="kpi">{summary?.openModerationCases ?? "--"}</div>
        </div>
        <div className="card">
          <div className="label">Monthly gross</div>
          <div className="kpi">
            {summary ? `${summary.currency} ${(summary.monthlyGrossMinor / 100).toFixed(0)}` : "--"}
          </div>
        </div>
        <div className="card">
          <div className="label">Account settings</div>
          <div className="kpi">Slack-style</div>
          <p className="muted">Profile summary at top, sectioned settings, and a dedicated security + devices area.</p>
        </div>
        <div className="card">
          <div className="label">Media</div>
          <div className="kpi">Queue</div>
          <p className="muted">Collections, upload intake, consent checkpoints, and policy markdown artifacts.</p>
        </div>
        <div className="card">
          <div className="label">Audit</div>
          <div className="kpi">{requestSummary?.open ?? "--"}</div>
          <p className="muted">Track auth, device, media, and payout actions in the per-account trail.</p>
        </div>
      </section>

      <section className="section pageGrid">
        <div className="panel">
          <div className="label">Account control center</div>
          <h2 style={{ marginTop: 10 }}>Manage the full signed-in creator journey.</h2>
          <p className="muted" style={{ marginTop: 10 }}>
            Visit account settings for canonical preferences, the security area for device revocation and closure,
            media for uploads, and earnings for graphs and payouts.
          </p>
          <div className="heroActions" style={{ marginTop: 16 }}>
            <Link className="button" href="/account">Open account</Link>
            <Link className="buttonSecondary" href="/media">Open media</Link>
          </div>
        </div>

        <div className="panel">
          <div className="label">Momentum stats</div>
          <table className="table">
            <tbody>
              <tr>
                <td>Active referrals</td>
                <td>{affiliate?.campaign.activeReferrals ?? "--"}</td>
              </tr>
              <tr>
                <td>Device sync feel</td>
                <td>Canonical</td>
              </tr>
              <tr>
                <td>Media policies</td>
                <td>Markdown</td>
              </tr>
              <tr>
                <td>Payout flow</td>
                <td>Manual request</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
