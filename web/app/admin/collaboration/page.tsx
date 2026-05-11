"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, getStoredToken } from "@/lib/api";

type CollaborationProfile = {
  userId: string;
  displayName: string;
  city: string;
  promotedHighlight: boolean;
  availableNow: boolean;
  contactHandle: string;
  locationDisclosureAccepted: boolean;
};

type CollaborationRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  collaborationType: string;
  status: string;
};

export default function AdminCollaborationPage() {
  const [profiles, setProfiles] = useState<CollaborationProfile[]>([]);
  const [requests, setRequests] = useState<CollaborationRequest[]>([]);
  const [status, setStatus] = useState("Admin sign-in required.");

  useEffect(() => {
    apiGet<{ profiles: CollaborationProfile[]; requests: CollaborationRequest[] }>(
      "/admin/collaboration",
      getStoredToken(),
    ).then((result) => {
      if (result.data) {
        setProfiles(result.data.profiles);
        setRequests(result.data.requests);
        setStatus("Admin collaboration overview loaded.");
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
          <Link href="/collaboration">Collaboration</Link>
        </div>
      </nav>

      <section className="pageGrid">
        <div className="heroCard">
          <div className="eyebrow">Admin collaboration visibility</div>
          <h1 className="heroTitle">Full oversight of profiles, highlights, and mutual contact flows.</h1>
          <p className="heroLead">
            Admin can review location-sharing consent, promoted discovery disclosures, and request outcomes across the
            collaboration network.
          </p>
        </div>
        <div className="panel">
          <div className="label">Status</div>
          <p className="muted">{status}</p>
        </div>
      </section>

      <section className="section panel">
        <div className="label">Profiles</div>
        <table className="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>City</th>
              <th>Highlight</th>
              <th>Available</th>
              <th>Location consent</th>
              <th>Contact handle</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.userId}>
                <td>{profile.displayName}</td>
                <td>{profile.city}</td>
                <td>{profile.promotedHighlight ? "Yes" : "No"}</td>
                <td>{profile.availableNow ? "Yes" : "No"}</td>
                <td>{profile.locationDisclosureAccepted ? "Yes" : "No"}</td>
                <td>{profile.contactHandle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section panel">
        <div className="label">Requests</div>
        <table className="table">
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.fromUserId}</td>
                <td>{request.toUserId}</td>
                <td>{request.collaborationType}</td>
                <td>{request.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
