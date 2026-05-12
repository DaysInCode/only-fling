"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { FormField } from "@/components/ui/form-field";
import { StatusPill } from "@/components/ui/status-pill";
import { useLocale } from "@/components/providers/locale-provider";
import { useSession } from "@/components/providers/session-provider";
import type {
  AuditResponse,
  MonitoringEventsResponse,
  MonitoringSummaryResponse,
  SeedHistoryResponse,
  ActivePluginsResponse,
} from "@/lib/contracts";
import { apiGet, apiPost } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type AdminPluginUpdateInput = {
  pluginId: string;
  enabled?: boolean;
  purchaseBehavior?: {
    defaultPurchaseMethod: "credits" | "stripeCheckout";
    allowedPurchaseMethods: Array<"credits" | "stripeCheckout">;
    requireAgeVerificationForAdultContent: boolean;
    allowEntertainmentLabeling: boolean;
    minimumPurchaseMinor: number;
    maximumPurchaseMinor: number;
  };
};

export default function AdminPage() {
  const { token } = useSession();
  const { messages } = useLocale();
  const [auditEvents, setAuditEvents] = useState<AuditResponse["events"]>([]);
  const [plugins, setPlugins] = useState<ActivePluginsResponse["plugins"]>([]);
  const [seedHistory, setSeedHistory] = useState<SeedHistoryResponse["operations"]>([]);
  const [summary, setSummary] = useState<MonitoringSummaryResponse["summary"] | null>(null);
  const [monitoringEvents, setMonitoringEvents] = useState<MonitoringEventsResponse["events"]>([]);
  const [seedPath, setSeedPath] = useState<string>(messages.adminPage.placeholders.sourcePath);
  const [status, setStatus] = useState<string>(messages.adminPage.forbidden);
  const [savingPluginId, setSavingPluginId] = useState("");
  const [editingPlugin, setEditingPlugin] = useState<ActivePluginsResponse["plugins"][number] | null>(null);

  const load = useCallback(async () => {
    const [auditResult, pluginResult, seedResult, summaryResult, monitoringResult] = await Promise.all([
      apiGet<AuditResponse>("/admin/audit-log", token),
      apiGet<{ plugins: ActivePluginsResponse["plugins"] }>("/admin/plugins", token),
      apiGet<SeedHistoryResponse>("/admin/seeding/history", token),
      apiGet<MonitoringSummaryResponse>("/admin/monitoring/summary", token),
      apiGet<MonitoringEventsResponse>("/admin/monitoring/events", token),
    ]);

    if (auditResult.data) {
      setAuditEvents(auditResult.data.events);
      setStatus(messages.adminPage.auditLoaded);
    } else {
      setStatus(auditResult.error ?? messages.adminPage.forbidden);
    }
    if (pluginResult.data) {
      setPlugins(pluginResult.data.plugins);
      if (!editingPlugin && pluginResult.data.plugins.length) {
        setEditingPlugin(pluginResult.data.plugins[0] ?? null);
      }
    }
    if (seedResult.data) {
      setSeedHistory(seedResult.data.operations);
    }
    if (summaryResult.data) {
      setSummary(summaryResult.data.summary);
    }
    if (monitoringResult.data) {
      setMonitoringEvents(monitoringResult.data.events);
    }
  }, [editingPlugin, messages.adminPage.auditLoaded, messages.adminPage.forbidden, token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const handle = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [load, token]);

  const canSavePlugin = useMemo(
    () => Boolean(editingPlugin?.id && editingPlugin.purchaseBehavior.minimumPurchaseMinor <= editingPlugin.purchaseBehavior.maximumPurchaseMinor),
    [editingPlugin],
  );

  async function importSeed() {
    const result = await apiPost<{ operation: SeedHistoryResponse["operations"][number] }>(
      "/admin/seeding/import",
      { sourcePath: seedPath },
      token,
    );
    setStatus(result.error ?? `${messages.adminPage.importSeed} ${messages.common.status.toLowerCase()}: created`);
    await load();
  }

  async function savePluginConfig() {
    if (!editingPlugin) {
      return;
    }

    setSavingPluginId(editingPlugin.id);
    const payload: AdminPluginUpdateInput = {
      pluginId: editingPlugin.id,
      enabled: editingPlugin.enabled,
      purchaseBehavior: {
        defaultPurchaseMethod: editingPlugin.purchaseBehavior.defaultPurchaseMethod as "credits" | "stripeCheckout",
        allowedPurchaseMethods: editingPlugin.purchaseBehavior.allowedPurchaseMethods as Array<"credits" | "stripeCheckout">,
        requireAgeVerificationForAdultContent: editingPlugin.purchaseBehavior.requireAgeVerificationForAdultContent,
        allowEntertainmentLabeling: editingPlugin.purchaseBehavior.allowEntertainmentLabeling,
        minimumPurchaseMinor: editingPlugin.purchaseBehavior.minimumPurchaseMinor,
        maximumPurchaseMinor: editingPlugin.purchaseBehavior.maximumPurchaseMinor,
      },
    };
    const result = await apiPost<{ plugin: ActivePluginsResponse["plugins"][number] }>("/admin/plugins/config", payload, token);
    setSavingPluginId("");
    setStatus(result.error ?? messages.adminPage.savePlugin);
    await load();
  }

  return (
    <AuthGuard>
      <AppShell>
        <section className="pageGrid">
          <div className="heroCard">
            <div className="eyebrow">{messages.adminPage.eyebrow}</div>
            <h1 className="heroTitle">{messages.adminPage.title}</h1>
            <p className="heroLead">{messages.adminPage.description}</p>
          </div>
          <div className="panel">
            <div className="label">{messages.common.status}</div>
            <p className="muted">{status}</p>
          </div>
        </section>

        <section className="section cardGrid">
          <article className="card">
            <div className="label">{messages.adminPage.summaryCards.purchases}</div>
            <div className="kpi">{summary?.purchaseCount ?? messages.common.emptyValue}</div>
          </article>
          <article className="card">
            <div className="label">{messages.adminPage.summaryCards.processing}</div>
            <div className="kpi">{summary?.pendingProcessingJobs ?? messages.common.emptyValue}</div>
          </article>
          <article className="card">
            <div className="label">{messages.adminPage.summaryCards.imports}</div>
            <div className="kpi">{summary?.seedImports ?? messages.common.emptyValue}</div>
          </article>
          <article className="card">
            <div className="label">{messages.adminPage.summaryCards.telemetry}</div>
            <div className="kpi">{summary?.telemetryEvents ?? messages.common.emptyValue}</div>
          </article>
        </section>

        <section className="section pageGrid">
          <section className="panel">
            <div className="label">{messages.adminPage.pluginTitle}</div>
            <p className="muted" style={{ marginTop: 10 }}>{messages.adminPage.pluginDescription}</p>
            <div className="formGrid" style={{ marginTop: 16 }}>
              <FormField label={messages.adminPage.plugins}>
                <select
                  className="select"
                  value={editingPlugin?.id ?? ""}
                  onChange={(event) => setEditingPlugin(plugins.find((plugin) => plugin.id === event.target.value) ?? null)}
                >
                  {plugins.map((plugin) => (
                    <option key={plugin.id} value={plugin.id}>
                      {plugin.displayName}
                    </option>
                  ))}
                </select>
              </FormField>
              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={editingPlugin?.enabled ?? false}
                  onChange={(event) =>
                    setEditingPlugin((current) => (current ? { ...current, enabled: event.target.checked } : current))
                  }
                />
                <span>{messages.adminPage.enabled}</span>
              </label>
              <FormField label={messages.adminPage.defaultMethod}>
                <select
                  className="select"
                  value={editingPlugin?.purchaseBehavior.defaultPurchaseMethod ?? "credits"}
                  onChange={(event) => {
                    const defaultPurchaseMethod = event.target.value as "credits" | "stripeCheckout";
                    setEditingPlugin((current) =>
                      current
                        ? {
                            ...current,
                            purchaseBehavior: {
                              ...current.purchaseBehavior,
                              defaultPurchaseMethod,
                            },
                          }
                        : current,
                    );
                  }}
                >
                  <option value="credits">credits</option>
                  <option value="stripeCheckout">stripeCheckout</option>
                </select>
              </FormField>
              <FormField label={messages.adminPage.minimumPurchaseMinor}>
                <input
                  className="input"
                  type="number"
                  value={editingPlugin?.purchaseBehavior.minimumPurchaseMinor ?? 0}
                  onChange={(event) =>
                    setEditingPlugin((current) =>
                      current
                        ? {
                            ...current,
                            purchaseBehavior: {
                              ...current.purchaseBehavior,
                              minimumPurchaseMinor: Number(event.target.value),
                            },
                          }
                        : current,
                    )
                  }
                />
              </FormField>
              <FormField label={messages.adminPage.maximumPurchaseMinor}>
                <input
                  className="input"
                  type="number"
                  value={editingPlugin?.purchaseBehavior.maximumPurchaseMinor ?? 0}
                  onChange={(event) =>
                    setEditingPlugin((current) =>
                      current
                        ? {
                            ...current,
                            purchaseBehavior: {
                              ...current.purchaseBehavior,
                              maximumPurchaseMinor: Number(event.target.value),
                            },
                          }
                        : current,
                    )
                  }
                />
              </FormField>
              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={editingPlugin?.purchaseBehavior.requireAgeVerificationForAdultContent ?? true}
                  onChange={(event) =>
                    setEditingPlugin((current) =>
                      current
                        ? {
                            ...current,
                            purchaseBehavior: {
                              ...current.purchaseBehavior,
                              requireAgeVerificationForAdultContent: event.target.checked,
                            },
                          }
                        : current,
                    )
                  }
                />
                <span>{messages.adminPage.requireAgeVerification}</span>
              </label>
            </div>
            <div className="heroActions" style={{ marginTop: 14 }}>
              <button
                className="button"
                type="button"
                disabled={!canSavePlugin || (savingPluginId.length > 0 && savingPluginId === editingPlugin?.id)}
                onClick={() => void savePluginConfig()}
              >
                {messages.adminPage.savePlugin}
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="label">{messages.adminPage.seedTitle}</div>
            <p className="muted" style={{ marginTop: 10 }}>{messages.adminPage.seedDescription}</p>
            <div className="formGrid" style={{ marginTop: 16 }}>
              <FormField label={messages.adminPage.sourcePath}>
                <input className="input" value={seedPath} onChange={(event) => setSeedPath(event.target.value)} />
              </FormField>
            </div>
            <div className="heroActions" style={{ marginTop: 12 }}>
              <button className="button" type="button" onClick={() => void importSeed()}>
                {messages.adminPage.importSeed}
              </button>
              <button className="buttonSecondary" type="button" onClick={() => void load()}>
                {messages.adminPage.refresh}
              </button>
            </div>
            <table className="table" style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>{messages.adminPage.operationsTable.created}</th>
                  <th>{messages.adminPage.operationsTable.source}</th>
                  <th>{messages.adminPage.operationsTable.status}</th>
                  <th>{messages.adminPage.operationsTable.applied}</th>
                </tr>
              </thead>
              <tbody>
                {seedHistory.map((operation) => (
                  <tr key={operation.id}>
                    <td>{formatDateTime(operation.createdAt)}</td>
                    <td>{operation.source}</td>
                    <td><StatusPill value={operation.status} /></td>
                    <td>{Object.entries(operation.appliedCounts).map(([k, v]) => `${k}:${v}`).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </section>

        <section className="section panel">
          <div className="label">{messages.adminPage.monitoringTitle}</div>
          <p className="muted" style={{ marginTop: 10 }}>{messages.adminPage.monitoringDescription}</p>
          <table className="table" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>{messages.adminPage.monitoringTable.when}</th>
                <th>{messages.adminPage.monitoringTable.category}</th>
                <th>{messages.adminPage.monitoringTable.name}</th>
                <th>{messages.adminPage.monitoringTable.status}</th>
                <th>{messages.adminPage.monitoringTable.detail}</th>
              </tr>
            </thead>
            <tbody>
              {monitoringEvents.map((event) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.createdAt)}</td>
                  <td>{event.category}</td>
                  <td>{event.name}</td>
                  <td><StatusPill value={event.status} /></td>
                  <td>{event.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="section panel">
          <div className="label">{messages.adminPage.auditLog}</div>
          <table className="table" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>{messages.adminPage.auditTable.action}</th>
                <th>{messages.adminPage.auditTable.target}</th>
                <th>{messages.adminPage.auditTable.when}</th>
                <th>{messages.adminPage.auditTable.details}</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.map((event) => (
                <tr key={event.id}>
                  <td>{event.action}</td>
                  <td>{event.targetType}</td>
                  <td>{formatDateTime(event.createdAt)}</td>
                  <td>{event.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
