import { formatRelativeStatus } from "@/lib/format";

const toneClassName: Record<string, string> = {
  ready: "pillSuccess",
  verified: "pillSuccess",
  complete: "pillSuccess",
  pending: "pillWarning",
  processing: "pillWarning",
  "pending-review": "pillWarning",
  "action-required": "pillDanger",
  required: "pillDanger",
  deleted: "pillDanger",
  active: "pillNeutral",
  draft: "pillNeutral",
  published: "pillSuccess",
};

export function StatusPill({ value }: { value: string }) {
  return <span className={`statusPill ${toneClassName[value] ?? "pillNeutral"}`}>{formatRelativeStatus(value)}</span>;
}
