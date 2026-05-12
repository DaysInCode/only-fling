type Locale = "en" | "de" | "zh";

const translations = {
  en: {
    title: "Mobile-first creator operations with onboarding, rewards, and control.",
    subtitle: "This Expo starter mirrors the web platform: creator activation, secure uploads, referral growth, mini CRM, and admin oversight.",
    eyebrow: "OnlyFling mobile companion",
    targetTime: "target first upload time",
    accountTiers: "account tiers",
    nextSteps: "Next mobile milestones: auth, dashboard, CRM, qualification, and notifications.",
    activePlugins: "Active Plugins",
    inactivePlugins: "Inactive Plugins",
    ageRestricted: "Age Restricted",
    requiresVerification: "Requires age verification",
    loading: "Loading plugins...",
    error: "Failed to load plugins",
    noPlugins: "No plugins available",
  },
  de: {
    title: "Mobile-First Creator-Operationen mit Onboarding, Belohnungen und Kontrolle.",
    subtitle: "Dieser Expo-Starter spiegelt die Web-Plattform wider: Creator-Aktivierung, sichere Uploads, Empfehlungswachstum, Mini-CRM und Admin-Aufsicht.",
    eyebrow: "OnlyFling mobile Begleiter",
    targetTime: "Ziel für ersten Upload",
    accountTiers: "Kontostufen",
    nextSteps: "Nächste mobile Meilensteine: Auth, Dashboard, CRM, Qualifikation und Benachrichtigungen.",
    activePlugins: "Aktive Plugins",
    inactivePlugins: "Inaktive Plugins",
    ageRestricted: "Altersbeschränkt",
    requiresVerification: "Altersverifizierung erforderlich",
    loading: "Plugins werden geladen...",
    error: "Plugins konnten nicht geladen werden",
    noPlugins: "Keine Plugins verfügbar",
  },
  zh: {
    title: "移动优先的创作者操作，包括入门、奖励和控制。",
    subtitle: "此 Expo 启动器镜像 Web 平台：创作者激活、安全上传、推荐增长、迷你 CRM 和管理监督。",
    eyebrow: "OnlyFling 移动伴侣",
    targetTime: "目标首次上传时间",
    accountTiers: "账户等级",
    nextSteps: "下一个移动里程碑：认证、仪表板、CRM、资格审查和通知。",
    activePlugins: "活跃插件",
    inactivePlugins: "非活跃插件",
    ageRestricted: "年龄限制",
    requiresVerification: "需要年龄验证",
    loading: "正在加载插件...",
    error: "无法加载插件",
    noPlugins: "无可用插件",
  },
};

let currentLocale: Locale = "en";

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: keyof typeof translations.en): string {
  return translations[currentLocale][key];
}
