import type { AuditEvent } from "@/lib/contracts";
import { useLocale } from "@/components/providers/locale-provider";
import { formatDateTime } from "@/lib/format";

export function AuditTable({ events }: { events: AuditEvent[] }) {
  const { messages } = useLocale();
  return (
    <section className="panel">
      <div className="label">{messages.auditTable.title}</div>
      <table className="table" style={{ marginTop: 18 }}>
        <thead>
          <tr>
            <th>{messages.auditTable.when}</th>
            <th>{messages.auditTable.action}</th>
            <th>{messages.auditTable.target}</th>
            <th>{messages.auditTable.details}</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{formatDateTime(event.createdAt)}</td>
              <td>{event.action}</td>
              <td>
                {event.targetType} · {event.targetId}
              </td>
              <td>{event.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
