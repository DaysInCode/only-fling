"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, getStoredToken } from "@/lib/api";

type AuditEvent = {
  id: string;
  action: string;
  targetType: string;
  createdAt: string;
  details: string;
};

export default function AdminPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [status, setStatus] = useState("Load an admin session to view the audit log.");

  useEffect(() => {
    apiGet<{ events: AuditEvent[] }>("/admin/audit-log", getStoredToken()).then((result) => {
      if (result.data) {
        setEvents(result.data.events);
        setStatus("Admin audit log loaded.");
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
          <Link href="/auth/sign-in">Sign in</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/crm">CRM</Link>
          <Link href="/qualification">Qualification</Link>
          <Link href="/admin/collaboration">Collaboration</Link>
        </div>
      </nav>

      <section className="pageGrid">
        <div className="heroCard">
          <div className="eyebrow">Admin-only oversight</div>
          <h1 className="heroTitle">Full visibility lives behind audited admin access.</h1>
          <p className="heroLead">
            Regular users do not get cross-account access. This page demonstrates the admin-only audit trail surface
            that underpins moderation, compliance requests, and operational support.
          </p>
        </div>
        <div className="panel">
          <div className="label">Status</div>
          <p className="muted">{status}</p>
        </div>
      </section>

      <section className="section cardGrid">
        <div className="card">
          <div className="label">Operations</div>
          <p className="muted">Users, staff roles, subscriptions, disputes, and moderation.</p>
        </div>
        <div className="card">
          <div className="label">Finance</div>
          <p className="muted">Earnings reports ready for accountant exports and settlement checks.</p>
        </div>
        <div className="card">
          <div className="label">Growth</div>
          <p className="muted">Referral CRM, invite funnels, and AI-ready lead prioritisation.</p>
        </div>
      </section>

      <section className="section panel">
        <table className="table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Target</th>
              <th>When</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.action}</td>
                <td>{event.targetType}</td>
                <td>{new Date(event.createdAt).toLocaleString()}</td>
                <td>{event.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
