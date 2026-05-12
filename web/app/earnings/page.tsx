"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { EarningsChart } from "@/components/earnings/earnings-chart";
import { AppShell } from "@/components/layout/app-shell";
import { FormField } from "@/components/ui/form-field";
import { StatusPill } from "@/components/ui/status-pill";
import { useLocale } from "@/components/providers/locale-provider";
import { useSession } from "@/components/providers/session-provider";
import type { EarningsSummaryResponse, PayoutRequestResponse, PayoutsResponse } from "@/lib/contracts";
import { apiGet, apiPost } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";

export default function EarningsPage() {
  const { token } = useSession();
  const { messages } = useLocale();
  const [earnings, setEarnings] = useState<EarningsSummaryResponse | null>(null);
  const [payouts, setPayouts] = useState<PayoutsResponse | null>(null);
  const [amountMinor, setAmountMinor] = useState(1000);
  const [note, setNote] = useState<string>(messages.earningsPage.noteDefault);
  const [status, setStatus] = useState<string>(messages.earningsPage.status);

  const load = useCallback(async () => {
    const [earningsResult, payoutsResult] = await Promise.all([
      apiGet<EarningsSummaryResponse>("/earnings/summary", token),
      apiGet<PayoutsResponse>("/payouts", token),
    ]);

    if (earningsResult.data) {
      setEarnings(earningsResult.data);
    }

    if (payoutsResult.data) {
      setPayouts(payoutsResult.data);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      const handle = window.setTimeout(() => {
        void load();
      }, 0);

      return () => window.clearTimeout(handle);
    }
  }, [load, token]);

  async function requestPayout() {
    const result = await apiPost<PayoutRequestResponse>("/payouts/request", { amountMinor, note }, token);
    setStatus(result.error ?? messages.earningsPage.payoutRequested);
    await load();
  }

  return (
    <AuthGuard>
      <AppShell>
        <section className="pageGrid">
            <div className="heroCard">
            <div className="eyebrow">{messages.earningsPage.eyebrow}</div>
            <h1 className="heroTitle">{messages.earningsPage.title}</h1>
            <p className="heroLead">
              {messages.earningsPage.description}
            </p>
          </div>
          <div className="stack">
            <div className="panel">
                <div className="label">{messages.common.status}</div>
              <p className="muted" style={{ marginTop: 8 }}>{status}</p>
            </div>
            {earnings?.summary ? (
              <div className="panel">
                <div className="label">{messages.earningsPage.available}</div>
                <div className="kpi" style={{ marginTop: 8 }}>
                  {formatCurrency(earnings.summary.availableForPayoutMinor, earnings.summary.currency)}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {earnings?.summary ? (
          <section className="section cardGrid">
            <div className="card">
              <div className="label">{messages.earningsPage.gross}</div>
              <div className="kpi">{formatCurrency(earnings.summary.totalGrossMinor, earnings.summary.currency)}</div>
            </div>
            <div className="card">
              <div className="label">{messages.earningsPage.net}</div>
              <div className="kpi">{formatCurrency(earnings.summary.totalNetMinor, earnings.summary.currency)}</div>
            </div>
            <div className="card">
              <div className="label">{messages.earningsPage.fees}</div>
              <div className="kpi">{formatCurrency(earnings.summary.totalFeesMinor, earnings.summary.currency)}</div>
            </div>
            <div className="card">
              <div className="label">{messages.earningsPage.pendingPayouts}</div>
              <div className="kpi">{formatCurrency(earnings.summary.pendingPayoutMinor, earnings.summary.currency)}</div>
            </div>
          </section>
        ) : null}

        <section className="section pageGrid">
          <EarningsChart points={earnings?.timeseries ?? []} />

          <section className="panel">
            <div className="label">{messages.earningsPage.requestPayout}</div>
            <div className="form" style={{ marginTop: 18 }}>
              <FormField label={messages.earningsPage.amountMinor}>
                <input className="input" type="number" value={amountMinor} onChange={(event) => setAmountMinor(Number(event.target.value))} />
              </FormField>
              <FormField label={messages.earningsPage.note}>
                <textarea className="textarea" rows={4} value={note} onChange={(event) => setNote(event.target.value)} />
              </FormField>
              <button className="button" type="button" onClick={() => void requestPayout()}>
                {messages.earningsPage.requestButton}
              </button>
            </div>
          </section>
        </section>

        <section className="section panel">
          <div className="label">{messages.earningsPage.history}</div>
          <table className="table" style={{ marginTop: 18 }}>
            <thead>
              <tr>
                <th>{messages.earningsPage.requested}</th>
                <th>{messages.earningsPage.amount}</th>
                <th>{messages.common.status}</th>
                <th>{messages.earningsPage.note}</th>
              </tr>
            </thead>
            <tbody>
              {(payouts?.payouts ?? []).map((payout) => (
                <tr key={payout.id}>
                  <td>{formatDateTime(payout.requestedAt)}</td>
                  <td>{formatCurrency(payout.amountMinor, payout.currency)}</td>
                  <td>
                    <StatusPill value={payout.status} />
                  </td>
                  <td>{payout.note || messages.common.emptyValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
