"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

type Connector = {
  id: string;
  name: string;
  description: string;
  status: string;
  mcpCapable: boolean;
  scopes: string[];
};

export default function PluginsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);

  useEffect(() => {
    apiGet<{ connectors: Connector[] }>("/connectors").then((result) => {
      if (result.data) {
        setConnectors(result.data.connectors);
      }
    });
  }, []);

  return (
    <main className="shell section">
      <nav className="nav">
        <div className="brand">OnlyFling Starter</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/community">Community</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/admin">Admin</Link>
        </div>
      </nav>

      <section className="heroCard">
        <div className="eyebrow">Plugins and MCP extension points</div>
        <h1 className="heroTitle">Install connectors, keep the core simple, and let the community extend it.</h1>
        <p className="heroLead">
          Connectors are metadata-driven so you can add MCP servers and platform-specific flows later without
          reworking the core onboarding, moderation, or marketplace model.
        </p>
      </section>

      <section className="section cardGrid">
        {connectors.map((connector) => (
          <article key={connector.id} className="card">
            <div className="label">{connector.status}</div>
            <h2>{connector.name}</h2>
            <p className="muted">{connector.description}</p>
            <p className="muted" style={{ marginTop: 12 }}>
              {connector.mcpCapable ? "MCP-ready" : "Native only"} · {connector.scopes.join(", ")}
            </p>
          </article>
        ))}
      </section>

      <section className="section panel">
        <div className="label">Need another integration?</div>
        <p className="muted" style={{ marginTop: 12 }}>
          Users can now submit platform requests in the community area so demand can be ranked before new connectors are built.
        </p>
        <div className="heroActions" style={{ marginTop: 16 }}>
          <Link className="button" href="/community">
            Open community requests
          </Link>
        </div>
      </section>
    </main>
  );
}
