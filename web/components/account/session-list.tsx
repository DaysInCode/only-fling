import type { AccountSessionView } from "@/lib/contracts";
import { formatMessage, useLocale } from "@/components/providers/locale-provider";
import { formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";

export function SessionList({
  sessions,
  onRevoke,
  revokingId,
}: {
  sessions: AccountSessionView[];
  onRevoke: (sessionId: string) => void;
  revokingId?: string;
}) {
  const { messages } = useLocale();
  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <div className="label">{messages.sessionList.devices}</div>
          <h2 style={{ marginTop: 8 }}>{messages.sessionList.activeSessions}</h2>
        </div>
        <span className="muted">{formatMessage(messages.sessionList.sessionCount, { count: sessions.length })}</span>
      </div>
      <div className="stack" style={{ marginTop: 18 }}>
        {sessions.map((session) => (
          <div key={session.id} className="inlineCard">
            <div className="stackCompact">
              <strong>{session.deviceLabel}</strong>
              <p className="muted">{session.userAgent || messages.sessionList.unknownUserAgent}</p>
              <p className="muted">
                {formatMessage(messages.sessionList.seen, { value: formatDateTime(session.lastSeenAt) })} ·{" "}
                {formatMessage(messages.sessionList.expires, { value: formatDateTime(session.expiresAt) })}
              </p>
            </div>
            <div className="inlineActions">
              {session.current ? <StatusPill value="active" /> : null}
              {session.revokedAt ? <StatusPill value="deleted" /> : null}
              {!session.current && !session.revokedAt ? (
                <button
                  className="buttonSecondary"
                  type="button"
                  disabled={revokingId === session.id}
                  onClick={() => onRevoke(session.id)}
                >
                  {revokingId === session.id ? messages.sessionList.revoking : messages.sessionList.revoke}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
