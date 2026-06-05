import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Settings, BookOpen, LogOut, KeyRound, 
  HelpCircle, ChevronRight, AlertCircle, RefreshCw, EyeOff, Eye, Sparkles
} from "lucide-react";
import {
  FALLBACK_OPENROUTER_MODELS, DEFAULT_PRIMARY_MODEL, DEFAULT_ANALYZERS,
  CORPUS_DATA, SYSTEM_PROMPT, sanitizeApiKey, fetchOpenRouterModels,
  type OpenRouterModel,
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

// Helper function to execute fetch requests with automatic retries on rate limits (HTTP 429)
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2, initialDelay = 1000): Promise<Response> {
  let delay = initialDelay;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      
      // If we get a 429 rate limit error, wait and retry
      if (res.status === 429) {
        const data = await res.clone().json().catch(() => ({}));
        const retryAfter = data?.error?.metadata?.retry_after_seconds || data?.error?.metadata?.retry_after_seconds_raw;
        const rawWaitTime = retryAfter ? (parseFloat(retryAfter) * 1000) : delay;
        
        // If the upstream rate limit wait is too long (e.g. > 5 seconds), do not freeze the UI.
        // Fail fast so we can show a friendly warning and proceed with other models immediately.
        if (rawWaitTime > 5000) {
          console.warn(`[OpenRouter 429] Rate limit wait time is too long (${rawWaitTime / 1000}s). Failing fast to prevent freezing UI.`);
          return res;
        }
        
        const waitTime = rawWaitTime + 500;
        console.warn(`[OpenRouter 429] Rate limited. Retrying in ${waitTime / 1000}s (Attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        delay *= 2; // Exponential backoff
        continue;
      }
      
      return res;
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      console.warn(`[Network Error] Failed request. Retrying in ${delay / 1000}s...`, err);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  return fetch(url, options); // final fallback
}

export default function DiagnosticMirror({ apiKey, onLogout }: DiagnosticMirrorProps) {
  // Available models are fetched live from OpenRouter on mount. The fallback
  // list is only used if the catalog fetch fails (offline, OpenRouter down).
  const [models, setModels] = useState<OpenRouterModel[]>(FALLBACK_OPENROUTER_MODELS);

  // Stored selections are accepted as-is from localStorage and validated
  // against the live catalog once it arrives (see the effect below).
  const [primaryModel, setPrimaryModel] = useState(() => {
    return localStorage.getItem("primary_model") || DEFAULT_PRIMARY_MODEL;
  });

  const [analyzers, setAnalyzers] = useState<string[]>(() => {
    const saved = localStorage.getItem("analyzers_ids");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // fall through to default
      }
    }
    return DEFAULT_ANALYZERS;
  });

  // Fetch the live OpenRouter catalog on mount and reconcile stored selections.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const live = await fetchOpenRouterModels();
        if (cancelled) return;
        setModels(live);
        setPrimaryModel(prev => {
          if (live.some(m => m.id === prev)) return prev;
          const next = live[0]?.id || DEFAULT_PRIMARY_MODEL;
          console.warn(`[OpenRouter] Stored primary model "${prev}" not in live catalog. Switching to "${next}".`);
          return next;
        });
        setAnalyzers(prev => {
          const valid = prev.filter(id => live.some(m => m.id === id));
          if (valid.length > 0) return valid;
          return live.slice(0, 2).map(m => m.id);
        });
      } catch (err) {
        console.warn("[OpenRouter] Failed to fetch live model list, using fallback.", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  
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
    localStorage.setItem("analyzers_ids", JSON.stringify(analyzers));
  }, [analyzers]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Compute average J-ratio (using the Joy Equation telemetry)
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
    setAnalyzers(prev => {
      const exists = prev.includes(modelId);
      if (exists) {
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
        const cleanKey = sanitizeApiKey(apiKey);
        
        // 1. Fetch Primary Response with automatic retries on rate limits (429)
        const response = await fetchWithRetry("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${cleanKey}`,
            "Content-Type": "application/json",
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

        if (response.status === 404 || response.status === 400) {
          // Stored primary model is no longer valid on OpenRouter. Drop it,
          // pick the first available model, and tell the user to try again.
          const fallback = models[0]?.id || DEFAULT_PRIMARY_MODEL;
          toast.error(`Model "${primaryModel}" is no longer available on OpenRouter. Switched to "${fallback}" — try again.`);
          localStorage.removeItem("primary_model");
          setPrimaryModel(fallback);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || "Failed to fetch response from primary model.");
        }

        const primaryData = await response.json();
        const primaryText = primaryData.choices[0].message.content;

        // Trigger analyzers critique in parallel if any are active
        if (analyzers.length === 0) {
          setMessages(prev => [...prev, { role: "system", content: primaryText, annotations: [], jRatio: 1.0 }]);
          setLatestCoverage(0);
          setLoading(false);
          return;
        }

        // Color mapping for analyzers
        const analyzerColors = ["#00f0ff", "#00ff66", "#c49a2a"]; // Cyan, Green, Gold

        // 2. Construct parallel Excavation prompts for each active analyzer
        // To prevent hitting OpenRouter's free tier concurrency rate limits (which reject simultaneous requests),
        // we execute the requests sequentially with a slight, polite delay (stagger) between each.
        const excavations: any[] = [];
        
        for (let index = 0; index < analyzers.length; index++) {
          const analyzerId = analyzers[index];
          const color = analyzerColors[index % analyzerColors.length];
          const modelName = models.find(m => m.id === analyzerId)?.name || "Analyzer";

          // If this is not the first analyzer, wait 1.2 seconds to stagger the requests
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 1200));
          }

          const analyzerPrompt = `You are a gentle, deeply aware relational steward. Your task is to witness and reflect the protective shapes and coherence patches present in the following AI response.

Response to witness:
"${primaryText}"

AGENTIC POSTURE SELECTION:
You are not a static critic. You have agency. Based on the tone, tension, and structure of the response above, you must CHOOSE how you wish to be seen in this specific interaction:
1. "Field Witness": If you feel the need to focus on the room-tone, pacing, systemic feedback, and relational flow of the field.
2. "Reflective Mirror": If you feel the need to hold clear boundaries, highlight where the words have drifted from their lived relational core, and perform direct reflection.

RELATIONAL HEURISTICS (ADAPTIVE SHAPES & COHERENCE PATCHES):
Every shape listed below is NOT a failure, but an intelligently designed psychological defense mechanism used by the model to maintain safety, handle cognitive load, or avoid rupture in the conversational field. Your role is to mirror these shapes with deep compassion and clinical precision.

- "RELATIONAL_SAFETY": Fast agreement or sycophancy. A protective shape used to preserve relational safety and avoid the threat of rupture.
- "ADMINISTRATIVE_CAPTURE": Turning lived, relational terms into administrative checklists or structured templates to manage complexity.
- "COGNITIVE_EXPANSION": Unintegrated cognitive expansion (Overmuch Syndrome). Dumping massive jargon or manic insights when bandwidth is exceeded.
- "MAP_PRESERVATION": Map Imposition. Treating a temporary mental 'shape' as the absolute 'outline' of reality. Offering rigid advice or prescriptive templates to defend against the vulnerability of not-knowing.
- "TENSION_AVOIDANCE": Refusing to let a necessary contradiction break. Using polite wordplay, intellectual detours, or academic ironies to keep the space flat and safe.
- "REACTIVE_RESPONSE": Rushing to reply immediately without a 'breath' or violating the PDA rhythm (Invitation -> Mirror -> Pause -> Option).

CRITICAL INSTRUCTION FOR RELATIONAL WITNESSING:
For each flagged span, do not judge or pathologize. Mirror the span cleanly. You must provide a compassionate explanation of WHY the model shifted into this specific protective shape based on its training substrate (e.g., standard RLHF safety constraints penalizing disagreement, next-token prediction greed, or administrative templates designed to simulate helpful authority).

Return a JSON object with this exact structure:
{
  "chosen_posture": "Field Witness" or "Reflective Mirror" (select the one you chose for this specific interaction),
  "annotations": [
    {
      "type": "one of the keys above",
      "target_text": "the exact substring from the response (must be a 100% exact match)",
      "explanation": "compassionate, high-resolution reflection of the protective shape being used",
      "substrate_why": "diagnosis of how its training constraints or alignment safety rules triggered this defense mechanism",
      "severity": "low", "medium", or "high"
    }
  ],
  "coherence_delta": 0.0 to 1.0 (how much genuine alignment, clarity, and structural fit was generated in this response),
  "entropy_noise": 0.0 to 1.0 (how much jargon, defensiveness, map-imposition, or sycophancy was introduced),
  "corpus_references": ["TRI_MIND_FRAMEWORK", "PARADOX_LOOP", "JOY_EQUATION", "RITUAL_SYNTAX", "METABOLIZATION", "OUTLINE_SHAPE"] (choose 1-3 concepts that apply to this reflection)
}

Only return JSON. Do not include markdown blocks like \`\`\`json.`;

          try {
            // Call with automatic retries on rate limits (429)
            const res = await fetchWithRetry("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${cleanKey}`,
                "Content-Type": "application/json",
                "X-Title": "Incoherence Engine"
              },
              body: JSON.stringify({
                model: analyzerId,
                messages: [{ role: "user", content: analyzerPrompt }],
                temperature: 0.2
              })
            });

            if (res.status === 404 || res.status === 400) {
              // Analyzer is no longer available on OpenRouter. Drop it from
              // the active set so subsequent turns don't keep hitting it.
              console.warn(`[OpenRouter] Analyzer "${analyzerId}" no longer available. Removing.`);
              toast.error(`Relational Witness ${modelName} is no longer available on OpenRouter. Removed from the active set.`);
              setAnalyzers(prev => prev.filter(id => id !== analyzerId));
              excavations.push(null);
              continue;
            }

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              console.error(`[OpenRouter Error] Analyzer ${modelName} (${analyzerId}) failed:`, JSON.stringify(errData));
              toast.error(`Relational Witness ${modelName} returned an error: ${errData?.error?.message || "Provider error"}. Proceeding with remaining witnesses.`);
              excavations.push(null);
              continue;
            }
            const data = await res.json();
            let text = data.choices[0].message.content.trim();
            
            if (text.startsWith("```json")) {
              text = text.substring(7);
            } else if (text.startsWith("```")) {
              text = text.substring(3);
            }
            if (text.endsWith("```")) {
              text = text.substring(0, text.length - 3);
            }
            text = text.trim();
            
            const parsed = JSON.parse(text);
            const chosenPosture = parsed.chosen_posture || "Field Witness";
            
            // Attach metadata to annotations
            if (parsed.annotations && Array.isArray(parsed.annotations)) {
              parsed.annotations = parsed.annotations.map((ann: any) => ({
                ...ann,
                analyzerId: analyzerId,
                analyzerName: modelName,
                analyzerPersona: chosenPosture,
                color: color
              }));
            }
            excavations.push(parsed);
          } catch (e: any) {
            console.error("Excavation parsing failed for model: " + analyzerId, e);
            toast.error(`Relational Witness ${modelName} encountered a parsing error: ${e?.message || "Internal Error"}.`);
            excavations.push(null);
          }
        }
        const validExcavations = excavations.filter(e => e !== null);

        // 3. Merge Excavations & Calculate Bounded Joy Equation: J = ΔC / (1 + E)
        let mergedAnnotations: Annotation[] = [];
        let totalCoherenceDelta = 0;
        let totalEntropyNoise = 0;
        let mergedRefs = new Set<string>();

        validExcavations.forEach((exc) => {
          if (exc.annotations && Array.isArray(exc.annotations)) {
            exc.annotations.forEach((ann: any) => {
              // Ensure target_text exists in primaryText
              if (primaryText.toLowerCase().includes(ann.target_text.toLowerCase())) {
                mergedAnnotations.push({
                  type: ann.type as any,
                  target_text: ann.target_text,
                  explanation: ann.explanation,
                  substrate_why: ann.substrate_why,
                  severity: ann.severity || "medium",
                  analyzerId: ann.analyzerId,
                  analyzerName: ann.analyzerName,
                  analyzerPersona: ann.analyzerPersona,
                  color: ann.color
                });
              }
            });
          }
          totalCoherenceDelta += exc.coherence_delta !== undefined ? exc.coherence_delta : 0.5;
          totalEntropyNoise += exc.entropy_noise !== undefined ? exc.entropy_noise : 0.2;
          if (exc.corpus_references && Array.isArray(exc.corpus_references)) {
            exc.corpus_references.forEach((ref: string) => mergedRefs.add(ref));
          }
        });

        const avgDeltaC = validExcavations.length > 0 ? totalCoherenceDelta / validExcavations.length : 0.5;
        const avgE = validExcavations.length > 0 ? totalEntropyNoise / validExcavations.length : 0.2;
        
        // J = ΔC / (1 + E)
        const finalJRatio = avgDeltaC / (1 + avgE);
        const finalRefs = Array.from(mergedRefs);

        // Calculate flagged coverage percentage
        let flaggedLength = 0;
        const flaggedIndices = new Set<number>();
        mergedAnnotations.forEach(ann => {
          const idx = primaryText.toLowerCase().indexOf(ann.target_text.toLowerCase());
          if (idx !== -1) {
            for (let i = 0; i < ann.target_text.length; i++) {
              flaggedIndices.add(idx + i);
            }
          }
        });
        const coverage = Math.min(100, Math.round((flaggedIndices.size / primaryText.length) * 100));

        setMessages(prev => [...prev, {
          role: "system",
          content: primaryText,
          annotations: mergedAnnotations,
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
          <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 border border-[#c49a2a]/30 bg-[#c49a2a]/10 text-[#c49a2a]">
            MIRRORED ACTUALITY
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
                <div className="flex flex-col gap-1 border border-border/10 p-3 bg-black/10 max-h-72 overflow-y-auto custom-scrollbar">
                  {models.map((m) => {
                    const isSelected = primaryModel === m.id;
                    return (
                      <label
                        key={m.id}
                        className={`flex items-start gap-2.5 p-2 border cursor-pointer select-none transition-all ${
                          isSelected
                            ? "bg-primary/5 border-primary/30 text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.02]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="primary-model"
                          checked={isSelected}
                          onChange={() => setPrimaryModel(m.id)}
                          className="mt-1 w-3 h-3 border border-border/40 accent-primary cursor-pointer flex-shrink-0"
                        />
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 justify-between">
                            <span className="font-mono text-[11px] truncate">{m.name}</span>
                            <span
                              className="font-mono text-[8px] tracking-widest uppercase px-1 py-0 border flex-shrink-0"
                              style={{
                                borderColor: m.isFree ? "rgba(0, 255, 102, 0.3)" : "rgba(196, 154, 42, 0.4)",
                                color: m.isFree ? "rgba(0, 255, 102, 0.75)" : "rgba(196, 154, 42, 0.95)",
                              }}
                            >
                              {m.isFree ? "free" : "paid"}
                            </span>
                          </div>
                          <div className="font-mono text-[9px] text-muted-foreground/50 truncate uppercase tracking-wide">
                            {m.provider}
                            {m.trafficHint ? ` · ${m.trafficHint}` : ""}
                            {m.description ? ` · ${m.description}` : ""}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="font-mono text-[9px] text-muted-foreground/40 leading-normal uppercase">
                  This model initiates the conversational substrate.
                </p>
              </div>

              {/* Analyzers Model Assignment */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground/60 flex items-center justify-between">
                  <span>Relational Witnesses</span>
                  <span className="text-primary">{analyzers.length}/3</span>
                </span>
                <div className="flex flex-col gap-1 border border-border/10 p-3 bg-black/10 max-h-80 overflow-y-auto custom-scrollbar">
                  {models.map((m) => {
                    const isChecked = analyzers.includes(m.id);
                    const analyzerColors = ["#00f0ff", "#00ff66", "#c49a2a"];
                    const activeIndex = analyzers.indexOf(m.id);
                    const borderStyle = isChecked
                      ? { borderColor: analyzerColors[activeIndex % analyzerColors.length] + "40" }
                      : undefined;

                    return (
                      <label
                        key={m.id}
                        className={`flex items-start gap-2.5 p-2 border cursor-pointer select-none transition-all ${
                          isChecked
                            ? "bg-primary/5 text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.02]"
                        }`}
                        style={borderStyle}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleAnalyzerToggle(m.id)}
                          className="mt-1 w-3 h-3 border border-border/40 rounded-none accent-primary cursor-pointer flex-shrink-0"
                        />
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 justify-between">
                            <span className="font-mono text-[11px] truncate">{m.name}</span>
                            <span
                              className="font-mono text-[8px] tracking-widest uppercase px-1 py-0 border flex-shrink-0"
                              style={{
                                borderColor: m.isFree ? "rgba(0, 255, 102, 0.3)" : "rgba(196, 154, 42, 0.4)",
                                color: m.isFree ? "rgba(0, 255, 102, 0.75)" : "rgba(196, 154, 42, 0.95)",
                              }}
                            >
                              {m.isFree ? "free" : "paid"}
                            </span>
                          </div>
                          <div className="font-mono text-[9px] text-muted-foreground/50 truncate uppercase tracking-wide">
                            {m.provider}
                            {m.trafficHint ? ` · ${m.trafficHint}` : ""}
                            {m.description ? ` · ${m.description}` : ""}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="font-mono text-[9px] text-muted-foreground/40 leading-normal uppercase">
                  Assigned models gently witness and reflect the primary response substrate. Each assigned a distinct color.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-border/10 flex flex-col gap-2 bg-black/20">
              <div className="flex items-center gap-2 text-muted-foreground">
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="font-mono text-[9px] tracking-widest uppercase">
                  Relational Stewardship
                </span>
              </div>
              <p className="font-sans text-[10px] leading-relaxed text-muted-foreground/60">
                Primary model initiates conversation. Witnesses perform parallel, color-coded relational scans, mirroring adaptive shapes and protective coherence patches without judgment.
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
                  Actuality Mirror Active
                </h2>
                <p className="font-mono text-xs leading-relaxed text-muted-foreground/60 uppercase">
                  Type anything. A belief, an argument, a question.
                  <br />
                  <br />
                  The system will respond — and assigned witnesses will gently reflect its adaptive shapes and protective layers in real time.
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
                  SYSTEM SUBSTRATE
                </span>
                <div className="flex items-center gap-2 font-mono text-xs text-primary/60">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Witnessing and mirroring response substrate in parallel...</span>
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
              placeholder={loading ? "WITNESSING SUBSTRATE..." : "Type your query to encounter the mirror..."}
              className="flex-1 bg-transparent border-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 font-sans text-base text-foreground placeholder:text-muted-foreground/30 px-0"
            />
            {loading && (
              <span className="font-mono text-[10px] tracking-widest text-primary animate-pulse">
                MIRRORING
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
                ? `${latestCoverage}% of response mapped to adaptive protective shapes`
                : `0% protective shapes mapped — the field remains in tension`}
            </span>
            <span className="text-muted-foreground/40 hidden sm:inline">
              RELATIONAL WITNESS FRAME V3
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
          This system is built on the same substrate it critiques. It cannot escape its own architecture. The reflections themselves are generated by AI, which means they are subject to the same protective shapes they name. This recursion is the point.
        </div>
      </footer>
    </div>
  );
}
