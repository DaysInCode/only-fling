"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SettingsShell } from "@/components/account/settings-shell";
import { AppShell } from "@/components/layout/app-shell";
import { FormField } from "@/components/ui/form-field";
import { StatusPill } from "@/components/ui/status-pill";
import { useLocale } from "@/components/providers/locale-provider";
import { useSession } from "@/components/providers/session-provider";
import type {
  AccountInvoicesResponse,
  AccountProfileResponse,
  AccountSettingsResponse,
  AccountWalletResponse,
  ActivePluginsResponse,
  MediaPurchaseResponse,
  VerificationReadinessResponse,
} from "@/lib/contracts";
import { apiGet, apiPost } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/format";

type PaymentMethod = "credits" | "stripeCheckout";

export default function AccountWalletPage() {
  const { token, user } = useSession();
  const { messages } = useLocale();
  const [profile, setProfile] = useState<AccountProfileResponse["profile"] | null>(null);
  const [settings, setSettings] = useState<AccountSettingsResponse["settings"] | null>(null);
  const [readiness, setReadiness] = useState<VerificationReadinessResponse["readiness"] | null>(null);
  const [wallet, setWallet] = useState<AccountWalletResponse["wallet"] | null>(null);
  const [invoices, setInvoices] = useState<AccountInvoicesResponse["invoices"]>([]);
  const [purchases, setPurchases] = useState<AccountInvoicesResponse["purchases"]>([]);
  const [plugins, setPlugins] = useState<ActivePluginsResponse["plugins"]>([]);
  const [mediaItemId, setMediaItemId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credits");
  const [status, setStatus] = useState<string>(messages.walletPage.status);

  const load = useCallback(async () => {
    const [profileResult, settingsResult, readinessResult, walletResult, invoicesResult, pluginResult] = await Promise.all([
      apiGet<AccountProfileResponse>("/account/profile", token),
      apiGet<AccountSettingsResponse>("/account/settings", token),
      apiGet<VerificationReadinessResponse>("/account/verification-readiness", token),
      apiGet<AccountWalletResponse>("/account/wallet", token),
      apiGet<AccountInvoicesResponse>("/account/invoices", token),
      apiGet<ActivePluginsResponse>("/plugins/active", token),
    ]);

    if (profileResult.data) {
      setProfile(profileResult.data.profile);
    }
    if (settingsResult.data) {
      setSettings(settingsResult.data.settings);
    }
    if (readinessResult.data) {
      setReadiness(readinessResult.data.readiness);
    }
    if (walletResult.data) {
      setWallet(walletResult.data.wallet);
    }
    if (invoicesResult.data) {
      setInvoices(invoicesResult.data.invoices);
      setPurchases(invoicesResult.data.purchases);
    }
    if (pluginResult.data) {
      setPlugins(pluginResult.data.plugins);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const handle = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [load, token]);

  const summary = useMemo(
    () => ({
      displayName: profile?.displayName ?? user?.email?.split("@")[0] ?? messages.walletPage.fallbackName,
      email: user?.email ?? "",
      role: user?.role ?? "creator",
      avatarUrl: profile?.avatarUrl,
    }),
    [messages.walletPage.fallbackName, profile?.avatarUrl, profile?.displayName, user?.email, user?.role],
  );

  const paymentPlugin = useMemo(
    () => plugins.find((plugin) => plugin.id === "stripe") ?? plugins.find((plugin) => plugin.category.toLowerCase() === "payment"),
    [plugins],
  );

  async function purchaseMedia() {
    const result = await apiPost<MediaPurchaseResponse>(
      "/media/items/purchase",
      {
        mediaItemId,
        paymentMethod,
      },
      token,
    );

    if (result.data) {
      setStatus(messages.walletPage.purchaseSuccess);
      setMediaItemId("");
      await load();
      return;
    }

    setStatus(result.error ?? "purchase-failed");
  }

  return (
    <AuthGuard>
      <AppShell>
        <SettingsShell
          title={messages.walletPage.title}
          description={messages.walletPage.description}
          currentPath="/account/wallet"
          summary={summary}
          settings={settings}
          readiness={readiness}
        >
          <section className="panel">
            <div className="sectionHeader">
              <div>
                <div className="label">{messages.common.wallet}</div>
                <h2 style={{ marginTop: 8 }}>{messages.walletPage.title}</h2>
              </div>
              <span className="muted">{status}</span>
            </div>
            <div className="cardGrid" style={{ marginTop: 18 }}>
              <div className="card">
                <div className="label">{messages.walletPage.credits}</div>
                <div className="kpi" style={{ marginTop: 8 }}>
                  {wallet ? formatCurrency(wallet.creditsMinor, wallet.currency) : messages.common.emptyValue}
                </div>
              </div>
              <div className="card">
                <div className="label">{messages.walletPage.held}</div>
                <div className="kpi" style={{ marginTop: 8 }}>
                  {wallet ? formatCurrency(wallet.heldMinor, wallet.currency) : messages.common.emptyValue}
                </div>
              </div>
              <div className="card">
                <div className="label">{messages.walletPage.spent}</div>
                <div className="kpi" style={{ marginTop: 8 }}>
                  {wallet ? formatCurrency(wallet.spentMinor, wallet.currency) : messages.common.emptyValue}
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="label">{messages.walletPage.purchaseTitle}</div>
            <p className="muted" style={{ marginTop: 10 }}>{messages.walletPage.purchaseDescription}</p>
            <div className="formGrid" style={{ marginTop: 16 }}>
              <FormField label={messages.walletPage.mediaItemId}>
                <input
                  className="input"
                  value={mediaItemId}
                  onChange={(event) => setMediaItemId(event.target.value)}
                />
              </FormField>
              <FormField label={messages.walletPage.paymentMethod}>
                <select
                  className="select"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                >
                  <option value="credits">credits</option>
                  <option value="stripeCheckout">stripeCheckout</option>
                </select>
              </FormField>
            </div>
            <div className="heroActions" style={{ marginTop: 16 }}>
              <button className="button" type="button" onClick={() => void purchaseMedia()} disabled={!mediaItemId.trim()}>
                {messages.walletPage.purchaseButton}
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="label">{messages.walletPage.activePaymentPlugin}</div>
            <table className="table" style={{ marginTop: 16 }}>
              <tbody>
                <tr>
                  <td>{messages.common.status}</td>
                  <td>{paymentPlugin ? <StatusPill value={paymentPlugin.status} /> : messages.common.emptyValue}</td>
                </tr>
                <tr>
                  <td>{messages.walletPage.supportedMethods}</td>
                  <td>{paymentPlugin?.purchaseBehavior.allowedPurchaseMethods.join(", ") ?? messages.common.emptyValue}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="panel">
            <div className="label">{messages.walletPage.invoices}</div>
            <table className="table" style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>{messages.walletPage.invoiceTable.created}</th>
                  <th>{messages.walletPage.invoiceTable.label}</th>
                  <th>{messages.walletPage.invoiceTable.total}</th>
                  <th>{messages.walletPage.invoiceTable.status}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length ? (
                  invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{formatDateTime(invoice.createdAt)}</td>
                      <td>{invoice.label}</td>
                      <td>{formatCurrency(invoice.totalMinor, invoice.currency)}</td>
                      <td><StatusPill value={invoice.status} /></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>{messages.walletPage.emptyInvoices}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <div className="label">{messages.walletPage.purchases}</div>
            <table className="table" style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>{messages.walletPage.purchaseTable.created}</th>
                  <th>{messages.walletPage.purchaseTable.mediaItemId}</th>
                  <th>{messages.walletPage.purchaseTable.method}</th>
                  <th>{messages.walletPage.purchaseTable.status}</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length ? (
                  purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{formatDateTime(purchase.createdAt)}</td>
                      <td>{purchase.mediaItemId}</td>
                      <td>{purchase.paymentMethod}</td>
                      <td><StatusPill value={purchase.status} /></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>{messages.walletPage.emptyPurchases}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </SettingsShell>
      </AppShell>
    </AuthGuard>
  );
}
