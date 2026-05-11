"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type Connector = {
  id: string;
  name: string;
  status: string;
  mcpCapable: boolean;
};

export function ConnectorPreview() {
  const [connectors, setConnectors] = useState<Connector[]>([]);

  useEffect(() => {
    apiGet<{ connectors: Connector[] }>("/connectors").then((result) => {
      if (result.data) {
        setConnectors(result.data.connectors.slice(0, 4));
      }
    });
  }, []);

  return (
    <div className="panel">
      <div className="label">Connector templates</div>
      <div className="stack">
        {connectors.map((connector) => (
          <div key={connector.id} className="card">
            <strong>{connector.name}</strong>
            <p className="muted">
              {connector.status} · {connector.mcpCapable ? "MCP-ready" : "Native only"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
