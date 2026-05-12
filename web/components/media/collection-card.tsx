import type { MediaCollection } from "@/lib/contracts";
import { formatCurrency } from "@/lib/format";
import { StatusPill } from "@/components/ui/status-pill";

export function CollectionCard({
  collection,
  selected,
  onSelect,
}: {
  collection: MediaCollection;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`card selectableCard ${selected ? "selectableCardActive" : ""}`} onClick={onSelect}>
      <div className="sectionHeader">
        <div className="stackCompact">
          <div className="label">{collection.folderName}</div>
          <strong>{collection.title}</strong>
        </div>
        <StatusPill value={collection.publishState} />
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
        {collection.description || "No description yet."}
      </p>
      <div className="metricRow">
        <span>{formatCurrency(collection.priceMinor, collection.currency)}</span>
        <span>{collection.soldCount} sold</span>
        <span>{formatCurrency(collection.earnedMinor, collection.currency)} earned</span>
      </div>
    </button>
  );
}
