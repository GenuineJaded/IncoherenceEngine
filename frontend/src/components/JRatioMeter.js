export default function JRatioMeter({ avgRatio, latestRatio }) {
  if (avgRatio === null || avgRatio === undefined) return null;

  const barWidth = 40;
  const filledCount = Math.round(avgRatio * barWidth);
  const emptyCount = barWidth - filledCount;
  const bar = "\u2588".repeat(filledCount) + "\u2591".repeat(emptyCount);
  const pct = Math.round(avgRatio * 100);

  return (
    <div
      data-testid="j-ratio-meter"
      className="font-mono text-xs border-t px-4 sm:px-8 py-2 flex items-center justify-between flex-shrink-0"
      style={{
        color: "#e8e8e8",
        borderColor: "rgba(232, 232, 232, 0.15)",
        background: "#0a0a0a",
      }}
    >
      <div className="flex items-center gap-4">
        <span
          className="tracking-widest uppercase"
          style={{ color: "rgba(232, 232, 232, 0.5)", fontSize: "10px" }}
        >
          LIBERATION RATIO
        </span>
        <span style={{ color: "rgba(232, 232, 232, 0.6)", letterSpacing: "0" }}>
          [{bar}]
        </span>
        <span style={{ color: "#e8e8e8" }}>{pct}%</span>
      </div>
      <div className="flex items-center gap-4">
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
