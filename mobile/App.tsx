import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const cards = [
  {
    title: "5-minute activation",
    body: "Terms, profile, secure upload, first item draft, and invite link in a mobile-first flow.",
  },
  {
    title: "Creator rewards",
    body: "Ranks, rewards, and referral bonuses keep the first session productive and repeatable.",
  },
  {
    title: "Qualification pipeline",
    body: "Uploads move through validation and qualification rules before publishing.",
  },
  {
    title: "Admin operations",
    body: "Users, subscriptions, disputes, audit trails, and earnings reporting for staff and accountants.",
  },
];

export default function App() {
  return (
    <View style={styles.shell}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>OnlyFling mobile companion</Text>
        <Text style={styles.title}>Mobile-first creator operations with onboarding, rewards, and control.</Text>
        <Text style={styles.lead}>
          This Expo starter mirrors the web platform: creator activation, secure uploads, referral growth, mini CRM,
          and admin oversight.
        </Text>

        <View style={styles.heroRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>5 min</Text>
            <Text style={styles.metricLabel}>target first upload time</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>Free + Pro</Text>
            <Text style={styles.metricLabel}>account tiers</Text>
          </View>
        </View>

        {cards.map((card) => (
          <View key={card.title} style={styles.card}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardBody}>{card.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Next mobile milestones: auth, dashboard, CRM, qualification, and notifications.</Text>
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
  card: {
    backgroundColor: "#171b25",
    borderRadius: 24,
    padding: 20,
    gap: 10,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  cardBody: {
    color: "#c9d4e4",
    lineHeight: 22,
  },
  footer: {
    marginTop: 8,
    padding: 18,
  },
  footerText: {
    color: "#9aa6bd",
  },
});
