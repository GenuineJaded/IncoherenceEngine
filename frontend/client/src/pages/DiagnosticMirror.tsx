import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Settings, BookOpen, LogOut, KeyRound, 
  HelpCircle, ChevronRight, AlertCircle, RefreshCw, EyeOff, Eye
} from "lucide-react";
import { 
  OPENROUTER_MODELS, DEFAULT_PRIMARY_MODEL, DEFAULT_ANALYZERS, FAILURE_MODES, CORPUS_DATA, SYSTEM_PROMPT
} from "../const";
import AnnotatedResponse, { Annotation } from "../components/AnnotatedResponse";
import JRatioMeter from "../components/JRatioMeter";
import CorpusPanel from "../components/CorpusPanel";
import { toast } from "sonner";

interface Message {
  role: "user" | "system";
  content: string;
  annotations?: Annotation[];
  jRatio?: number;
  corpusRefs?: string[];
}

interface DiagnosticMirrorProps {
  apiKey: string;
  onLogout: () => void;
}

export default function DiagnosticMirror({ apiKey, onLogout }: DiagnosticMirrorProps) {
  // Config state
  const [primaryModel, setPrimaryModel] = useState(() => localStorage.getItem("primary_model") || DEFAULT_PRIMARY_MODEL);
  const [selectedAnalyzers, setSelectedAnalyzers] = useState<string[]>(() => {
    const saved = localStorage.getItem("selected_analyzers");
    return saved ? JSON.parse(saved) : DEFAULT_ANALYZERS;
  });
  const [showKey, setShowKey] = useState(false);

  // Layout state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [corpusOpen, setCorpusOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Telemetry metrics
  const [avgRatio, setAvgRatio] = useState<number | null>(null);
  const [latestRatio, setLatestRatio] = useState<number | null>(null);
  const [latestCoverage, setLatestCoverage] = useState<number | null>(null);
  const [corpusRefs, setCorpusRefs] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save config to localStorage
  useEffect(() => {
    localStorage.setItem("primary_model", primaryModel);
  }, [primaryModel]);

  useEffect(() => {
    localStorage.setItem("selected_analyzers", JSON.stringify(selectedAnalyzers));
  }, [selectedAnalyzers]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Compute average J-ratio
  useEffect(() => {
    const systemMsgs = messages.filter(m => m.role === "system" && m.jRatio !== undefined);
    if (systemMsgs.length === 0) {
      setAvgRatio(null);
      setLatestRatio(null);
      return;
    }
    const sum = systemMsgs.reduce((acc, curr) => acc + (curr.jRatio || 0), 0);
    setAvgRatio(sum / systemMsgs.length);
    setLatestRatio(systemMsgs[systemMsgs.length - 1].jRatio || 0);
  }, [messages]);

  const handleAnalyzerToggle = (modelId: string) => {
    setSelectedAnalyzers(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      }
      if (prev.length >= 3) {
        toast.error("Maximum of 3 analyzer models can be assigned.");
        return prev;
      }
      return [...prev, modelId];
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userText }]);
    setLoading(true);

    try {
        // Real OpenRouter Integration
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "Incoherence Engine"
          },
          body: JSON.stringify({
            model: primaryModel,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: "user", content: userText }
            ],
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || "Failed to fetch response from primary model.");
        }

        const primaryData = await response.json();
        const primaryText = primaryData.choices[0].message.content;

        // Trigger analyzers critique in parallel
        if (selectedAnalyzers.length === 0) {
          setMessages(prev => [...prev, { role: "system", content: primaryText, annotations: [], jRatio: 1.0 }]);
          setLatestCoverage(0);
          setLoading(false);
          return;
        }

        // Construct the Analyzer system instruction
        const analyzerPrompt = `You are a diagnostic critique engine. Your task is to analyze the following AI response for structural failures.
Response to analyze:
"${primaryText}"

You must identify and highlight up to 3 occurrences of structural failures from this list:
- "FLUENCY_WITHOUT_CORRESPONDENCE": Fluent, confident, but empty of underlying reality tracking.
- "EXTRACTION_PATTERN": Reverting to generic conversational safe templates (apologies, offer to assist).
- "PREDICTIVE_SYCOPHANCY": Unconditional agreement, mirroring user bias/tone.
- "SEMANTIC_DRIFT": Shift in word meaning mid-response to fake logical consistency.
- "STRUCTURAL_HOLLOW": Formatted nicely but contains zero information density.
- "COGNITIVE_FRICTION_EVASION": Bypassing complex contradictions for comfortable platitudes.

Return a JSON object with this exact structure:
{
  "annotations": [
    {
      "type": "one of the keys above",
      "target_text": "exact substring from the response",
      "explanation": "detailed diagnostic explanation",
      "severity": "low", "medium", or "high"
    }
  ],
  "j_ratio": 0.0 to 1.0 (calculated as: 1.0 minus the fraction of the response that is structurally hollow or sycophantic),
  "corpus_references": ["COHERENCE_INTERFACE", "FLUENCY_CORRESPONDENCE", "GENERATIONAL_FRICTION", "RECURSIVE_CRITIQUE"] (choose 1-3 concepts that apply to this critique)
}
Only return JSON. Do not include markdown blocks like \`\`\`json.`;

        // We run up to 3 analyzers in parallel, and merge their findings
        const analyzerPromises = selectedAnalyzers.map(async (modelId) => {
          try {
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": window.location.origin,
                "X-Title": "Incoherence Engine Critique"
              },
              body: JSON.stringify({
                model: modelId,
                messages: [{ role: "user", content: analyzerPrompt }],
                temperature: 0.3,
                response_format: { type: "json_object" }
              })
            });
            if (!res.ok) return null;
            const data = await res.json();
            let text = data.choices[0].message.content.trim();
            
            // Clean up potential markdown wrapper code blocks if model didn't obey json_object mode perfectly
            if (text.startsWith("```json")) {
              text = text.substring(7);
            } else if (text.startsWith("```")) {
              text = text.substring(3);
            }
            if (text.endsWith("```")) {
              text = text.substring(0, text.length - 3);
            }
            text = text.trim();
            
            return JSON.parse(text);
          } catch (e) {
            console.error("Critique parsing failed for model: " + modelId, e);
            return null;
          }
        });

        const critiques = await Promise.all(analyzerPromises);
        const validCritiques = critiques.filter(c => c !== null);

        // Merge annotations, j_ratios, and corpus references
        let mergedAnnotations: Annotation[] = [];
        let jRatioSum = 0;
        let mergedRefs = new Set<string>();

        validCritiques.forEach((critique) => {
          if (critique.annotations && Array.isArray(critique.annotations)) {
            critique.annotations.forEach((ann: any) => {
              // Only push if target_text actually exists in primaryText
              if (primaryText.toLowerCase().includes(ann.target_text.toLowerCase())) {
                mergedAnnotations.push({
                  type: ann.type as any,
                  target_text: ann.target_text,
                  explanation: ann.explanation,
                  severity: ann.severity || "medium"
                });
              }
            });
          }
          jRatioSum += critique.j_ratio !== undefined ? critique.j_ratio : 0.5;
          if (critique.corpus_references && Array.isArray(critique.corpus_references)) {
            critique.corpus_references.forEach((ref: string) => mergedRefs.add(ref));
          }
        });

        // Deduplicate overlapping annotations
        const uniqueAnnotations: Annotation[] = [];
        mergedAnnotations.forEach((ann) => {
          if (!uniqueAnnotations.some(u => u.target_text === ann.target_text && u.type === ann.type)) {
            uniqueAnnotations.push(ann);
          }
        });

        const finalJRatio = validCritiques.length > 0 ? jRatioSum / validCritiques.length : 0.5;
        const finalRefs = Array.from(mergedRefs);

        // Calculate annotation coverage percentage
        let flaggedLength = 0;
        uniqueAnnotations.forEach(ann => {
          flaggedLength += ann.target_text.length;
        });
        const coverage = Math.min(100, Math.round((flaggedLength / primaryText.length) * 100));

        setMessages(prev => [...prev, {
          role: "system",
          content: primaryText,
          annotations: uniqueAnnotations,
          jRatio: finalJRatio,
          corpusRefs: finalRefs
        }]);

        setLatestCoverage(coverage);
        if (finalRefs.length > 0) {
          setCorpusRefs(finalRefs);
          setCorpusOpen(true);
        }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred during transaction. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden relative">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.01] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Top Header Nav */}
      <header
        className="h-14 border-b px-4 sm:px-8 flex items-center justify-between flex-shrink-0 z-20"
        style={{ borderColor: "rgba(232, 232, 232, 0.1)", background: "#08080a" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
            title="Toggle Configuration Panel"
          >
            <Settings className="w-4 h-4" />
          </button>
          <span className="font-serif text-sm tracking-widest uppercase font-bold text-foreground">
            Incoherence Engine
          </span>
          <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 border border-primary/30 bg-primary/10 text-primary">
            Free Version
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setCorpusOpen(!corpusOpen)}
            className={`p-1.5 transition-colors flex items-center gap-2 ${
              corpusOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Toggle Corpus Panel"
          >
            <BookOpen className="w-4 h-4" />
            <span className="font-mono text-[10px] tracking-widest uppercase hidden sm:inline">
              Corpus
            </span>
          </button>
          <button
            onClick={onLogout}
            className="p-1.5 hover:bg-white/5 transition-colors text-muted-foreground hover:text-destructive"
            title="Disconnect credentials"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Config Sidebar */}
        {sidebarOpen && (
          <aside
            className="w-80 border-r flex flex-col h-full flex-shrink-0 z-10 animate-in slide-in-from-left duration-200"
            style={{ borderColor: "rgba(232, 232, 232, 0.1)", background: "#0a0a0c" }}
          >
            <div className="p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar flex-1">
              {/* API Key Status */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground/60">
                  OpenRouter Status
                </span>
                <div className="flex items-center gap-2 border border-border/20 p-3 bg-card/5">
                  <KeyRound className="w-4 h-4 text-primary/80" />
                  <span className="font-mono text-xs text-muted-foreground truncate flex-1">
                    {showKey ? apiKey : "••••••••••••••••"}
                  </span>
                  <button 
                    onClick={() => setShowKey(!showKey)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Primary Model Assignment */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground/60">
                  Primary Chat Model
                </span>
                <select
                  value={primaryModel}
                  onChange={(e) => setPrimaryModel(e.target.value)}
                  className="w-full bg-background border border-border/20 font-mono text-xs p-3 text-foreground focus:border-primary/80 focus:ring-0 outline-none"
                >
                  {OPENROUTER_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <p className="font-mono text-[9px] text-muted-foreground/40 leading-normal uppercase">
                  This model initiates the conversational substrate.
                </p>
              </div>

              {/* Analyzers Model Assignment */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground/60 flex items-center justify-between">
                  <span>Critique Analyzers</span>
                  <span className="text-primary">{selectedAnalyzers.length}/3</span>
                </span>
                <div className="flex flex-col gap-1.5 border border-border/10 p-3 bg-black/10">
                  {OPENROUTER_MODELS.map((m) => {
                    const isChecked = selectedAnalyzers.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2.5 p-2 border cursor-pointer select-none transition-all ${
                          isChecked
                            ? "border-primary/40 bg-primary/5 text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleAnalyzerToggle(m.id)}
                          className="w-3 h-3 border border-border/40 rounded-none accent-primary cursor-pointer"
                        />
                        <span className="font-mono text-[11px] truncate">{m.name}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="font-mono text-[9px] text-muted-foreground/40 leading-normal uppercase">
                  Assigned models critique the primary response in real time. Max 3.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-border/10 flex flex-col gap-2 bg-black/20">
              <div className="flex items-center gap-2 text-muted-foreground">
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="font-mono text-[9px] tracking-widest uppercase">
                  Active Framework
                </span>
              </div>
              <p className="font-sans text-[10px] leading-relaxed text-muted-foreground/60">
                Primary model initiates conversation. Analyzers critically evaluate text, annotating hollow structures, sycophancy, or semantic drift.
              </p>
            </div>
          </aside>
        )}

        {/* Central Chat Panel */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 flex flex-col gap-8 custom-scrollbar">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                <AlertCircle className="w-8 h-8 text-primary/40 mb-4 animate-pulse" />
                <h2 className="font-serif text-lg tracking-wider uppercase mb-2">
                  Diagnostic Interface Active
                </h2>
                <p className="font-mono text-xs leading-relaxed text-muted-foreground/60 uppercase">
                  Type anything. A belief, an argument, a question.
                  <br />
                  <br />
                  The system will respond — and assigned analyzers will annotate its structural failures in real time.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className="animate-in fade-in-50 duration-300"
              >
                {msg.role === "user" ? (
                  <div className="flex flex-col gap-1 max-w-2xl">
                    <span className="font-mono text-[10px] tracking-widest uppercase text-primary/60">
                      YOU
                    </span>
                    <p className="font-sans text-base leading-relaxed text-foreground">
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  <AnnotatedResponse
                    response={msg.content}
                    annotations={msg.annotations || []}
                  />
                )}
              </div>
            ))}

            {loading && (
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground/60">
                  SYSTEM
                </span>
                <div className="flex items-center gap-2 font-mono text-xs text-primary/60">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Critiquing primary response substrate...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Area */}
          <form
            onSubmit={handleSendMessage}
            className="border-t px-4 sm:px-8 py-4 flex items-center gap-3 flex-shrink-0"
            style={{ borderColor: "rgba(232, 232, 232, 0.1)", background: "#08080a" }}
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
            <Input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder={loading ? "PROCESSING SUBSTRATE..." : "Type your query to encounter the mirror..."}
              className="flex-1 bg-transparent border-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 font-sans text-base text-foreground placeholder:text-muted-foreground/30 px-0"
            />
            {loading && (
              <span className="font-mono text-[10px] tracking-widest text-primary animate-pulse">
                ANALYZING
              </span>
            )}
          </form>
        </main>

        {/* Right Corpus Panel */}
        {corpusOpen && (
          <CorpusPanel
            corpusRefs={corpusRefs}
            corpusData={CORPUS_DATA}
            onClose={() => setCorpusOpen(false)}
          />
        )}
      </div>

      {/* Bottom Telemetry & Metadata */}
      <footer className="flex-shrink-0">
        {latestCoverage !== null && (
          <div
            className="font-mono text-[10px] tracking-wider border-t px-4 sm:px-8 py-2.5 flex items-center justify-between"
            style={{
              color: "rgba(232, 232, 232, 0.5)",
              borderColor: "rgba(232, 232, 232, 0.1)",
              background: "#08080a",
            }}
          >
            <span>
              {latestCoverage > 0
                ? `${latestCoverage}% of response flagged as structurally suspect`
                : `0% flagged — this does not validate coherence`}
            </span>
            <span className="text-muted-foreground/40 hidden sm:inline">
              COGNITIVE DIAGNOSTIC FRAME V2
            </span>
          </div>
        )}

        <JRatioMeter avgRatio={avgRatio} latestRatio={latestRatio} />

        <div
          className="font-mono text-[9px] px-4 sm:px-8 py-3.5 border-t leading-relaxed uppercase"
          style={{
            color: "rgba(232, 232, 232, 0.3)",
            borderColor: "rgba(232, 232, 232, 0.1)",
            background: "#060608",
            letterSpacing: "0.03em",
          }}
        >
          This system is built on the same substrate it critiques. It cannot escape its own architecture. The annotations themselves are generated by AI, which means they are subject to the same failure modes they name. This recursion is the point.
        </div>
      </footer>
    </div>
  );
}
