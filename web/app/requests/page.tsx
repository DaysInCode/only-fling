"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { apiGet, apiPost, getStoredToken } from "@/lib/api";

type MemberRequest = {
  id: string;
  requesterUserId: string;
  requesterDisplayName: string;
  targetUserId: string;
  targetDisplayName: string;
  title: string;
  details: string;
  type: string;
  status: string;
  promisedByUserId?: string;
};

type MePayload = {
  user: {
    userId: string;
  };
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [status, setStatus] = useState("Open request board for member asks and promises.");
  const [form, setForm] = useState({
    targetUserId: "user-creator-anna",
    title: "Quick paid teaser bundle",
    details: "Need a fast collaboration bundle this week with a clear promise to deliver.",
    type: "video-bundle",
  });

  const token = getStoredToken();

  const loadAll = useCallback(async () => {
    const [meResult, requestResult] = await Promise.all([
      apiGet<MePayload>("/me", token),
      apiGet<{ requests: MemberRequest[]; summary: { open: number; promised: number; fulfilled: number } }>(
        "/member-requests",
        token,
      ),
    ]);

    if (meResult.data) {
      setCurrentUserId(meResult.data.user.userId);
    }

    if (requestResult.data) {
      setRequests(requestResult.data.requests);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const handle = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [loadAll, token]);

  async function submitRequest() {
    const result = await apiPost("/member-requests", form, token);
    if (!result.error) {
      trackEvent("member_request_created", {
        request_type: form.type,
      });
    }
    setStatus(result.error ?? "Member request created.");
    if (!result.error) {
      await loadAll();
    }
  }

  async function act(requestId: string, action: "accept" | "fulfill" | "dispute") {
    const result = await apiPost("/member-requests/action", { requestId, action }, token);
    if (!result.error) {
      trackEvent("member_request_actioned", {
        action,
      });
    }
    setStatus(result.error ?? `Request marked as ${action}.`);
    if (!result.error) {
      await loadAll();
    }
  }

  return (
    <main className="shell section">
      <nav className="nav">
        <div className="brand">OnlyFling Starter</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/studio">Collab studio</Link>
          <Link href="/collaboration">Discovery</Link>
        </div>
      </nav>

      <section className="pageGrid">
        <div className="heroCard">
          <div className="eyebrow">Request outlet and promises</div>
          <h1 className="heroTitle">Capture member requests, accept the brief, and track the promise to fulfill.</h1>
          <p className="heroLead">
            This inbox gives creators a direct place to receive asks from members, commit to a delivery, and move
            requests to fulfilled or disputed with an audit trail.
          </p>
        </div>
        <div className="panel">
          <div className="label">Status</div>
          <p className="muted">{status}</p>
        </div>
      </section>

      <section className="section pageGrid">
        <div className="panel">
          <div className="label">Create a request</div>
          <div className="form" style={{ marginTop: 16 }}>
            <label className="field">
              <span>Target user ID</span>
              <input
                className="input"
                value={form.targetUserId}
                onChange={(event) => setForm({ ...form, targetUserId: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Request title</span>
              <input
                className="input"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Details</span>
              <textarea
                className="textarea"
                rows={4}
                value={form.details}
                onChange={(event) => setForm({ ...form, details: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Type</span>
              <select
                className="select"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                <option value="content-collab">Content collab</option>
                <option value="custom-request">Custom request</option>
                <option value="video-bundle">Video bundle</option>
              </select>
            </label>
            <button className="button" type="button" onClick={submitRequest}>
              Create request
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="label">Request inbox</div>
          <div className="stack" style={{ marginTop: 16 }}>
            {requests.map((request) => {
              const isIncoming = request.targetUserId === currentUserId;
              return (
                <div key={request.id} className="card">
                  <div className="label">
                    {request.type} · {request.status}
                  </div>
                  <h2>{request.title}</h2>
                  <p className="muted">{request.details}</p>
                  <p className="muted" style={{ marginTop: 8 }}>
                    {request.requesterDisplayName} → {request.targetDisplayName}
                  </p>
                  {request.status === "open" && isIncoming ? (
                    <div className="heroActions">
                      <button className="button" type="button" onClick={() => act(request.id, "accept")}>
                        Promise to fulfill
                      </button>
                      <button className="buttonSecondary" type="button" onClick={() => act(request.id, "dispute")}>
                        Dispute
                      </button>
                    </div>
                  ) : null}
                  {request.status === "accepted" && request.promisedByUserId === currentUserId ? (
                    <div className="heroActions">
                      <button className="button" type="button" onClick={() => act(request.id, "fulfill")}>
                        Mark fulfilled
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
