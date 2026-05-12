"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost, getStoredToken } from "@/lib/api";

type StudioSession = {
  id: string;
  title: string;
  initiatorUserId: string;
  creatorAUserId: string;
  creatorADisplayName: string;
  creatorBUserId: string;
  creatorBDisplayName: string;
  contentType: string;
  sessionMode: string;
  status: string;
  grossMinor: number;
  feesMinor: number;
  netMinor: number;
  creatorAShareMinor: number;
  creatorBShareMinor: number;
  creatorASharePercent: number;
  creatorBSharePercent: number;
  partnerConfirmed: boolean;
};

type StudioTimelineEntry = {
  id: string;
  actorDisplayName: string;
  eventType: string;
  description: string;
  timestamp: string;
};

type MePayload = {
  user: {
    userId: string;
  };
};

export default function StudioPage() {
  const [sessions, setSessions] = useState<StudioSession[]>([]);
  const [timeline, setTimeline] = useState<StudioTimelineEntry[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [status, setStatus] = useState("Collab Studio keeps the fixed 60/40 split clear and auditable.");
  const [form, setForm] = useState({
    title: "New duo session",
    partnerUserId: "user-creator-luca",
    contentType: "video",
    sessionMode: "upload-bundle",
    grossMinor: 24800,
    feesMinor: 2976,
  });

  const token = getStoredToken();

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? sessions[0] ?? null,
    [selectedSessionId, sessions],
  );

  const loadSessions = useCallback(async (sessionId?: string) => {
    const [meResult, sessionsResult] = await Promise.all([
      apiGet<MePayload>("/me", token),
      apiGet<{ sessions: StudioSession[]; timeline: StudioTimelineEntry[] }>(
        `/studio/sessions${sessionId ? `?sessionId=${sessionId}` : ""}`,
        token,
      ),
    ]);

    if (meResult.data) {
      setCurrentUserId(meResult.data.user.userId);
    }

    if (sessionsResult.data) {
      setSessions(sessionsResult.data.sessions);
      setTimeline(sessionsResult.data.timeline);
      if (!selectedSessionId && sessionsResult.data.sessions[0]) {
        setSelectedSessionId(sessionsResult.data.sessions[0].id);
      }
    }
  }, [selectedSessionId, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const handle = window.setTimeout(() => {
      void loadSessions(selectedSessionId);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [loadSessions, selectedSessionId, token]);

  async function createSession() {
    const result = await apiPost("/studio/sessions", form, token);
    setStatus(result.error ?? "Studio session created.");
    if (!result.error) {
      await loadSessions();
    }
  }

  async function act(action: "confirm-split" | "start-session" | "initiate-payout" | "approve-payout" | "dispute") {
    if (!selectedSession) {
      return;
    }

    const result = await apiPost(
      "/studio/sessions/action",
      {
        sessionId: selectedSession.id,
        action,
      },
      token,
    );
    setStatus(result.error ?? `Studio action ${action} applied.`);
    if (!result.error) {
      await loadSessions(selectedSession.id);
    }
  }

  return (
    <main className="shell section">
      <nav className="nav">
        <div className="brand">OnlyFling Starter</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/requests">Requests</Link>
          <Link href="/collaboration">Discovery</Link>
        </div>
      </nav>

      <section className="pageGrid">
        <div className="heroCard">
          <div className="eyebrow">Collab Studio</div>
          <h1 className="heroTitle">Co-sell content together with a fixed 60/40 split and a full settlement trail.</h1>
          <p className="heroLead">
            Use one shared card for stream or upload-bundle sessions, show gross vs net clearly, and keep settlement
            approvals visible to both creators and admin.
          </p>
        </div>
        <div className="panel">
          <div className="label">Status</div>
          <p className="muted">{status}</p>
        </div>
      </section>

      <section className="section pageGrid">
        <div className="panel">
          <div className="label">Create studio session</div>
          <div className="form" style={{ marginTop: 16 }}>
            <label className="field">
              <span>Title</span>
              <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label className="field">
              <span>Partner user ID</span>
              <input
                className="input"
                value={form.partnerUserId}
                onChange={(event) => setForm({ ...form, partnerUserId: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Content type</span>
              <select
                className="select"
                value={form.contentType}
                onChange={(event) => setForm({ ...form, contentType: event.target.value })}
              >
                <option value="photo">Photo</option>
                <option value="video">Video</option>
                <option value="stream">Stream</option>
              </select>
            </label>
            <label className="field">
              <span>Session mode</span>
              <select
                className="select"
                value={form.sessionMode}
                onChange={(event) => setForm({ ...form, sessionMode: event.target.value })}
              >
                <option value="upload-bundle">Upload bundle</option>
                <option value="remote-stream">Remote stream</option>
              </select>
            </label>
            <button className="button" type="button" onClick={createSession}>
              Create session
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="label">Sessions</div>
          <div className="stack" style={{ marginTop: 16 }}>
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className="card"
                style={{ textAlign: "left", cursor: "pointer" }}
                onClick={() => {
                  setSelectedSessionId(session.id);
                  void loadSessions(session.id);
                }}
              >
                <div className="label">
                  {session.status} · {session.contentType} · {session.sessionMode}
                </div>
                <strong>{session.title}</strong>
                <p className="muted">
                  {session.creatorADisplayName} + {session.creatorBDisplayName}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedSession ? (
        <section className="section pageGrid">
          <div className="panel">
            <div className="label">Studio card</div>
            <div className="card" style={{ marginTop: 16 }}>
              <div className="label">
                {selectedSession.creatorADisplayName} + {selectedSession.creatorBDisplayName} · {selectedSession.status}
              </div>
              <h2 style={{ marginTop: 8 }}>{selectedSession.title}</h2>
              <table className="table" style={{ marginTop: 16 }}>
                <tbody>
                  <tr>
                    <td>Gross revenue</td>
                    <td>GBP {(selectedSession.grossMinor / 100).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>Platform fee</td>
                    <td>GBP {(selectedSession.feesMinor / 100).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>Net distributable</td>
                    <td>GBP {(selectedSession.netMinor / 100).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>{selectedSession.creatorADisplayName} (60%)</td>
                    <td>GBP {(selectedSession.creatorAShareMinor / 100).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>{selectedSession.creatorBDisplayName} (40%)</td>
                    <td>GBP {(selectedSession.creatorBShareMinor / 100).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="heroActions" style={{ marginTop: 16 }}>
                {!selectedSession.partnerConfirmed && currentUserId === selectedSession.creatorBUserId ? (
                  <button className="button" type="button" onClick={() => act("confirm-split")}>
                    Confirm 60/40 split
                  </button>
                ) : null}
                {selectedSession.status === "both_confirmed" ? (
                  <button className="button" type="button" onClick={() => act("start-session")}>
                    Start session
                  </button>
                ) : null}
                {selectedSession.status === "live" ? (
                  <button className="button" type="button" onClick={() => act("initiate-payout")}>
                    Initiate payout
                  </button>
                ) : null}
                {["payout_initiated", "payout_approved_creator_a", "payout_approved_creator_b"].includes(
                  selectedSession.status,
                ) ? (
                  <button className="buttonSecondary" type="button" onClick={() => act("approve-payout")}>
                    Approve payout
                  </button>
                ) : null}
                {selectedSession.status !== "settled" ? (
                  <button className="buttonSecondary" type="button" onClick={() => act("dispute")}>
                    Raise dispute
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="label">Settlement timeline</div>
            <div className="stack" style={{ marginTop: 16 }}>
              {timeline.map((entry) => (
                <div key={entry.id} className="card">
                  <div className="label">
                    {entry.eventType} · {new Date(entry.timestamp).toLocaleString()}
                  </div>
                  <strong>{entry.actorDisplayName}</strong>
                  <p className="muted">{entry.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
