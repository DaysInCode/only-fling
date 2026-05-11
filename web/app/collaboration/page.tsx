"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost, getStoredToken } from "@/lib/api";

type CollaborationProfile = {
  userId: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  locationDisclosureAccepted: boolean;
  promotedHighlight: boolean;
  promotedDisclosureAccepted: boolean;
  notifyOnNearby: boolean;
  availableNow: boolean;
  contactHandle: string;
  preferences: string[];
  collaborationTypes: string[];
};

type NearbyMember = {
  userId: string;
  displayName: string;
  avatarUrl: string;
  city: string;
  promotedHighlight: boolean;
  availableNow: boolean;
  preferences: string[];
  collaborationTypes: string[];
  distanceKm: number;
  predictedAffinity: number;
  canRequestContact: boolean;
};

type CollaborationRequest = {
  id: string;
  toUserId: string;
  fromUserId: string;
  collaborationType: string;
  status: string;
};

type CollaborationAlert = {
  id: string;
  title: string;
  body: string;
};

const defaultProfile: CollaborationProfile = {
  userId: "",
  displayName: "Creator Match Profile",
  avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80",
  bio: "Open to collaborative shoots nearby with clear expectations and fast planning.",
  city: "Bristol",
  countryCode: "GB",
  latitude: 51.4545,
  longitude: -2.5879,
  locationDisclosureAccepted: true,
  promotedHighlight: false,
  promotedDisclosureAccepted: false,
  notifyOnNearby: true,
  availableNow: true,
  contactHandle: "@creator-match",
  preferences: ["fitness", "glamour"],
  collaborationTypes: ["photo", "video"],
};

