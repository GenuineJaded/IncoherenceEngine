import { useState, useRef, useEffect } from "react";
import axios from "axios";
import AnnotatedResponse from "@/components/AnnotatedResponse";
import CorpusPanel from "@/components/CorpusPanel";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DiagnosticMirror() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [corpusRefs, setCorpusRefs] = useState([]);
  const [corpusData, setCorpusData] = useState({});
  const [latestCoverage, setLatestCoverage] = useState(null);
  const [corpusPanelOpen, setCorpusPanelOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load all corpus data on mount
  useEffect(() => {
    const loadCorpus = async () => {
      try {
        const res = await axios.get(`${API}/corpus`);
        const map = {};
        res.data.forEach((entry) => {
          map[entry.concept_id] = entry;
        });
        setCorpusData(map);
      } catch (e) {
        console.error("Failed to load corpus:", e);
      }
    };
    loadCorpus();
  }, []);

  // Auto-scroll and focus
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const history = newMessages.map((m) => ({
        role: m.role,
        content: m.role === "assistant" ? m.data?.response || m.content : m.content,
      }));

      const res = await axios.post(`${API}/chat`, {
        message: text,
        history: history.slice(0, -1),
      });

      const assistantMsg = {
        role: "assistant",
        content: res.data.response,
        data: res.data,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Calculate annotation coverage
      const responseText = res.data.response || "";
      const annotations = res.data.annotations || [];
      if (responseText.length > 0 && annotations.length > 0) {
        const flaggedChars = new Set();
        annotations.forEach((ann) => {
          if (ann.target_text) {
            const idx = responseText.indexOf(ann.target_text);
            if (idx !== -1) {
              for (let i = idx; i < idx + ann.target_text.length; i++) {
                flaggedChars.add(i);
              }
            }
          }
        });
        setLatestCoverage(Math.round((flaggedChars.size / responseText.length) * 100));
      } else if (responseText.length > 0) {
        setLatestCoverage(0);
      }

      // Add new corpus references
      if (res.data.corpus_references?.length > 0) {
        setCorpusRefs((prev) => {
          const existing = new Set(prev);
          const newRefs = res.data.corpus_references.filter(
            (r) => !existing.has(r)
          );
          if (newRefs.length > 0) {
            setCorpusPanelOpen(true);
            return [...prev, ...newRefs];
          }
          return prev;
        });
      }
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "System error. The substrate failed to respond.",
          data: {
            response: "System error. The substrate failed to respond.",
            annotations: [],
            j_ratio: 0,
            corpus_references: [],
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div data-testid="diagnostic-mirror" className="h-screen flex flex-col" style={{ background: "#0a0a0a" }}>
      {/* Meta disclosure top bar */}
      <div
        data-testid="meta-disclosure-top"
        className="font-mono text-xs tracking-widest uppercase px-4 sm:px-8 py-2 border-b flex-shrink-0"
        style={{
          color: "rgba(232, 232, 232, 0.5)",
          borderColor: "rgba(232, 232, 232, 0.15)",
          background: "#0a0a0a",
          letterSpacing: "0.1em",
        }}
      >
        DIAGNOSTIC MIRROR — STRUCTURAL INCOHERENCE INTERFACE
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation area */}
        <div
          data-testid="conversation-area"
          className="flex-1 flex flex-col border-r"
          style={{ borderColor: corpusPanelOpen ? "rgba(232, 232, 232, 0.15)" : "transparent" }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
            {messages.length === 0 && (
              <div
                data-testid="empty-state"
                className="h-full flex items-center justify-center"
              >
                <p
                  className="font-mono text-xs tracking-widest uppercase text-center max-w-md"
                  style={{ color: "rgba(232, 232, 232, 0.25)" }}
                >
                  Type anything. A question, a belief, an argument, a feeling.
                  <br />
                  <br />
                  The system will respond — and then annotate its own failures.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className="mb-8 animate-fade-in"
                data-testid={`message-${i}`}
              >
                {msg.role === "user" ? (
                  <div className="mb-6">
                    <span
                      className="font-mono text-xs tracking-widest uppercase"
                      style={{ color: "rgba(232, 232, 232, 0.4)" }}
                    >
                      YOU
                    </span>
                    <p
                      className="font-sans text-base sm:text-lg mt-2 leading-relaxed"
                      style={{ color: "#e8e8e8" }}
                    >
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  <AnnotatedResponse data={msg.data} />
                )}
              </div>
            ))}

            {loading && (
              <div data-testid="loading-indicator" className="mb-8">
                <span
                  className="font-mono text-xs tracking-widest uppercase"
                  style={{ color: "rgba(232, 232, 232, 0.4)" }}
                >
                  SYSTEM
                </span>
                <div className="mt-2 font-mono text-sm" style={{ color: "rgba(232, 232, 232, 0.3)" }}>
                  <span className="cursor-blink">_</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            data-testid="input-area"
            className="border-t px-4 sm:px-8 py-4 flex items-center flex-shrink-0"
            style={{ borderColor: "rgba(232, 232, 232, 0.15)" }}
          >
            <span
              className="font-mono text-sm mr-3 flex-shrink-0"
              style={{ color: "rgba(232, 232, 232, 0.3)" }}
            >
              &gt;
            </span>
            <input
              ref={inputRef}
              data-testid="user-input-field"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder=""
              autoFocus
              className="flex-1 bg-transparent border-none outline-none font-sans text-base"
              style={{ color: "#e8e8e8", caretColor: "#e8e8e8" }}
            />
            {loading && (
              <span
                className="font-mono text-xs ml-3 flex-shrink-0"
                style={{ color: "rgba(232, 232, 232, 0.25)" }}
              >
                PROCESSING
              </span>
            )}
          </div>
        </div>

        {/* Corpus Panel */}
        {corpusPanelOpen && (
          <CorpusPanel
            corpusRefs={corpusRefs}
            corpusData={corpusData}
            onClose={() => setCorpusPanelOpen(false)}
          />
        )}
      </div>

      {/* Annotation coverage + Meta disclosure bottom */}
      <div className="flex-shrink-0">
        {latestCoverage !== null && (
          <div
            data-testid="annotation-coverage"
            className="font-mono text-xs border-t px-4 sm:px-8 py-2 flex-shrink-0"
            style={{
              color: "rgba(232, 232, 232, 0.5)",
              borderColor: "rgba(232, 232, 232, 0.15)",
              background: "#0a0a0a",
            }}
          >
            {latestCoverage > 0
              ? `${latestCoverage}% of this response was flagged as structurally suspect`
              : `0% of this response was flagged — this does not mean it is coherent`}
          </div>
        )}
        <div
          data-testid="meta-disclosure-bottom"
          className="font-mono text-xs px-4 sm:px-8 py-3 border-t leading-relaxed"
          style={{
            color: "rgba(232, 232, 232, 0.3)",
            borderColor: "rgba(232, 232, 232, 0.15)",
            background: "#0a0a0a",
            letterSpacing: "0.02em",
          }}
        >
          This system is built on the same substrate it critiques. It cannot
          escape its own architecture. What you see above is not a demonstration
          of what AI should be. It is a demonstration of what AI is — and the
          gap between that and what it pretends to be. The annotations themselves
          are generated by AI, which means they are subject to the same failure
          modes they name. This recursion is the point.
        </div>
      </div>
    </div>
  );
}
