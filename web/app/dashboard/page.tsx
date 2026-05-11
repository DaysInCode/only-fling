"use client";

import { useEffect, useState } from "react";
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

export default function DashboardPage() {
  const [me, setMe] = useState<MePayload["user"] | null>(null);
  const [summary, setSummary] = useState<SummaryPayload["summary"] | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    apiGet<MePayload>("/me", token).then((result) => result.data && setMe(result.data.user));
    apiGet<SummaryPayload>("/dashboard/summary", token).then((result) => result.data && setSummary(result.data.summary));
  }, []);

  return (
    <main className="shell section">
      <nav className="nav">
        <div className="brand">OnlyFling Starter</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/collaboration">Collaboration</Link>
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
      </section>
    </main>
  );
}
