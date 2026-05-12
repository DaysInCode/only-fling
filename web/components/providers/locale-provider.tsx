"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { deOverrides } from "@/lib/locales/de";
import { zhCnOverrides } from "@/lib/locales/zh-CN";

export type Locale = "en" | "de" | "zh-CN";

const storageKey = "onlyfling-locale";

const dictionaries = {
  en: {
    meta: {
      title: "OnlyFling Starter",
      description:
        "Safe creator operations starter with compliant onboarding, marketplace, plugins, and mobile-first growth loops.",
    },
    locale: {
      label: "Language",
      options: {
        en: "English",
        de: "Deutsch",
        "zh-CN": "简体中文",
      },
    },
    common: {
      brand: "OnlyFling Starter",
      home: "Home",
      dashboard: "Dashboard",
      challenges: "Challenges",
      account: "Account",
      settings: "Settings",
      security: "Security",
      media: "Media",
      earnings: "Earnings",
      audit: "Audit",
      wallet: "Wallet",
      admin: "Admin",
      studio: "Studio",
      collaboration: "Collaboration",
      requests: "Requests",
      signIn: "Sign in",
      signOut: "Sign out",
      status: "Status",
      loading: "Loading…",
      save: "Save",
      create: "Create",
      update: "Update",
      request: "Request",
      queue: "Queue",
      noDescription: "No description yet.",
      emptyValue: "—",
      sold: "sold",
      earned: "earned",
      yes: "Yes",
      no: "No",
    },
    appShell: {
      signOut: "Sign out",
      signIn: "Sign in",
    },
    authGuard: {
      loading: "Loading your account…",
      redirecting: "Redirecting to sign in…",
    },
    settingsShell: {
      eyebrow: "Account settings",
      verificationReadiness: "Verification readiness",
      deviceSync: "Device sync",
      localOnly: "Local only",
      syncTemplate: "Canonical on {count} devices",
      lastSync: "Last sync",
      workspace: "Workspace",
      syncModel: "Sync model",
      syncDescription: "Settings are stored as the canonical account view and refreshed across device sessions.",
      links: {
        profile: "Profile summary",
        preferences: "Preferences",
        security: "Security & devices",
        wallet: "Wallet & invoices",
        audit: "Audit trail",
      },
    },
    sessionList: {
      devices: "Devices",
      activeSessions: "Active sessions",
      sessionCount: "{count} sessions",
      unknownUserAgent: "Unknown user agent",
      seen: "Seen {value}",
      expires: "Expires {value}",
      revoke: "Revoke",
      revoking: "Revoking…",
    },
    auditTable: {
      title: "Per-account audit trail",
      when: "When",
      action: "Action",
      target: "Target",
      details: "Details",
    },
    verificationReadiness: {
      eyebrow: "Identity readiness",
      title: "Safe publishing status only",
      description:
        "This UI stays inside readiness, checklist, and status tracking. It does not connect to external adult-verification vendors.",
      identity: "Identity",
      consentArtifacts: "Consent artifacts",
      payoutReadiness: "Payout readiness",
      updated: "Updated {value}",
    },
    uploadQueue: {
      eyebrow: "Background upload stream",
      title: "Queue and policy artifacts",
      waiting: "Waiting for background processing updates.",
      transferred: "{progress}% transferred",
      queued: "Queued",
    },
    collectionCard: {
      sold: "{count} sold",
    },
    mediaCard: {
      sold: "{count} sold",
      earned: "{value} earned",
      policyArtifact: "Policy artifact: {value}",
      updated: "Updated {value}",
      edit: "Edit",
      softDelete: "Soft delete",
    },
    earningsChart: {
      title: "Earnings graph",
      empty: "Earnings data will appear after the first sale posts to the ledger.",
      grossTrend: "Gross trend",
      periods: "{count} periods",
      ariaLabel: "Earnings graph",
    },
    signInPage: {
      eyebrow: "Create account or sign in",
      title: "Create a creator account, then land directly in protected account tools.",
      description:
        "This starter keeps auth lightweight: request a development code, verify it, and the backend creates the account automatically on first use. Session storage stays local to the browser until sign out.",
      bullets: [
        "Use a unique email to create a new account.",
        "Name the current device so session management stays readable.",
        "Protected account pages redirect back here when you are signed out.",
      ],
      email: "Email",
      deviceName: "Device name",
      requestCode: "Request code",
      requesting: "Requesting…",
      verificationCode: "Verification code",
      verify: "Verify and open account",
      exploreAccount: "Already exploring? Go to Account after signing in.",
      loading: "Loading sign-in…",
      messages: {
        providerSent: "sent by provider",
        requestSuccess: "Use code {code} to continue. New emails create an account on first verify.",
        signedIn: "Signed in as {role}. Redirecting…",
        failed: "Sign-in failed.",
      },
    },
    dashboardPage: {
      eyebrow: "Creator + operator dashboard",
      title: "Track account readiness, media, earnings, wallet, and next secure actions.",
      description:
        "The dashboard pulls together protected account journeys, summary metrics, wallet state, and lightweight challenge cards backed by live APIs.",
      signedIn: "Signed in",
      signedOut: "Sign in to load dashboard data.",
      affiliateLaunch: "Affiliate launch",
      createLaunch: "Create your first launch CTA.",
      walletBalance: "Wallet balance",
      creators: "Creators",
      catalogItems: "Catalog items",
      openModeration: "Open moderation cases",
      monthlyGross: "Monthly gross",
      activePlugins: "Active plugins",
      openRequests: "Open requests",
      challengeEyebrow: "Challenges",
      challengeTitle: "Momentum checkpoints",
      challengeCards: {
        revenue: {
          title: "Revenue trend",
          description: "Use the earnings summary and graph to keep gross revenue moving week over week.",
        },
        wallet: {
          title: "Credits ready",
          description: "Keep enough credits available for purchases and quick unlocks in the wallet workspace.",
        },
        workflow: {
          title: "Workflow hygiene",
          description: "Watch moderation, requests, and plugin state from one summary surface.",
        },
      },
      controlCenter: "Account control center",
      controlTitle: "Manage the full signed-in creator journey.",
      controlDescription:
        "Visit account settings for canonical preferences, wallet for credits and invoices, media for uploads, and earnings for graphs and payouts.",
      openAccount: "Open account",
      openWallet: "Open wallet",
      momentum: "Momentum stats",
      momentumRows: {
        referrals: "Active referrals",
        requests: "Open requests",
        plugins: "Active plugins",
        credits: "Credits available",
      },
    },
    accountPage: {
      title: "Profile summary",
      description: "Shape the creator profile shown across account surfaces, discovery permissions, and support contact preferences.",
      status: "Manage the public-facing profile and contact controls for this account.",
      overview: "Overview",
      overviewTitle: "Identity, privacy, and contact",
      saveSuccess: "Profile saved and account summary refreshed.",
      saveFailed: "Profile save failed.",
      displayName: "Display name",
      displayNameHint: "Used across account settings, upload records, and audit flows.",
      supportEmail: "Support email",
      supportEmailHint: "Customer-facing support route for payouts, moderation, and access issues.",
      avatarUrl: "Avatar URL",
      avatarHint: "Optional image URL for the profile summary.",
      profileVisibility: "Profile visibility",
      visibility: { private: "Private", followers: "Followers", public: "Public" },
      bio: "Bio",
      contentTags: "Content tags",
      contentTagsHint: "Comma-separated labels for account and publishing context.",
      collaborationInterests: "Collaboration interests",
      collaborationInterestsHint: "Comma-separated interests for future discovery surfaces.",
      languages: "Languages",
      languagesHint: "Comma-separated language list.",
      toggles: {
        discoverable: "Allow the account to appear in discovery and account lookups.",
        showActivity: "Show recent publishing activity on the profile.",
        allowDirectMessages: "Allow direct messages from approved users.",
        emailOptIn: "Receive operational email updates.",
        marketingOptIn: "Receive product and marketing updates.",
      },
      saveProfile: "Save profile",
      fallbackName: "Account",
    },
    accountSettingsPage: {
      title: "Preferences",
      description:
        "Use sections similar to Slack or Telegram: notifications, payout preferences, purchase controls, and a canonical device-sync view.",
      status: "Notification, payout, purchase, and device-sync preferences are stored per account.",
      notifications: "Notifications",
      notificationsTitle: "Operational signals",
      notificationLabels: {
        email: "Email updates",
        push: "Push placeholders",
        product: "Product notices",
        payouts: "Payout changes",
        security: "Security alerts",
      },
      deviceSync: "Device sync",
      deviceSyncTitle: "Canonical settings feel",
      syncDescription: "Sync settings across active sessions and keep the current device as the latest canonical source.",
      currentDevice: "Current device",
      lastCanonicalUpdate: "Last canonical update",
      activeSessions: "Active sessions",
      payoutPreferences: "Payout preferences",
      payoutPreferencesTitle: "Settlement controls",
      settlementCurrency: "Settlement currency",
      schedule: "Schedule",
      methodStatus: "Method status",
      scheduleOptions: { manual: "Manual", weekly: "Weekly", monthly: "Monthly" },
      methodOptions: { "not-configured": "Not configured", pending: "Pending", ready: "Ready" },
      purchasePreferences: "Purchase controls",
      purchasePreferencesTitle: "Age gate and invoice labels",
      adultVerified: "I confirm that adult-only purchases on this account have passed the required age verification.",
      labelAsEntertainment: "Label invoices with an entertainment value description when the active payment plugin allows it.",
      entertainmentLabelValue: "Entertainment label value",
      saveSettings: "Save settings",
      saveSuccess: "Canonical settings updated for the account.",
      saveFailed: "Settings update failed.",
    },
    accountSecurityPage: {
      title: "Security & devices",
      description: "Dedicated session management, closure controls, and identity-readiness status live here.",
      status: "Security settings sync in the background while sessions stay account-scoped.",
      revokeSuccess: "Session revoked.",
      requestSuccess: "Close-account request staged.",
      closeSuccess: "Account closure completed.",
      closeFailed: "Close-account action failed.",
      danger: "Danger zone",
      closeAccount: "Close account",
      closeDescription:
        "Closure is soft-state only. Audit history stays intact and the flow requires an explicit request before final confirmation.",
      reason: "Reason",
      confirmDisplayName: "Type display name to confirm",
      confirmEmail: "Type email to confirm",
      retentionAck: "I understand audit and retention records remain.",
      accessAck: "I understand account access will be lost after closure.",
      requestClosure: "Request closure",
      finalizeClosure: "Close account",
      fallbackName: "Account",
    },
    accountAuditPage: {
      title: "Audit trail",
      description: "Every account-scoped action stays visible here, including auth, media, payout, and closure activity.",
      fallbackName: "Account",
    },
    earningsPage: {
      eyebrow: "Earnings and payouts",
      title: "See earned totals, ledger trend, and payout history in one place.",
      description:
        "Summary totals stay visible alongside a lightweight earnings graph, payout request history, and a direct route into wallet and invoice surfaces.",
      status: "Track earned totals, gross vs net graph, and payout history.",
      available: "Available",
      gross: "Gross",
      net: "Net",
      fees: "Fees",
      pendingPayouts: "Pending payouts",
      requestPayout: "Request payout",
      amountMinor: "Amount minor",
      note: "Note",
      requestButton: "Request payout",
      history: "Payout history",
      requested: "Requested",
      amount: "Amount",
      payoutRequested: "Payout request submitted.",
      noteDefault: "Manual payout request",
      walletShortcut: "Open wallet & invoices",
    },
    walletPage: {
      title: "Wallet & invoices",
      description:
        "Track credits, purchase outcomes, invoice labels, and plugin-backed purchase rules from one account surface.",
      status: "Wallet balances, invoices, and purchase controls update from live account APIs.",
      fallbackName: "Account",
      credits: "Credits",
      held: "Held",
      spent: "Spent",
      updated: "Updated {value}",
      purchases: "Purchases",
      invoices: "Invoices",
      pluginRules: "Plugin rules",
      purchaseTitle: "Purchase media by ID",
      purchaseDescription:
        "Use a shared media item identifier from a creator link or seeded environment. Credits purchases will respect wallet balance and adult-content age verification.",
      mediaItemId: "Media item ID",
      paymentMethod: "Payment method",
      ageGateTitle: "Adult content age gate",
      ageGateDescription:
        "If a media item is adult-rated and the active plugin requires age verification, purchases stay blocked until the account setting below is enabled.",
      openSettings: "Open purchase settings",
      purchaseButton: "Purchase media",
      purchaseSuccess: "Purchase completed.",
      purchaseRows: {
        purchase: "Purchase",
        invoice: "Invoice",
        label: "Label",
        total: "Total",
      },
      invoiceTable: {
        created: "Created",
        label: "Label",
        total: "Total",
        status: "Status",
      },
      purchaseTable: {
        created: "Created",
        mediaItemId: "Media item",
        method: "Method",
        status: "Status",
      },
      emptyInvoices: "No invoices yet.",
      emptyPurchases: "No purchases yet.",
      activePaymentPlugin: "Active payment plugin",
      supportedMethods: "Supported methods",
    },
    mediaPage: {
      eyebrow: "Media workspace",
      title: "Publish collections, queue uploads, and preview vertical video cards from account data.",
      description:
        "This workspace uses signed upload intake, queue polling, and API-driven media previews rather than sample cards.",
      status: "Create collections, capture policy artifacts, and stream uploads against the signed-in account.",
      chooseCollection: "Choose a collection and a file first.",
      confirmConsent: "Upload consent must be confirmed before intake.",
      collectionCreated: "Collection created.",
      collectionUpdated: "Collection updated.",
      collectionDeleted: "Collection soft deleted.",
      itemUpdated: "Media item updated.",
      itemDeleted: "Media item soft deleted.",
      uploadReady: "Upload staged. Background processing is running.",
      collectionForm: {
        title: "Collection details",
        folderName: "Folder name",
        titleLabel: "Title",
        description: "Description",
        visibility: "Visibility",
        publishState: "Publish state",
        priceMinor: "Price minor",
        currency: "Currency",
        create: "Create collection",
        update: "Update collection",
      },
      uploadForm: {
        title: "Upload intake",
        file: "File",
        mediaTitle: "Title",
        description: "Description",
        ageRating: "Age rating",
        performerCount: "Performer count",
        consentDocumentName: "Consent document name",
        recordRetentionYears: "Record retention years",
        consentNotes: "Consent notes",
        termsSummary: "Terms summary",
        pricingSummary: "Pricing summary",
        additionalNotes: "Additional notes",
        confirmAdults: "I confirm all performers are adults.",
        confirmRights: "I confirm publishing rights are documented.",
        startUpload: "Start background upload",
      },
      browse: {
        eyebrow: "Vertical browse",
        title: "TikTok-style preview contract",
        description:
          "Preview snapshots and short clips come from API media metadata so publishing and review stay lightweight.",
        play: "Play preview",
        pause: "Pause preview",
        fullscreen: "Open full screen",
        noItems: "No media items are available for the selected collection yet.",
      },
      queueJobs: "Queue jobs",
      processingQueue: "Processing queue",
      queueEmpty: "No processing jobs are active right now.",
      visibilityOptions: { private: "Private", followers: "Followers", public: "Public" },
      publishOptions: { draft: "Draft", published: "Published" },
      ageRatingOptions: { general: "General", adult: "Adult" },
      defaults: {
        folderName: "creator-drop",
        collectionTitle: "New collection",
        uploadTitle: "New upload",
        consentDocument: "content-consent",
        termsSummary: "All performers are confirmed adults and publication rights are documented.",
        pricingSummary: "Draft price can change before publishing.",
      },
    },
    adminPage: {
      eyebrow: "Admin operations",
      title: "Manage plugins, filesystem seeding, monitoring, and audit visibility.",
      description:
        "Every admin surface here is backed by the new admin APIs so plugin behavior, seed operations, and monitoring stay auditable.",
      auditLoaded: "Admin audit log loaded.",
      forbidden: "Load an admin session to view the admin console.",
      plugins: "Plugin management",
      seeding: "Filesystem seeding",
      monitoring: "Monitoring",
      auditLog: "Audit log",
      pluginTitle: "Plugin runtime state",
      pluginDescription: "Update enablement and purchase behavior for admin-visible plugins.",
      seedTitle: "Seed import",
      seedDescription: "Import an allowlisted manifest path or keep watching recent seed operations.",
      monitoringTitle: "Monitoring summary",
      monitoringDescription: "Summary counts and recent events are refreshed from monitoring APIs.",
      sourcePath: "Source path",
      importSeed: "Import seed",
      refresh: "Refresh",
      savePlugin: "Save plugin config",
      enabled: "Enabled",
      defaultMethod: "Default purchase method",
      allowedMethods: "Allowed methods",
      requireAgeVerification: "Require adult age verification",
      allowEntertainmentLabeling: "Allow entertainment invoice labels",
      minimumPurchaseMinor: "Minimum purchase minor",
      maximumPurchaseMinor: "Maximum purchase minor",
      summaryCards: {
        purchases: "Purchases",
        processing: "Pending jobs",
        imports: "Seed imports",
        telemetry: "Telemetry events",
      },
      monitoringTable: {
        when: "When",
        category: "Category",
        name: "Event",
        status: "Status",
        detail: "Detail",
      },
      operationsTable: {
        created: "Created",
        source: "Source",
        status: "Status",
        applied: "Applied counts",
      },
      auditTable: {
        action: "Action",
        target: "Target",
        when: "When",
        details: "Details",
      },
      placeholders: {
        sourcePath: "seed\\admin-seed.json",
      },
    },
  },
  de: {} as never,
  "zh-CN": {} as never,
} as const;

