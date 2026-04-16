import { ScrollArea } from "@/components/ui/scroll-area";

export default function CorpusPanel({ corpusRefs, corpusData, onClose }) {
  return (
    <div
      data-testid="corpus-panel"
      className="w-full lg:w-[420px] xl:w-[480px] flex-shrink-0 flex flex-col animate-slide-in overflow-hidden"
      style={{ background: "#0a0a0a" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: "rgba(232, 232, 232, 0.15)" }}
      >
        <span
          className="font-mono text-xs tracking-widest uppercase"
          style={{ color: "rgba(107, 138, 173, 0.7)" }}
        >
          CORPUS REFERENCES
        </span>
        <button
          data-testid="corpus-panel-close"
          onClick={onClose}
          className="font-mono text-xs cursor-pointer px-2 py-1 border"
          style={{
            color: "rgba(232, 232, 232, 0.4)",
            borderColor: "rgba(232, 232, 232, 0.15)",
            background: "transparent",
          }}
        >
          CLOSE
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-6">
          {corpusRefs.length === 0 ? (
            <p
              className="font-mono text-xs"
              style={{ color: "rgba(232, 232, 232, 0.25)" }}
            >
              No corpus references triggered yet.
            </p>
          ) : (
            corpusRefs.map((refId, i) => {
              const entry = corpusData[refId];
              if (!entry) return null;
              return (
                <div
                  key={refId}
                  data-testid={`corpus-passage-${refId}`}
                  className="mb-10 animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {/* Concept ID label */}
                  <span
                    className="font-mono text-xs tracking-widest uppercase block mb-3"
                    style={{ color: "rgba(107, 138, 173, 0.5)", fontSize: "10px" }}
                  >
                    {refId.replace(/_/g, " ")}
                  </span>

                  {/* Title */}
                  <h3
                    className="font-serif text-lg sm:text-xl mb-4"
                    style={{ color: "#6b8aad", fontWeight: 500 }}
                  >
                    {entry.title}
                  </h3>

                  {/* Content */}
                  <div
                    className="font-serif text-base leading-relaxed"
                    style={{ color: "rgba(107, 138, 173, 0.8)" }}
                  >
                    {entry.content.split("\n\n").map((paragraph, pi) => (
                      <p key={pi} className={pi > 0 ? "mt-4" : ""}>
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {/* Divider */}
                  {i < corpusRefs.length - 1 && (
                    <div
                      className="mt-8"
                      style={{
                        height: "1px",
                        background: "rgba(107, 138, 173, 0.15)",
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
