import type { MediaItem, UploadStatusEvent } from "@/lib/contracts";
import { formatMessage, useLocale } from "@/components/providers/locale-provider";
import { formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";

export type UploadQueueEntry = {
  mediaItem: MediaItem;
  progress?: number;
  clientStatus?: "uploading" | "uploaded" | "failed";
  clientMessage?: string;
};

export function UploadQueue({
  entries,
  events,
}: {
  entries: UploadQueueEntry[];
  events: UploadStatusEvent[];
}) {
  const { messages } = useLocale();
  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <div className="label">{messages.uploadQueue.eyebrow}</div>
          <h2 style={{ marginTop: 8 }}>{messages.uploadQueue.title}</h2>
        </div>
      </div>
      <div className="stack" style={{ marginTop: 18 }}>
        {entries.map((entry) => {
          const matchingEvent = events.find((event) => event.mediaItemId === entry.mediaItem.id);
          return (
            <div key={entry.mediaItem.id} className="card">
              <div className="sectionHeader">
                <div className="stackCompact">
                  <strong>{entry.mediaItem.title}</strong>
                  <span className="muted">{entry.mediaItem.backgroundStreamId}</span>
                </div>
                <StatusPill value={entry.clientStatus === "failed" ? "required" : matchingEvent?.status ?? entry.mediaItem.uploadStatus} />
              </div>
              <p className="muted" style={{ marginTop: 10 }}>
                {entry.clientMessage ?? matchingEvent?.message ?? messages.uploadQueue.waiting}
              </p>
              <div className="metricRow">
                <span>
                  {entry.progress !== undefined
                    ? formatMessage(messages.uploadQueue.transferred, { progress: entry.progress })
                    : messages.uploadQueue.queued}
                </span>
                <span>{entry.mediaItem.policyArtifact.fileName}</span>
                <span>{formatDateTime(matchingEvent?.createdAt ?? entry.mediaItem.backgroundUpdatedAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