type EnglishDictionary = typeof dictionaries.en;
export type Messages = EnglishDictionary;

type DictionaryOverride = Record<string, unknown>;

function mergeDictionary(base: DictionaryOverride, override: DictionaryOverride): DictionaryOverride {
  const output: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      continue;
    }
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base &&
      typeof (base as Record<string, unknown>)[key] === "object" &&
      (base as Record<string, unknown>)[key] !== null
    ) {
      output[key] = mergeDictionary(
        base[key] as DictionaryOverride,
        value as Record<string, unknown>,
      );
      continue;
    }
    output[key] = value;
  }
  return output;
}

function buildDerivedDictionary(locale: Exclude<Locale, "en">): EnglishDictionary {
  const localeNames = {
    de: {
      label: "Sprache",
      en: "Englisch",
      de: "Deutsch",
      "zh-CN": "Vereinfachtes Chinesisch",
    },
    "zh-CN": {
      label: "语言",
      en: "英语",
      de: "德语",
      "zh-CN": "简体中文",
    },
  } as const;

  const overrides: Record<Exclude<Locale, "en">, DictionaryOverride> = {
    de: deOverrides as DictionaryOverride,
    "zh-CN": zhCnOverrides as DictionaryOverride,
  };

  return mergeDictionary(
    {
      ...dictionaries.en,
      locale: {
        ...dictionaries.en.locale,
        label: localeNames[locale].label,
        options: localeNames[locale],
      },
    },
    overrides[locale],
  ) as EnglishDictionary;
}

const derivedDictionaries: Record<Locale, EnglishDictionary> = {
  en: dictionaries.en,
  de: buildDerivedDictionary("de"),
  "zh-CN": buildDerivedDictionary("zh-CN"),
};

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Messages;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function resolveInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(storageKey) as Locale | null;
  if (stored && stored in derivedDictionaries) {
    return stored;
  }

  const browserLocale = window.navigator.language.toLowerCase();
  if (browserLocale.startsWith("de")) {
    return "de";
  }
  if (browserLocale.startsWith("zh")) {
    return "zh-CN";
  }

  return "en";
}

export function formatMessage(template: string, values: Record<string, number | string>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveInitialLocale());

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, locale);
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      messages: derivedDictionaries[locale],
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }

  return context;
}
