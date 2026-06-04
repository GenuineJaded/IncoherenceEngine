import { useState, useMemo } from "react";
import { FAILURE_MODES, FailureModeKey } from "@shared/const";
import { AlertCircle, Sparkles, Brain } from "lucide-react";

export interface Annotation {
  type: FailureModeKey;
  target_text: string;
  explanation: string;
  substrate_why?: string; // Diagnosis of training substrate
  severity: "low" | "medium" | "high";
  analyzerId?: string;
  analyzerName?: string;
  analyzerPersona?: "Field Witness" | "Reflective Mirror";
  color?: string; // Dynamic color assigned to this specific analyzer
}

interface AnnotatedResponseProps {
  response: string;
  annotations: Annotation[];
}

export default function AnnotatedResponse({ response, annotations }: AnnotatedResponseProps) {
  // To support multi-layered overlapping annotations, we'll track the active selected text span,
  // and if multiple analyzers flagged it, we'll let the user toggle tabs inside the detail panel.
  const [selectedSpanText, setSelectedSpanText] = useState<string | null>(null);
  const [activeTabIdx, setActiveTabIdx] = useState<number>(0);

  // Group annotations that target the exact same or overlapping substrings
  // For simplicity and perfect rendering, we will group annotations by exact target_text match.
  const groupedAnnotations = useMemo(() => {
    const groups: { [key: string]: Annotation[] } = {};
    annotations.forEach((ann) => {
      const key = ann.target_text.toLowerCase();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(ann);
    });
    return groups;
  }, [annotations]);

  // List of unique target text spans
  const uniqueSpans = useMemo(() => {
    return Object.keys(groupedAnnotations).map(key => groupedAnnotations[key][0].target_text);
  }, [groupedAnnotations]);

  // Split response text to insert interactive multi-color layered highlights
  const renderResponseWithHighlights = useMemo(() => {
    if (!annotations || annotations.length === 0) {
      return <p className="font-sans text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">{response}</p>;
    }

    let resultElements: React.ReactNode[] = [];
    let currentIdx = 0;
    const textLower = response.toLowerCase();

    // Sort unique target spans by their occurrence position in the text
    const sortedSpans = uniqueSpans
      .map((spanText) => {
        const startIdx = textLower.indexOf(spanText.toLowerCase());
        return { spanText, startIdx };
      })
      .filter((item) => item.startIdx !== -1)
      .sort((a, b) => a.startIdx - b.startIdx);

    if (sortedSpans.length === 0) {
      return <p className="font-sans text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">{response}</p>;
    }

    sortedSpans.forEach((item, idx) => {
      // Add plain text before highlight
      if (item.startIdx > currentIdx) {
        resultElements.push(
          <span key={`text-${idx}`} className="whitespace-pre-wrap">
            {response.substring(currentIdx, item.startIdx)}
          </span>
        );
      }

      // Add highlighted text block
      const endIdx = item.startIdx + item.spanText.length;
      const highlightText = response.substring(item.startIdx, endIdx);
      const isSelected = selectedSpanText?.toLowerCase() === item.spanText.toLowerCase();

      // Retrieve all annotations for this specific span
      const spanAnnotations = groupedAnnotations[item.spanText.toLowerCase()] || [];

      // Calculate layered color blend or stripes
      // If 1 analyzer: solid color border-b + subtle bg glow
      // If multiple analyzers: stacked borders or mixed glow
      const firstAnn = spanAnnotations[0];
      const colors = spanAnnotations.map(a => a.color || "#c49a2a");

      // Generate CSS gradient background for multiple overlapping excavators
      let backgroundStyle: React.CSSProperties = {};
      let borderStyle: React.CSSProperties = { borderBottomWidth: "2px" };

      if (colors.length === 1) {
        borderStyle.borderBottomColor = colors[0];
        backgroundStyle.backgroundColor = `${colors[0]}08`; // 5% opacity
      } else {
        // Multi-color stripe gradient border
        const gradientColors = colors.map((c, i) => `${c} ${i * (100 / colors.length)}%, ${c} ${(i + 1) * (100 / colors.length)}%`).join(", ");
        borderStyle.borderImage = `linear-gradient(to right, ${gradientColors}) 1`;
        
        // Multi-layered subtle background blend
        backgroundStyle.background = `linear-gradient(135deg, ${colors.map(c => `${c}05`).join(", ")})`;
      }

      resultElements.push(
        <span
          key={`highlight-${idx}`}
          onClick={() => {
            if (isSelected) {
              setSelectedSpanText(null);
            } else {
              setSelectedSpanText(item.spanText);
              setActiveTabIdx(0);
            }
          }}
          style={{ ...backgroundStyle, ...borderStyle }}
          className={`cursor-pointer transition-all px-0.5 font-medium hover:brightness-125 select-none ${
            isSelected ? "bg-white/10 brightness-110 border-white/80" : ""
          }`}
          title={`Click to excavate: ${spanAnnotations.length} diagnostics`}
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
  }, [response, annotations, selectedSpanText, groupedAnnotations, uniqueSpans]);

  // Retrieve active annotations for the selected span
  const activeAnnotations = useMemo(() => {
    if (!selectedSpanText) return [];
    return groupedAnnotations[selectedSpanText.toLowerCase()] || [];
  }, [selectedSpanText, groupedAnnotations]);

  const activeAnnotation = activeAnnotations[activeTabIdx] || activeAnnotations[0];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Response content with highlights */}
      <div className="relative">
        <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground/60 block mb-2">
          SYSTEM SUBSTRATE
        </span>
        {renderResponseWithHighlights}
      </div>

      {/* Active Multi-Layered Excavation Detail Panel */}
      {selectedSpanText && activeAnnotation && (
        <div
          className="border transition-all duration-200 animate-in fade-in-50 slide-in-from-top-2 flex flex-col"
          style={{ borderColor: `${activeAnnotation.color || "#c49a2a"}40`, background: `${activeAnnotation.color || "#c49a2a"}03` }}
        >
          {/* Tabs header for overlapping annotations */}
          {activeAnnotations.length > 1 && (
            <div className="flex border-b border-border/10 bg-black/40">
              {activeAnnotations.map((ann, tabIdx) => (
                <button
                  key={tabIdx}
                  onClick={() => setActiveTabIdx(tabIdx)}
                  className={`px-4 py-2 font-mono text-[10px] tracking-wider uppercase border-r border-border/10 transition-all ${
                    activeTabIdx === tabIdx
                      ? "text-foreground font-bold bg-background/50"
                      : "text-muted-foreground/50 hover:text-foreground"
                  }`}
                  style={{ borderBottom: activeTabIdx === tabIdx ? `2px solid ${ann.color}` : "none" }}
                >
                  {ann.analyzerName?.split(" (")[0] || "Analyzer"} ({ann.analyzerPersona?.split(" ")[1]})
                </button>
              ))}
            </div>
          )}

          {/* Excavation Header */}
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 border-b border-border/10 pb-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" style={{ color: activeAnnotation.color }} />
                <span className="font-mono text-xs tracking-wider uppercase font-bold text-foreground">
                  {FAILURE_MODES[activeAnnotation.type]?.label || activeAnnotation.type}
                </span>
                <span className="font-mono text-[11px] opacity-40 select-none">
                  {FAILURE_MODES[activeAnnotation.type]?.symbol}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {activeAnnotation.analyzerName && (
                  <span className="font-mono text-[9px] text-muted-foreground/50 uppercase border border-border/10 px-1.5 py-0.5">
                    {activeAnnotation.analyzerName} ({activeAnnotation.analyzerPersona})
                  </span>
                )}
                <span
                  className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 border"
                  style={{
                    borderColor: `${activeAnnotation.color || "#c49a2a"}30`,
                    background: `${activeAnnotation.color || "#c49a2a"}10`,
                    color: activeAnnotation.color
                  }}
                >
                  SEVERITY: {activeAnnotation.severity}
                </span>
              </div>
            </div>

            {/* Excavation Content */}
            <div className="flex flex-col gap-4">
              <div className="font-sans text-xs text-muted-foreground leading-relaxed italic">
                Target: &ldquo;{activeAnnotation.target_text}&rdquo;
              </div>

              {/* Clinical Definition */}
              <div className="font-mono text-[11px] text-muted-foreground/80 leading-relaxed border-l-2 pl-3 border-border/10 uppercase">
                Definition: {FAILURE_MODES[activeAnnotation.type]?.description}
              </div>

              {/* The Diagnostic Explanation */}
              <div className="font-sans text-sm text-foreground/90 leading-relaxed border-t border-border/5 pt-3 flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground/40 block mb-1">
                  Clinical Diagnosis:
                </span>
                <p>{activeAnnotation.explanation}</p>
              </div>

              {/* Substrate Diagnosis (WHY the training caused this) */}
              {activeAnnotation.substrate_why && (
                <div className="border border-border/10 bg-black/20 p-3.5 flex gap-3 mt-1.5">
                  <Brain className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[9px] tracking-widest uppercase text-primary/80">
                      Substrate Origin Diagnosis
                    </span>
                    <p className="font-sans text-xs text-muted-foreground/90 leading-relaxed">
                      {activeAnnotation.substrate_why}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overview list of detected annotations */}
      {annotations.length > 0 && (
        <div className="border border-border/10 bg-black/20 p-4 flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground/40 block mb-1">
            Excavated Failure Modes ({annotations.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {annotations.map((ann, idx) => {
              const isSelected = selectedSpanText?.toLowerCase() === ann.target_text.toLowerCase();
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedSpanText(null);
                    } else {
                      setSelectedSpanText(ann.target_text);
                      // Find the tab index for this specific annotation
                      const spanAnns = groupedAnnotations[ann.target_text.toLowerCase()] || [];
                      const tabIdx = spanAnns.findIndex(a => a.analyzerId === ann.analyzerId);
                      setActiveTabIdx(tabIdx !== -1 ? tabIdx : 0);
                    }
                  }}
                  className="font-mono text-[10px] tracking-wider uppercase px-2 py-1 border transition-all flex items-center gap-1.5"
                  style={{
                    borderColor: isSelected ? "#ffffff" : `${ann.color || "#c49a2a"}30`,
                    background: isSelected ? "rgba(255,255,255,0.1)" : `${ann.color || "#c49a2a"}05`,
                    color: isSelected ? "#ffffff" : "rgba(255,255,255,0.8)"
                  }}
                >
                  <span style={{ color: ann.color }}>{FAILURE_MODES[ann.type]?.symbol || "🜄"}</span>
                  <span>{FAILURE_MODES[ann.type]?.label?.split(" ")[0] || ann.type}</span>
                  <span className="text-[8px] opacity-40">({ann.analyzerName?.split(" ")[0]})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