export default function CollaborationPage() {
  const [profile, setProfile] = useState<CollaborationProfile>(defaultProfile);
  const [nearby, setNearby] = useState<NearbyMember[]>([]);
  const [alerts, setAlerts] = useState<CollaborationAlert[]>([]);
  const [requests, setRequests] = useState<CollaborationRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [status, setStatus] = useState("Sign in to manage collaboration discovery.");

  const token = getStoredToken();

  const loadAll = useCallback(async () => {
    const [meResult, profileResult, nearbyResult, alertResult] = await Promise.all([
      apiGet<{ user: { userId: string } }>("/me", token),
      apiGet<{ profile: CollaborationProfile | null }>("/collaboration/profile", token),
      apiGet<{ nearby: NearbyMember[] }>("/collaboration/nearby?maxKm=60", token),
      apiGet<{ alerts: CollaborationAlert[]; requests: CollaborationRequest[] }>("/collaboration/alerts", token),
    ]);

    if (meResult.data) {
      setCurrentUserId(meResult.data.user.userId);
    }

    if (profileResult.data?.profile) {
      setProfile(profileResult.data.profile);
      setStatus("Collaboration profile loaded.");
    }

    if (nearbyResult.data) {
      setNearby(nearbyResult.data.nearby);
    }

    if (alertResult.data) {
      setAlerts(alertResult.data.alerts);
      setRequests(alertResult.data.requests);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      const handle = window.setTimeout(() => {
        void loadAll();
      }, 0);
      return () => window.clearTimeout(handle);
    }
  }, [token, loadAll]);

  async function saveProfile() {
    const result = await apiPost<{ profile: CollaborationProfile }>("/collaboration/profile", profile, token);
    setStatus(result.error ?? "Collaboration discovery saved.");
    if (!result.error) {
      await loadAll();
    }
  }

  async function requestContact(targetUserId: string, collaborationType: "photo" | "video" | "bundle") {
    const result = await apiPost(
      "/collaboration/request",
      {
        targetUserId,
        collaborationType,
        note: `Interested in a ${collaborationType} collaboration nearby.`,
      },
      token,
    );
    setStatus(result.error ?? "Request sent.");
    await loadAll();
  }

  async function respond(requestId: string, accept: boolean) {
    const result = await apiPost("/collaboration/respond", { requestId, accept }, token);
    setStatus(result.error ?? (accept ? "Request accepted; contact released mutually." : "Request declined."));
    await loadAll();
  }

  return (
    <main className="shell section">
      <nav className="nav">
        <div className="brand">OnlyFling Starter</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/admin/collaboration">Admin view</Link>
        </div>
      </nav>

      <section className="pageGrid">
        <div className="heroCard">
          <div className="eyebrow">Nearby collaboration discovery</div>
          <h1 className="heroTitle">Find members near you to collaborate with, without exposing contact by default.</h1>
          <p className="heroLead">
            Members can opt into coarse location sharing, pay to be highlighted, and receive nearby availability alerts.
            Contact details only unlock after mutual acceptance, while admin keeps audited visibility.
          </p>
        </div>
        <div className="panel">
          <div className="label">Status</div>
          <p className="muted">{status}</p>
          <div className="banner" style={{ marginTop: 16 }}>
            Highlighted discovery requires the extra disclosure confirming you are comfortable sharing collaboration-area
            visibility.
          </div>
        </div>
      </section>

      <section className="section pageGrid">
        <div className="panel">
          <div className="label">Your collaboration profile</div>
          <div className="form" style={{ marginTop: 16 }}>
            <label className="field">
              <span>Display name</span>
              <input
                className="input"
                value={profile.displayName}
                onChange={(event) => setProfile({ ...profile, displayName: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Avatar URL</span>
              <input
                className="input"
                value={profile.avatarUrl}
                onChange={(event) => setProfile({ ...profile, avatarUrl: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Bio</span>
              <textarea
                className="textarea"
                rows={4}
                value={profile.bio}
                onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
              />
            </label>
            <label className="field">
              <span>City</span>
              <input className="input" value={profile.city} onChange={(event) => setProfile({ ...profile, city: event.target.value })} />
            </label>
            <label className="field">
              <span>Preferences (comma separated)</span>
              <input
                className="input"
                value={profile.preferences.join(", ")}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    preferences: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                  })
                }
              />
            </label>
            <label className="checkRow">
              <input
                type="checkbox"
                checked={profile.locationDisclosureAccepted}
                onChange={(event) =>
                  setProfile({ ...profile, locationDisclosureAccepted: event.target.checked })
                }
              />
              <span>I am comfortable sharing my coarse collaboration area with nearby members.</span>
            </label>
            <label className="checkRow">
              <input
                type="checkbox"
                checked={profile.promotedHighlight}
                onChange={(event) => setProfile({ ...profile, promotedHighlight: event.target.checked })}
              />
              <span>I want paid highlighting for extra visibility.</span>
            </label>
            <label className="checkRow">
              <input
                type="checkbox"
                checked={profile.promotedDisclosureAccepted}
                onChange={(event) =>
                  setProfile({ ...profile, promotedDisclosureAccepted: event.target.checked })
                }
              />
              <span>I accept the additional disclosure required for highlighted location-based discovery.</span>
            </label>
            <label className="checkRow">
              <input
                type="checkbox"
                checked={profile.notifyOnNearby}
                onChange={(event) => setProfile({ ...profile, notifyOnNearby: event.target.checked })}
              />
              <span>Notify me when a matching member is available nearby.</span>
            </label>
            <button className="button" type="button" onClick={saveProfile}>
              Save collaboration profile
            </button>
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="label">Nearby alerts</div>
            <div className="stack" style={{ marginTop: 16 }}>
              {alerts.length ? (
                alerts.map((alert) => (
                  <div key={alert.id} className="card">
                    <strong>{alert.title}</strong>
                    <p className="muted">{alert.body}</p>
                  </div>
                ))
              ) : (
                <p className="muted">No nearby alerts yet.</p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="label">Incoming and outgoing requests</div>
            <div className="stack" style={{ marginTop: 16 }}>
              {requests.length ? (
                requests.map((request) => (
                  <div key={request.id} className="card">
                    <strong>{request.collaborationType} request</strong>
                    <p className="muted">{request.status}</p>
                    {request.status === "pending" && request.toUserId === currentUserId ? (
                      <div className="heroActions">
                        <button className="button" type="button" onClick={() => respond(request.id, true)}>
                          Accept
                        </button>
                        <button className="buttonSecondary" type="button" onClick={() => respond(request.id, false)}>
                          Decline
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="muted">No requests yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="label">Nearby members</div>
        <div className="cardGrid" style={{ marginTop: 16 }}>
          {nearby.map((member) => (
            <article key={member.userId} className="card">
              <div
                aria-label={member.displayName}
                style={{
                  width: "100%",
                  height: 220,
                  borderRadius: 18,
                  backgroundImage: `url(${member.avatarUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="label" style={{ marginTop: 12 }}>
                {member.city} · {member.distanceKm} km · affinity {member.predictedAffinity}
              </div>
              <h2>
                {member.displayName} {member.promotedHighlight ? "★" : ""}
              </h2>
              <p className="muted">
                {member.collaborationTypes.join(", ")} · {member.preferences.join(", ")}
              </p>
              <div className="heroActions">
                <button className="button" type="button" onClick={() => requestContact(member.userId, "photo")}>
                  Request photo
                </button>
                <button className="buttonSecondary" type="button" onClick={() => requestContact(member.userId, "video")}>
                  Request video
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
