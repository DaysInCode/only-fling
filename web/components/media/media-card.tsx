import type { MediaItem } from "@/lib/contracts";
import { formatMessage, useLocale } from "@/components/providers/locale-provider";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";

export function MediaCard({
  item,
  onEdit,
  onDelete,
}: {
  item: MediaItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { messages } = useLocale();
  return (
    <div className="card">
      <div className="sectionHeader">
        <div className="stackCompact">
          <div className="label">
            {item.mediaType} · {item.fileName}
          </div>
          <strong>{item.title}</strong>
        </div>
        <StatusPill value={item.uploadStatus} />
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
        {item.description || messages.common.noDescription}
      </p>
      <div className="metricRow">
        <span>{formatCurrency(item.priceMinor, item.currency)}</span>
        <span>{formatMessage(messages.mediaCard.sold, { count: item.soldCount })}</span>
        <span>{formatMessage(messages.mediaCard.earned, { value: formatCurrency(item.earnedMinor, item.currency) })}</span>
      </div>
      <div className="stackCompact" style={{ marginTop: 14 }}>
        <span className="muted">{formatMessage(messages.mediaCard.policyArtifact, { value: item.policyArtifact.fileName })}</span>
        <span className="muted">{formatMessage(messages.mediaCard.updated, { value: formatDateTime(item.updatedAt) })}</span>
      </div>
      <div className="inlineActions" style={{ marginTop: 16 }}>
        <button className="buttonSecondary" type="button" onClick={onEdit}>
          {messages.mediaCard.edit}
        </button>
        <button className="buttonSecondary" type="button" onClick={onDelete}>
          {messages.mediaCard.softDelete}
        </button>
      </div>
    </div>
  );
}
