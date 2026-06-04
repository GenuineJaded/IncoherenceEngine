import { X, BookOpen } from "lucide-react";
import { Streamdown } from "streamdown";

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
  const referencedSet = new Set(corpusRefs);

  return (
    <div
      data-testid="corpus-panel"
      className="w-full lg:w-96 border-l flex flex-col h-full flex-shrink-0 z-20 animate-in slide-in-from-right duration-200"
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
          <BookOpen className="w-4 h-4 text-[#c49a2a]" />
          <span className="font-mono text-xs tracking-widest uppercase text-[#c49a2a]">
            Ontological Corpus
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
              className={`p-4 border transition-all duration-300 flex flex-col gap-2.5 ${
                isReferenced
                  ? "border-[#c49a2a]/40 bg-[#c49a2a]/5 shadow-[0_0_15px_rgba(196,154,42,0.05)]"
                  : "border-border/10 bg-card/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xs uppercase tracking-wider text-foreground font-medium">
                  {entry.title}
                </h3>
                {isReferenced && (
                  <span className="font-mono text-[8px] tracking-widest uppercase px-1.5 py-0.5 border border-[#c49a2a]/30 bg-[#c49a2a]/10 text-[#c49a2a]">
                    Active Reference
                  </span>
                )}
              </div>
              <div className="font-sans text-[11px] leading-relaxed text-muted-foreground/90 whitespace-pre-wrap prose prose-invert max-w-none">
                <Streamdown>{entry.text}</Streamdown>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
