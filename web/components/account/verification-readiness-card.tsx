import type { VerificationReadiness } from "@/lib/contracts";
import { formatMessage, useLocale } from "@/components/providers/locale-provider";
import { formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";

export function VerificationReadinessCard({ readiness }: { readiness: VerificationReadiness }) {
  const { messages } = useLocale();
  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <div className="label">{messages.verificationReadiness.eyebrow}</div>
          <h2 style={{ marginTop: 8 }}>{messages.verificationReadiness.title}</h2>
        </div>
        <StatusPill value={readiness.status} />
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        {messages.verificationReadiness.description}
      </p>
      <div className="cardGrid" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="label">{messages.verificationReadiness.identity}</div>
          <div style={{ marginTop: 8 }}>
            <StatusPill value={readiness.identityStatus} />
          </div>
        </div>
        <div className="card">
          <div className="label">{messages.verificationReadiness.consentArtifacts}</div>
          <div style={{ marginTop: 8 }}>
            <StatusPill value={readiness.consentStatus} />
          </div>
        </div>
        <div className="card">
          <div className="label">{messages.verificationReadiness.payoutReadiness}</div>
          <div style={{ marginTop: 8 }}>
            <StatusPill value={readiness.payoutStatus} />
          </div>
        </div>
      </div>
      <div className="stack" style={{ marginTop: 18 }}>
        {readiness.requiredSteps.map((step) => (
          <div key={step.code} className="inlineCard">
            <div>
              <strong>{step.title}</strong>
              <p className="muted">{step.code}</p>
            </div>
            <StatusPill value={step.status} />
          </div>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 16 }}>
        {formatMessage(messages.verificationReadiness.updated, { value: formatDateTime(readiness.updatedAt) })}
      </p>
    </section>
  );
}
