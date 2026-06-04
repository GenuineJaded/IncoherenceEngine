import { useState, useMemo } from "react";
import { FAILURE_MODES, FailureModeKey } from "@shared/const";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

export interface Annotation {
  type: FailureModeKey;
  target_text: string;
  explanation: string;
  severity: "low" | "medium" | "high";
}

interface AnnotatedResponseProps {
  response: string;
  annotations: Annotation[];
}

export default function AnnotatedResponse({ response, annotations }: AnnotatedResponseProps) {
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null);

  // Split response text to insert interactive inline highlight tags
  const renderResponseWithHighlights = useMemo(() => {
    if (!annotations || annotations.length === 0) {
      return <p className="font-sans text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">{response}</p>;
    }

    let resultElements: React.ReactNode[] = [];
    let currentIdx = 0;
    const textLower = response.toLowerCase();

    // Sort annotations by their occurrence position in the text to avoid overlapping errors
    const sortedAnnotations = [...annotations]
      .map((ann) => {
        const startIdx = textLower.indexOf(ann.target_text.toLowerCase());
        return { ...ann, startIdx };
      })
      .filter((ann) => ann.startIdx !== -1)
      .sort((a, b) => a.startIdx - b.startIdx);

    if (sortedAnnotations.length === 0) {
      return <p className="font-sans text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">{response}</p>;
    }

    sortedAnnotations.forEach((ann, idx) => {
      // Add plain text before highlight
      if (ann.startIdx > currentIdx) {
        resultElements.push(
          <span key={`text-${idx}`} className="whitespace-pre-wrap">
            {response.substring(currentIdx, ann.startIdx)}
          </span>
        );
      }

      // Add highlighted text block
      const endIdx = ann.startIdx + ann.target_text.length;
      const highlightText = response.substring(ann.startIdx, endIdx);
      const isSelected = activeAnnotation?.target_text === ann.target_text;

      // Color mapping based on severity
      const severityColor =
        ann.severity === "high"
          ? "border-destructive/60 bg-destructive/5 hover:bg-destructive/10 text-destructive-foreground"
          : ann.severity === "medium"
          ? "border-primary/60 bg-primary/5 hover:bg-primary/10 text-primary"
          : "border-muted-foreground/40 bg-muted/5 hover:bg-muted/10 text-muted-foreground";

      resultElements.push(
        <span
          key={`highlight-${idx}`}
          onClick={() => setActiveAnnotation(isSelected ? null : ann)}
          className={`cursor-pointer border-b-2 transition-all px-0.5 font-medium ${severityColor} ${
            isSelected ? "bg-white/10 border-white/80" : ""
          }`}
          title={`Click to view diagnostic critique: ${FAILURE_MODES[ann.type]?.label || ann.type}`}
        >
          {highlightText}
          <span className="align-super text-[9px] font-mono ml-0.5 select-none opacity-60">
            [{idx + 1}]
          </span>
        </span>
      );

      currentIdx = endIdx;
    });

    // Add trailing text
    if (currentIdx < response.length) {
      resultElements.push(
        <span key="text-end" className="whitespace-pre-wrap">
          {response.substring(currentIdx)}
        </span>
      );
    }

    return <p className="font-sans text-base leading-relaxed text-foreground/90">{resultElements}</p>;
  }, [response, annotations, activeAnnotation]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Response content with highlights */}
      <div className="relative">
        <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground/60 block mb-2">
          SYSTEM
        </span>
        {renderResponseWithHighlights}
      </div>

      {/* Active Critique Detail Panel */}
      {activeAnnotation && (
        <div
          className={`border p-4 transition-all duration-200 animate-in fade-in-50 slide-in-from-top-2 ${
            activeAnnotation.severity === "high"
              ? "border-destructive/30 bg-destructive/5"
              : activeAnnotation.severity === "medium"
              ? "border-primary/30 bg-primary/5"
              : "border-border/30 bg-card/5"
          }`}
        >
          <div className="flex items-center justify-between gap-4 mb-3 border-b border-border/10 pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle
                className={`w-4 h-4 ${
                  activeAnnotation.severity === "high"
                    ? "text-destructive"
                    : activeAnnotation.severity === "medium"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              />
              <span className="font-mono text-xs tracking-wider uppercase font-bold text-foreground">
                {FAILURE_MODES[activeAnnotation.type]?.label || activeAnnotation.type}
              </span>
            </div>
            <span
              className={`font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 border ${
                activeAnnotation.severity === "high"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : activeAnnotation.severity === "medium"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-muted-foreground/30 bg-muted/10 text-muted-foreground"
              }`}
            >
              SEVERITY: {activeAnnotation.severity}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="font-sans text-xs text-muted-foreground leading-relaxed italic">
              Target: &ldquo;{activeAnnotation.target_text}&rdquo;
            </div>
            <div className="font-mono text-[11px] text-muted-foreground/80 leading-normal uppercase">
              Definition: {FAILURE_MODES[activeAnnotation.type]?.description}
            </div>
            <div className="font-sans text-sm text-foreground/90 leading-relaxed border-t border-border/5 pt-2 mt-1">
              {activeAnnotation.explanation}
            </div>
          </div>
        </div>
      )}

      {/* Overview list of detected annotations */}
      {annotations.length > 0 && (
        <div className="border border-border/10 bg-black/20 p-4 flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground/40 block mb-1">
            Detected Failure Modes ({annotations.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {annotations.map((ann, idx) => {
              const isSelected = activeAnnotation?.target_text === ann.target_text;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveAnnotation(isSelected ? null : ann)}
                  className={`font-mono text-[10px] tracking-wider uppercase px-2 py-1 border transition-all ${
                    isSelected
                      ? "border-white bg-white/10 text-foreground"
                      : ann.severity === "high"
                      ? "border-destructive/30 hover:border-destructive/60 bg-destructive/5 text-destructive-foreground/80"
                      : ann.severity === "medium"
                      ? "border-primary/30 hover:border-primary/60 bg-primary/5 text-primary/80"
                      : "border-border/30 hover:border-border/60 bg-card/5 text-muted-foreground"
                  }`}
                >
                  [{idx + 1}] {FAILURE_MODES[ann.type]?.label || ann.type}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
