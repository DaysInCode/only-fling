"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, getStoredToken } from "@/lib/api";

type Lead = {
  id: string;
  displayName: string;
  channel: string;
  source: string;
  stage: string;
  aiScore: number;
  notes: string;
};

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    apiGet<{ leads: Lead[]; note: string }>("/crm/leads", getStoredToken()).then((result) => {
      if (result.data) {
        setLeads(result.data.leads);
        setNote(result.data.note);
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
          <Link href="/plugins">Plugins</Link>
        </div>
      </nav>

      <section className="pageGrid">
        <div className="heroCard">
          <div className="eyebrow">Mini CRM</div>
          <h1 className="heroTitle">Track referral and opt-in leads with AI-ready scoring.</h1>
          <p className="heroLead">
            This starter CRM is structured for consent-based growth and referral loops, with support for WhatsApp and
            Telegram as preferred onboarding channels.
          </p>
        </div>
        <div className="panel">
          <div className="label">Compliance note</div>
          <p className="muted">{note || "Admin session required."}</p>
        </div>
      </section>

      <section className="section panel">
        <table className="table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Channel</th>
              <th>Source</th>
              <th>Stage</th>
              <th>AI score</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>{lead.displayName}</td>
                <td>{lead.channel}</td>
                <td>{lead.source}</td>
                <td>{lead.stage}</td>
                <td>{lead.aiScore}</td>
                <td>{lead.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
