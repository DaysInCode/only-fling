"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost, getStoredToken } from "@/lib/api";

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
  const [status, setStatus] = useState("");

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

  async function copyAffiliateLink() {
    if (!affiliate) {
      return;
    }

    await navigator.clipboard.writeText(affiliate.landingUrl);
    setStatus("Affiliate launch link copied.");
  }

  async function quickLaunch() {
    const result = await apiPost<AffiliateCampaignPayload["campaign"]>(
      "/affiliate/launch",
      {
        ctaCopy: "Click here to start earning",
        rewardPercent: 12,
        capSalesCount: 7,
        capDays: 30,
      },
      token,
    );

    setStatus(result.error ?? "Affiliate launch settings updated.");
    loadAll();
  }

  return (
    <main className="shell section">
      <nav className="nav">
        <div className="brand">OnlyFling Starter</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/collaboration">Collaboration</Link>
          <Link href="/requests">Requests</Link>
          <Link href="/studio">Studio</Link>
          <Link href="/community">Community</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/plugins">Plugins</Link>
        </div>
      </nav>

      <section className="pageGrid">
        <div className="heroCard">
          <div className="eyebrow">Creator + operator dashboard</div>
          <h1 className="heroTitle">Track activation, rewards, and next actions from one screen.</h1>
          <p className="heroLead">
            The funnel is designed to keep the first session productive: upload early, invite quickly, publish a first
            offer, and unlock the next reward tier.
          </p>
        </div>
        <div className="stack">
          <div className="panel">
            <div className="label">Signed in</div>
            <div className="muted">{me ? `${me.email} · ${me.role}` : "Sign in to load dashboard data."}</div>
          </div>
          <div className="panel">
            <div className="label">Current rank</div>
            <div className="kpi">Starter Tier</div>
            <p className="muted">Next unlock: 1 upload + 1 published offer + 1 accepted invite.</p>
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
          <div className="label">Collaboration</div>
          <div className="kpi">Near me</div>
          <p className="muted">Opt in to nearby collaboration discovery, highlights, and mutual contact release.</p>
        </div>
        <div className="card">
          <div className="label">Community demand</div>
          <div className="kpi">Request</div>
          <p className="muted">Ask for the next integration, vote with demand, and grow affiliate-driven reach.</p>
        </div>
        <div className="card">
          <div className="label">Request inbox</div>
          <div className="kpi">{requestSummary?.open ?? "--"}</div>
          <p className="muted">Open member asks waiting for a promise to fulfill.</p>
        </div>
      </section>

      <section className="section pageGrid">
        <div className="panel">
          <div className="label">After first earnings</div>
          <h2 style={{ marginTop: 10 }}>{affiliate?.campaign.ctaCopy ?? "Start earning with me"}</h2>
          <p className="muted" style={{ marginTop: 10 }}>
            {affiliate?.rewardRule ??
              "Offer a capped affiliate reward for the first sales or days, whichever comes first."}
          </p>
          <div className="heroActions" style={{ marginTop: 16 }}>
            <button className="button" type="button" onClick={copyAffiliateLink}>
              Copy launch link
            </button>
            <button className="buttonSecondary" type="button" onClick={quickLaunch}>
              Optimise CTA
            </button>
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
                <td>Reward %</td>
                <td>{affiliate?.campaign.rewardPercent ?? "--"}%</td>
              </tr>
              <tr>
                <td>Cap sales</td>
                <td>{affiliate?.campaign.capSalesCount ?? "--"}</td>
              </tr>
              <tr>
                <td>Cap days</td>
                <td>{affiliate?.campaign.capDays ?? "--"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
