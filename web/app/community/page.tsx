"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { apiGet, apiPost, getStoredToken } from "@/lib/api";

type PlatformRequest = {
  id: string;
  platformName: string;
  type: string;
  note: string;
  requestedByDisplayName: string;
  status: string;
  votes: number;
};

const growthIdeas = [
  {
    title: "Affiliate launch links",
    body: "After a first sale, prompt creators with a simple 'start earning with me' link and capped intro rewards for referred sellers.",
  },
  {
    title: "Community bounties",
    body: "Let members post demand for new platform integrations, request bundles, and monetization experiments with clear reward pools.",
  },
  {
    title: "Creator streaks",
    body: "Reward uploads, sales, collabs, and successful referrals with rank boosts, promo credits, and higher visibility.",
  },
];

export default function CommunityPage() {
  const [requests, setRequests] = useState<PlatformRequest[]>([]);
  const [status, setStatus] = useState("Community requests help prioritise the next integrations.");
  const [form, setForm] = useState({
    platformName: "Telegram Creator Alerts",
    type: "messaging",
    note: "Help creators receive sales and collaboration alerts through Telegram.",
  });

  const loadRequests = useCallback(async () => {
    const result = await apiGet<{ requests: PlatformRequest[] }>("/platform-requests");
    if (result.data) {
      setRequests(result.data.requests);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadRequests();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [loadRequests]);

  async function submitRequest() {
    const result = await apiPost("/platform-requests", form, getStoredToken());
    if (!result.error) {
      trackEvent("platform_request_submitted", {
        platform_type: form.type,
        platform_name: form.platformName,
      });
    }
    setStatus(result.error ?? "Platform request submitted.");
    if (!result.error) {
      await loadRequests();
    }
  }

  return (
    <main className="shell section">
      <nav className="nav">
        <div className="brand">OnlyFling Starter</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/plugins">Plugins</Link>
          <Link href="/collaboration">Collaboration</Link>
        </div>
      </nav>

      <section className="pageGrid">
        <div className="heroCard">
          <div className="eyebrow">Community growth and requests</div>
          <h1 className="heroTitle">Let creators shape the roadmap and earn more through the community.</h1>
          <p className="heroLead">
            This area gives users a direct way to request new platforms and integrations while surfacing lucrative
            growth patterns like affiliate links, bounties, and streak-based promotion.
          </p>
        </div>
        <div className="panel">
          <div className="label">Status</div>
          <p className="muted">{status}</p>
        </div>
      </section>

      <section className="section cardGrid">
        {growthIdeas.map((idea) => (
          <article key={idea.title} className="card">
            <div className="label">Growth enhancement</div>
            <h2>{idea.title}</h2>
            <p className="muted">{idea.body}</p>
          </article>
        ))}
      </section>

      <section className="section pageGrid">
        <div className="panel">
          <div className="label">Request a new platform</div>
          <div className="form" style={{ marginTop: 16 }}>
            <label className="field">
              <span>Platform name</span>
              <input
                className="input"
                value={form.platformName}
                onChange={(event) => setForm({ ...form, platformName: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Type</span>
              <select
                className="select"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                <option value="publishing">Publishing</option>
                <option value="payments">Payments</option>
                <option value="analytics">Analytics</option>
                <option value="messaging">Messaging</option>
                <option value="crm">CRM</option>
              </select>
            </label>
            <label className="field">
              <span>Why this matters</span>
              <textarea
                className="textarea"
                rows={4}
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
              />
            </label>
            <button className="button" type="button" onClick={submitRequest}>
              Submit request
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="label">Most requested integrations</div>
          <div className="stack" style={{ marginTop: 16 }}>
            {requests.map((request) => (
              <div key={request.id} className="card">
                <div className="label">
                  {request.type} · {request.status} · {request.votes} votes
                </div>
                <h2>{request.platformName}</h2>
                <p className="muted">{request.note}</p>
                <p className="muted" style={{ marginTop: 8 }}>
                  Requested by {request.requestedByDisplayName}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
