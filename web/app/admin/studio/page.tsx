"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, getStoredToken } from "@/lib/api";

type StudioSession = {
  id: string;
  title: string;
  contentType: string;
  sessionMode: string;
  status: string;
  creatorADisplayName: string;
  creatorBDisplayName: string;
  grossMinor: number;
  feesMinor: number;
  netMinor: number;
  creatorAShareMinor: number;
  creatorBShareMinor: number;
};

export default function AdminStudioPage() {
  const [sessions, setSessions] = useState<StudioSession[]>([]);
  const [status, setStatus] = useState("Admin sign-in required.");

  useEffect(() => {
    apiGet<{ sessions: StudioSession[] }>("/admin/studio", getStoredToken()).then((result) => {
      if (result.data) {
        setSessions(result.data.sessions);
        setStatus("Studio audit overview loaded.");
        return;
      }

      if (result.error) {
        setStatus(result.error);
      }
    });
  }, []);

  return (
    <main className="shell section">
      <nav className="nav">
        <div className="brand">OnlyFling Starter</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/admin">Admin</Link>
          <Link href="/studio">Studio</Link>
        </div>
      </nav>

      <section className="pageGrid">
        <div className="heroCard">
          <div className="eyebrow">Admin studio audit</div>
          <h1 className="heroTitle">Review collaborative items, 60/40 splits, and settlement status.</h1>
          <p className="heroLead">
            This view gives admin and finance teams a grouped overview of joint content items and their split-based
            payouts without exposing the whole raw event stream to every user.
          </p>
        </div>
        <div className="panel">
          <div className="label">Status</div>
          <p className="muted">{status}</p>
        </div>
      </section>

      <section className="section panel">
        <table className="table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Creators</th>
              <th>Status</th>
              <th>Gross</th>
              <th>Net</th>
              <th>Split</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>
                  {session.title}
                  <div className="muted">
                    {session.contentType} · {session.sessionMode}
                  </div>
                </td>
                <td>
                  {session.creatorADisplayName} + {session.creatorBDisplayName}
                </td>
                <td>{session.status}</td>
                <td>GBP {(session.grossMinor / 100).toFixed(2)}</td>
                <td>GBP {(session.netMinor / 100).toFixed(2)}</td>
                <td>
                  GBP {(session.creatorAShareMinor / 100).toFixed(2)} / GBP {(session.creatorBShareMinor / 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
