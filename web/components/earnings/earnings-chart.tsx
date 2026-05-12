import type { EarningsSeriesPoint } from "@/lib/contracts";
import { formatMessage, useLocale } from "@/components/providers/locale-provider";
import { formatCurrency } from "@/lib/format";

export function EarningsChart({ points }: { points: EarningsSeriesPoint[] }) {
  const { messages } = useLocale();
  if (!points.length) {
    return (
      <div className="panel">
        <div className="label">{messages.earningsChart.title}</div>
        <p className="muted" style={{ marginTop: 12 }}>
          {messages.earningsChart.empty}
        </p>
      </div>
    );
  }

  const maxGross = Math.max(...points.map((point) => point.grossMinor), 1);
  const width = 100;
  const height = 36;
  const step = points.length === 1 ? width : width / (points.length - 1);
  const grossPath = points
    .map((point, index) => {
      const x = index * step;
      const y = height - (point.grossMinor / maxGross) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <div className="label">{messages.earningsChart.title}</div>
          <h2 style={{ marginTop: 8 }}>{messages.earningsChart.grossTrend}</h2>
        </div>
        <span className="muted">{formatMessage(messages.earningsChart.periods, { count: points.length })}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart" role="img" aria-label={messages.earningsChart.ariaLabel}>
        <path d={grossPath} className="chartLine" />
      </svg>
      <div className="chartLegend">
        {points.map((point) => (
          <div key={point.periodStart} className="chartLegendRow">
            <span>{point.periodStart}</span>
            <strong>{formatCurrency(point.grossMinor, point.currency)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
