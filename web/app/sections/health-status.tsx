"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type HealthPayload = {
  status: string;
  timestamp: string;
  platformFeePercent: number;
};

export function HealthStatus() {
  const [payload, setPayload] = useState<HealthPayload | null>(null);

  useEffect(() => {
    apiGet<HealthPayload>("/health").then((result) => {
      if (result.data) {
        setPayload(result.data);
      }
    });
  }, []);

  return (
    <div className="panel">
      <div className="label">Platform health</div>
      <div className="kpi">{payload?.status ?? "..."}</div>
      <p className="muted">
        Default platform fee: {payload?.platformFeePercent ?? "--"}%. API health updates from the active
        deployment backend.
      </p>
    </div>
  );
}
