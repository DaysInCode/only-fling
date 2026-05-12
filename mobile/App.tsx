import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { fetchActivePlugins } from "./api";
import { t } from "./i18n";
import type { PluginRuntimeState } from "./types";

export default function App() {
  const [plugins, setPlugins] = useState<PluginRuntimeState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlugins() {
      setLoading(true);
      setError(null);
      const result = await fetchActivePlugins();
      if (result.data) {
        setPlugins(result.data.plugins);
      } else {
        setError(result.error ?? "unknown-error");
      }
      setLoading(false);
    }
    loadPlugins();
  }, []);

  const activePlugins = plugins.filter((p) => p.enabled && p.status === "active");
  const inactivePlugins = plugins.filter((p) => !p.enabled || p.status !== "active");

  function isAgeGated(plugin: PluginRuntimeState): boolean {
    return (
      plugin.purchaseBehavior.requireAgeVerificationForAdultContent &&
      (plugin.configurationHints.accountAgeDays !== undefined ||
        plugin.configurationHints.identityStatus === "verified")
    );
  }

  return (
    <View style={styles.shell}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{t("eyebrow")}</Text>
        <Text style={styles.title}>{t("title")}</Text>
        <Text style={styles.lead}>{t("subtitle")}</Text>

        <View style={styles.heroRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>5 min</Text>
            <Text style={styles.metricLabel}>{t("targetTime")}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>Free + Pro</Text>
            <Text style={styles.metricLabel}>{t("accountTiers")}</Text>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#ffb4d2" />
            <Text style={styles.loadingText}>{t("loading")}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{t("error")}</Text>
            <Text style={styles.errorDetail}>{error}</Text>
          </View>
        )}

        {!loading && !error && plugins.length === 0 && (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>{t("noPlugins")}</Text>
          </View>
        )}

        {!loading && !error && activePlugins.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t("activePlugins")}</Text>
            {activePlugins.map((plugin) => (
              <View key={plugin.id} style={styles.pluginCard}>
                <View style={styles.pluginHeader}>
                  <Text style={styles.pluginTitle}>{plugin.displayName}</Text>
                  {isAgeGated(plugin) && (
                    <View style={styles.ageBadge}>
                      <Text style={styles.ageBadgeText}>{t("ageRestricted")}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.pluginCategory}>{plugin.category}</Text>
                <Text style={styles.pluginBody}>{plugin.description}</Text>
                {isAgeGated(plugin) && (
                  <Text style={styles.pluginHint}>{t("requiresVerification")}</Text>
                )}
              </View>
            ))}
          </>
        )}

        {!loading && !error && inactivePlugins.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t("inactivePlugins")}</Text>
            {inactivePlugins.map((plugin) => (
              <View key={plugin.id} style={[styles.pluginCard, styles.inactivePluginCard]}>
                <Text style={styles.pluginTitle}>{plugin.displayName}</Text>
                <Text style={styles.pluginCategory}>{plugin.category}</Text>
                <Text style={styles.pluginBody}>{plugin.description}</Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t("nextSteps")}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#0f1118",
  },
  content: {
    paddingTop: 72,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  eyebrow: {
    color: "#ffb4d2",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: "#f4f7fb",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
  },
  lead: {
    color: "#9aa6bd",
    fontSize: 16,
    lineHeight: 24,
  },
  heroRow: {
    flexDirection: "row",
    gap: 12,
  },
  metric: {
    flex: 1,
    backgroundColor: "#171b25",
    borderRadius: 20,
    padding: 18,
  },
  metricValue: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
  },
  metricLabel: {
    color: "#9aa6bd",
    marginTop: 6,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 4,
  },
  pluginCard: {
    backgroundColor: "#171b25",
    borderRadius: 24,
    padding: 20,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#22c55e",
  },
  inactivePluginCard: {
    borderLeftColor: "#64748b",
    opacity: 0.7,
  },
  pluginHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  pluginTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
  },
  pluginCategory: {
    color: "#ffb4d2",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pluginBody: {
    color: "#c9d4e4",
    lineHeight: 22,
  },
  pluginHint: {
    color: "#fbbf24",
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 4,
  },
  ageBadge: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ageBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  loadingCard: {
    backgroundColor: "#171b25",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#9aa6bd",
    fontSize: 16,
  },
  errorCard: {
    backgroundColor: "#2c1f1f",
    borderRadius: 24,
    padding: 20,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
  },
  errorText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  errorDetail: {
    color: "#fca5a5",
    fontSize: 14,
  },
  alertCard: {
    backgroundColor: "#2c1f48",
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  alertTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  footer: {
    marginTop: 8,
    padding: 18,
  },
  footerText: {
    color: "#9aa6bd",
  },
});
