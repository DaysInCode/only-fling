"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { useSession } from "@/components/providers/session-provider";
import type { EarningsSummaryResponse, MediaCollectionsResponse } from "@/lib/contracts";
import { apiGet } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

type ChallengeEntry = {
  key: string;
  title: string;
  value: number;
  unit: string;
};

export default function ChallengesPage() {
  const { token } = useSession();
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [status, setStatus] = useState("Dynamic challenge metrics are loading from account APIs.");

  const load = useCallback(async () => {
    const [earningsResult, collectionsResult] = await Promise.all([
      apiGet<EarningsSummaryResponse>("/earnings/summary", token),
      apiGet<MediaCollectionsResponse>("/media/collections", token),
    ]);

    if (!earningsResult.data || !collectionsResult.data) {
      setStatus(earningsResult.error ?? collectionsResult.error ?? "challenge-data-unavailable");
      return;
    }

    const collections = collectionsResult.data.collections;
    const summary = earningsResult.data.summary;
    const publishedCount = collections.filter((item) => item.publishState === "published").length;
    const soldCount = collections.reduce((count, item) => count + item.soldCount, 0);

    setEntries([
      { key: "most-published", title: "Most published collections", value: publishedCount, unit: "collections" },
      { key: "most-sold", title: "Most sold collections", value: soldCount, unit: "sales" },
      { key: "available-payout", title: "Available payout race", value: summary.availableForPayoutMinor, unit: summary.currency },
    ]);
    setStatus("Challenge metrics refreshed.");
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const handle = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [load, token]);

  const maxValue = useMemo(() => Math.max(...entries.map((entry) => entry.value), 1), [entries]);

  return (
    <AuthGuard>
      <AppShell>
        <section className="pageGrid">
          <div className="heroCard">
            <div className="eyebrow">Challenges and competition</div>
            <h1 className="heroTitle">Track dynamic creator competitions from live account metrics.</h1>
            <p className="heroLead">
              The board compares published output, sales activity, and payout momentum using API-backed values.
            </p>
          </div>
          <div className="panel">
            <div className="label">Status</div>
            <p className="muted">{status}</p>
          </div>
        </section>

        <section className="section cardGrid">
          {entries.map((entry) => (
            <article key={entry.key} className="card">
              <div className="label">{entry.title}</div>
              <div className="kpi" style={{ marginTop: 10 }}>
                {entry.unit.length === 3 && entry.unit === entry.unit.toUpperCase()
                  ? formatCurrency(entry.value, entry.unit)
                  : `${entry.value} ${entry.unit}`}
              </div>
              <div style={{ marginTop: 12, width: "100%", height: 10, background: "#202635", borderRadius: 9999 }}>
                <div
                  style={{
                    width: `${Math.round((entry.value / maxValue) * 100)}%`,
                    height: "100%",
                    borderRadius: 9999,
                    background: "linear-gradient(90deg, #ff66cc 0%, #ffb4d2 100%)",
                  }}
                />
              </div>
            </article>
          ))}
        </section>
      </AppShell>
    </AuthGuard>
  );
}
