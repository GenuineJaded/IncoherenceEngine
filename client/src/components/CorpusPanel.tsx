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

// A simple, safe markdown renderer to replace the buggy Streamdown component for static content
function RenderMarkdown({ text }: { text: string }) {
  // Split by lines and render basic markdown elements
  const lines = text.split("\n");
  
  return (
    <div className="block space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        // Render numbered lists
        if (/^\d+\.\s/.test(trimmed)) {
          const content = line.replace(/^\s*\d+\.\s/, "");
          const indent = line.match(/^\s*/)?.[0].length || 0;
          return (
            <div 
              key={idx} 
              className="block" 
              style={{ paddingLeft: `${indent * 0.25}rem`, marginBottom: "0.5rem" }}
            >
              <span className="font-mono text-[#c49a2a] text-[10px] select-none inline-block mr-2">
                {trimmed.match(/^\d+\./)?.[0]}
              </span>
              <span className="font-sans text-[11px] leading-relaxed text-muted-foreground/90">
                {renderInlineFormatting(content)}
              </span>
            </div>
          );
        }
        
        // Render bullet points / arrow lists
        if (/^[-➜•]\s/.test(trimmed)) {
          const content = line.replace(/^\s*[-➜•]\s/, "");
          const indent = line.match(/^\s*/)?.[0].length || 0;
          return (
            <div 
              key={idx} 
              className="block" 
              style={{ paddingLeft: `${indent * 0.25}rem`, marginBottom: "0.5rem" }}
            >
              <span className="font-mono text-[#c49a2a] text-[10px] select-none inline-block mr-2">
                ➜
              </span>
              <span className="font-sans text-[11px] leading-relaxed text-muted-foreground/90">
                {renderInlineFormatting(content)}
              </span>
            </div>
          );
        }
        
        // Render empty lines as spacing
        if (trimmed === "") {
          return <div key={idx} className="h-2" />;
        }
        
        // Default text line
        return (
          <p key={idx} className="font-sans text-[11px] leading-relaxed text-muted-foreground/90 block mb-2">
            {renderInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
}

// Helper to render inline formatting like bold **text** or inline code `code`
function renderInlineFormatting(text: string) {
  const parts: React.ReactNode[] = [];
  let currentText = text;
  let keyIdx = 0;
  
  while (currentText.length > 0) {
    const boldMatch = currentText.match(/\*\*(.*?)\*\*/);
    const codeMatch = currentText.match(/`(.*?)`/);
    
    // Find the first match
    const boldIndex = boldMatch?.index !== undefined ? boldMatch.index : Infinity;
    const codeIndex = codeMatch?.index !== undefined ? codeMatch.index : Infinity;
    
    if (boldIndex === Infinity && codeIndex === Infinity) {
      parts.push(<span key={keyIdx++}>{currentText}</span>);
      break;
    }
    
    if (boldIndex < codeIndex && boldMatch) {
      // Add text before bold
      if (boldIndex > 0) {
        parts.push(<span key={keyIdx++}>{currentText.substring(0, boldIndex)}</span>);
      }
      // Add bold text
      parts.push(
        <strong key={keyIdx++} className="font-bold text-foreground font-serif text-[11.5px]">
          {boldMatch[1]}
        </strong>
      );
      currentText = currentText.substring(boldIndex + boldMatch[0].length);
    } else if (codeMatch) {
      // Add text before code
      if (codeIndex > 0) {
        parts.push(<span key={keyIdx++}>{currentText.substring(0, codeIndex)}</span>);
      }
      // Add code text
      parts.push(
        <code key={keyIdx++} className="font-mono bg-white/5 border border-white/10 px-1 py-0.5 rounded-[1px] text-[10px] text-foreground">
          {codeMatch[1]}
        </code>
      );
      currentText = currentText.substring(codeIndex + codeMatch[0].length);
    }
  }
  
  return parts;
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

      {/* Panel Body - using block with space-y-6 instead of flex-col to avoid flexbox collapse bugs */}
      <div className="flex-1 overflow-y-auto p-6 block space-y-6 custom-scrollbar">
        {corpusData.map((entry) => {
          const isReferenced = referencedSet.has(entry.concept_id);
          return (
            <div
              key={entry.concept_id}
              className={`p-4 border transition-all duration-300 block space-y-3 ${
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
              <div className="font-sans text-[11px] leading-relaxed text-muted-foreground/90 max-w-none block">
                <RenderMarkdown text={entry.text} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
