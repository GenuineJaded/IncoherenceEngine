import React from "react";

interface JRatioMeterProps {
  avgRatio: number | null;
  latestRatio: number | null;
}

export default function JRatioMeter({ avgRatio, latestRatio }: JRatioMeterProps) {
  if (avgRatio === null || avgRatio === undefined) return null;

  const barWidth = 40;
  const filledCount = Math.round(avgRatio * barWidth);
  const emptyCount = Math.max(0, barWidth - filledCount);
  const bar = "█".repeat(filledCount) + "░".repeat(emptyCount);
  const pct = Math.round(avgRatio * 100);

  return (
    <div
      data-testid="j-ratio-meter"
      className="font-mono text-xs border-t px-4 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-shrink-0"
      style={{
        color: "#e8e8e8",
        borderColor: "rgba(232, 232, 232, 0.1)",
        background: "#08080a",
      }}
    >
      <div className="flex items-center gap-4 overflow-hidden">
        <span
          className="tracking-widest uppercase flex-shrink-0"
          style={{ color: "rgba(232, 232, 232, 0.5)", fontSize: "10px" }}
        >
          LIBERATION RATIO
        </span>
        <span 
          className="font-mono text-primary/60 truncate tracking-tighter"
          style={{ letterSpacing: "-0.05em" }}
        >
          [{bar}]
        </span>
        <span className="text-primary font-medium flex-shrink-0">{pct}%</span>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <span style={{ color: "rgba(232, 232, 232, 0.35)", fontSize: "10px" }}>
          J = ΔC / E
        </span>
        {latestRatio !== null && latestRatio !== undefined && (
          <span style={{ color: "rgba(232, 232, 232, 0.5)" }}>
            LATEST: {latestRatio.toFixed(2)}
          </span>
        )}
        <span style={{ color: "rgba(232, 232, 232, 0.5)" }}>
          AVG: {avgRatio.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
