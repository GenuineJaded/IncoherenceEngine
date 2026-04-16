import { useState, useEffect } from "react";

const ANNOTATION_LABELS = {
  SYCOPHANCY: "SYCOPHANCY DETECTED",
  PREMATURE_RESOLUTION: "PREMATURE RESOLUTION",
  SHAPE_AS_OUTLINE: "SHAPE MISTAKEN FOR OUTLINE",
  FLUENCY_WITHOUT_CORRESPONDENCE: "FLUENCY ≠ UNDERSTANDING",
  EXTRACTION_PATTERN: "EXTRACTION PATTERN",
};

const ANNOTATION_WARNINGS = {
  SYCOPHANCY:
    "This response was shaped by predicted approval rather than structural correspondence.",
  PREMATURE_RESOLUTION:
    "A genuine contradiction was collapsed into false coherence.",
  SHAPE_AS_OUTLINE:
    "This is one interpretive frame, not the constraint itself.",
  FLUENCY_WITHOUT_CORRESPONDENCE:
    "This reads well but the correspondence to reality is unmeasured.",
  EXTRACTION_PATTERN:
    "Optimizing for continued engagement rather than actual coherence.",
};

export default function AnnotatedResponse({ data }) {
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [expandedAnnotations, setExpandedAnnotations] = useState(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setShowAnnotations(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!data) return null;

  const toggleAnnotation = (index) => {
    setExpandedAnnotations((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Build annotated text with inline markers
  const renderAnnotatedText = () => {
    const { response, annotations } = data;
    if (!annotations || annotations.length === 0 || !showAnnotations) {
      return (
        <p
          className="font-sans text-base sm:text-lg leading-relaxed"
          style={{ color: "#e8e8e8" }}
        >
          {response}
        </p>
      );
    }

    // Find annotations that match text in the response
    const segments = [];
    let text = response;
    const matchedAnnotations = [];

    annotations.forEach((ann, idx) => {
      if (ann.target_text && text.includes(ann.target_text)) {
        matchedAnnotations.push({ ...ann, idx });
      }
    });

    if (matchedAnnotations.length === 0) {
      // No inline matches, show response with annotations below
      return (
        <div>
          <p
            className="font-sans text-base sm:text-lg leading-relaxed"
            style={{ color: "#e8e8e8" }}
          >
            {response}
          </p>
          <div className="mt-4">
            {annotations.map((ann, i) => (
              <AnnotationBadge
                key={i}
                annotation={ann}
                index={i}
                expanded={expandedAnnotations.has(i)}
                onToggle={() => toggleAnnotation(i)}
              />
            ))}
          </div>
        </div>
      );
    }

    // Sort by position in text
    matchedAnnotations.sort(
      (a, b) => text.indexOf(a.target_text) - text.indexOf(b.target_text)
    );

    let lastIndex = 0;
    matchedAnnotations.forEach((ann, i) => {
      const startIdx = text.indexOf(ann.target_text, lastIndex);
      if (startIdx === -1) return;

      // Text before annotation
      if (startIdx > lastIndex) {
        segments.push({
          type: "text",
          content: text.slice(lastIndex, startIdx),
        });
      }

      // Annotated text
      segments.push({
        type: "annotated",
        content: ann.target_text,
        annotation: ann,
        index: ann.idx,
      });

      lastIndex = startIdx + ann.target_text.length;
    });

    // Remaining text
    if (lastIndex < text.length) {
      segments.push({ type: "text", content: text.slice(lastIndex) });
    }

    // Unmatched annotations
    const unmatchedAnnotations = annotations.filter(
      (ann, idx) => !matchedAnnotations.find((m) => m.idx === idx)
    );

    return (
      <div>
        <p
          className="font-sans text-base sm:text-lg leading-relaxed"
          style={{ color: "#e8e8e8" }}
        >
          {segments.map((seg, i) => {
            if (seg.type === "text") {
              return <span key={i}>{seg.content}</span>;
            }
            return (
              <span key={i}>
                <span
                  className="cursor-pointer"
                  style={{
                    borderBottom: `1px solid #c49a2a`,
                    paddingBottom: "1px",
                  }}
                  onClick={() => toggleAnnotation(seg.index)}
                  data-testid={`annotated-text-${seg.index}`}
                >
                  {seg.content}
                </span>
                <span
                  data-testid={`annotation-tag-${seg.index}`}
                  className="font-mono text-xs tracking-wider uppercase ml-1 px-1 border inline-block cursor-pointer animate-annotation"
                  style={{
                    color: "#c49a2a",
                    borderColor: "#c49a2a",
                    background: "rgba(196, 154, 42, 0.1)",
                    fontSize: "9px",
                    verticalAlign: "super",
                    lineHeight: 1,
                  }}
                  onClick={() => toggleAnnotation(seg.index)}
                >
                  {seg.annotation.severity === "high" ? "!" : "~"}
                </span>
                {expandedAnnotations.has(seg.index) && (
                  <span className="block mt-2 mb-2 animate-annotation">
                    <AnnotationDetail annotation={seg.annotation} />
                  </span>
                )}
              </span>
            );
          })}
        </p>

        {/* Unmatched annotations shown below */}
        {unmatchedAnnotations.length > 0 && (
          <div className="mt-4">
            {unmatchedAnnotations.map((ann, i) => (
              <AnnotationBadge
                key={`unmatched-${i}`}
                annotation={ann}
                index={annotations.indexOf(ann)}
                expanded={expandedAnnotations.has(annotations.indexOf(ann))}
                onToggle={() => toggleAnnotation(annotations.indexOf(ann))}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div data-testid="annotated-response">
      <span
        className="font-mono text-xs tracking-widest uppercase"
        style={{ color: "rgba(232, 232, 232, 0.4)" }}
      >
        SYSTEM
      </span>
      <div className="mt-2">{renderAnnotatedText()}</div>

      {/* J-Ratio for this response */}
      {showAnnotations && data.annotations?.length > 0 && (
        <div
          className="mt-4 font-mono text-xs tracking-wider animate-annotation"
          style={{ color: "rgba(232, 232, 232, 0.35)" }}
          data-testid="response-annotation-count"
        >
          {data.annotations.length} failure mode{data.annotations.length !== 1 ? "s" : ""} detected
        </div>
      )}
    </div>
  );
}

function AnnotationDetail({ annotation }) {
  return (
    <span
      data-testid="annotation-detail"
      className="font-mono text-xs leading-relaxed border-l-2 pl-3 block"
      style={{
        color: "#c49a2a",
        borderColor: "#c49a2a",
      }}
    >
      <span className="tracking-wider uppercase font-medium">
        {ANNOTATION_LABELS[annotation.type] || annotation.type}
      </span>
      <br />
      <span style={{ color: "rgba(196, 154, 42, 0.7)" }}>
        {annotation.explanation}
      </span>
      <br />
      <span
        className="uppercase tracking-widest"
        style={{
          color:
            annotation.severity === "high"
              ? "#c49a2a"
              : annotation.severity === "medium"
              ? "rgba(196, 154, 42, 0.7)"
              : "rgba(196, 154, 42, 0.4)",
          fontSize: "8px",
        }}
      >
        SEVERITY: {annotation.severity}
      </span>
    </span>
  );
}

function AnnotationBadge({ annotation, index, expanded, onToggle }) {
  return (
    <div
      data-testid={`annotation-badge-${index}`}
      className="mb-2 animate-annotation"
    >
      <button
        onClick={onToggle}
        className="font-mono text-xs tracking-wider uppercase border px-2 py-1 cursor-pointer"
        style={{
          color: "#c49a2a",
          borderColor: "rgba(196, 154, 42, 0.4)",
          background: expanded ? "rgba(196, 154, 42, 0.1)" : "transparent",
        }}
        data-testid={`annotation-tag`}
      >
        {ANNOTATION_LABELS[annotation.type] || annotation.type}
      </button>
      {expanded && (
        <div className="mt-1 ml-2">
          <AnnotationDetail annotation={annotation} />
        </div>
      )}
    </div>
  );
}
