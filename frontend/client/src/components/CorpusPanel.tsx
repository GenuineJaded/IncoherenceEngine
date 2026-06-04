import { X, BookOpen } from "lucide-react";

interface CorpusEntry {
  concept_id: string;
  title: string;
  text: string;
}

interface CorpusPanelProps {
  corpusRefs: string[];
  corpusData: CorpusEntry[];
  onClose: () => void;
}

export default function CorpusPanel({ corpusRefs, corpusData, onClose }: CorpusPanelProps) {
  // If corpusRefs is provided, highlight those or filter by them, but we'll show all and highlight referenced ones
  const referencedSet = new Set(corpusRefs);

  return (
    <div
      data-testid="corpus-panel"
      className="w-full lg:w-96 border-l flex flex-col h-full flex-shrink-0"
      style={{
        borderColor: "rgba(232, 232, 232, 0.1)",
        background: "#0a0a0c",
      }}
    >
      {/* Panel Header */}
      <div
        className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0"
        style={{ borderColor: "rgba(232, 232, 232, 0.1)" }}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary/80" />
          <span className="font-mono text-xs tracking-widest uppercase text-primary">
            Corpus References
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
        {corpusData.map((entry) => {
          const isReferenced = referencedSet.has(entry.concept_id);
          return (
            <div
              key={entry.concept_id}
              className={`p-4 border transition-all ${
                isReferenced
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/20 bg-card/5"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-serif text-sm uppercase tracking-wider text-foreground">
                  {entry.title}
                </h3>
                {isReferenced && (
                  <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 border border-primary/30 bg-primary/10 text-primary">
                    Referenced
                  </span>
                )}
              </div>
              <p className="font-sans text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                {entry.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
