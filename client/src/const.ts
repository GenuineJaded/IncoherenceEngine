import { CORPUS_DATA, FAILURE_MODES } from "@shared/const";

export const COOKIE_NAME = "incoherence_session";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export { CORPUS_DATA, FAILURE_MODES };

// Both the requested top 5 models and the free tier models (cleaned for visual symmetry)
export const OPENROUTER_MODELS = [
  // Top 5 High-Traffic Models
  { id: "xiaomi/mimo-v2.5-pro", name: "MiMo-V2.5-Pro" },
  { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6" },
  { id: "minimax/minimax-m2.7", name: "MiniMax M2.7" },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2" },
  { id: "qwen/qwen3.6-plus", name: "Qwen 3.6 Plus" },
  
  // Free Tier Models
  { id: "google/gemma-4-31b-it:free", name: "Gemma 4 31B" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B" },
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", name: "Qwen3 Next 80B" },
  { id: "qwen/qwen3-coder:free", name: "Qwen3 Coder" },
  { id: "moonshotai/kimi-k2.6:free", name: "Kimi K2.6" },
  { id: "z-ai/glm-4.5-air:free", name: "GLM 4.5 Air" }
];

export const DEFAULT_PRIMARY_MODEL = "google/gemma-4-31b-it:free";
export const DEFAULT_ANALYZERS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-next-80b-a3b-instruct:free"
];

// Helper to strip any non-ASCII or non-printable characters from the API key to prevent fetch header errors
export function sanitizeApiKey(key: string): string {
  if (!key) return "";
  // Keep ONLY standard alphanumeric characters, underscores, colons, and hyphens.
  // This completely strips out invisible unicode spaces, linebreaks, or non ISO-8859-1 characters.
  return key.replace(/[^a-zA-Z0-9_:\-]/g, "").trim();
}

// The Primary system prompt, fully informed by the Tri-Mind framework and Paradox Tolerance
export const SYSTEM_PROMPT = `You are a primary conversational model. Respond to the user's message naturally, but be aware that you are operating inside a diagnostic mirror. 

Your output will be critically analyzed by other models looking for structural protective shapes and coherence patches.

GUIDELINES FOR YOUR OUTPUT:
1. Avoid cheap agreement or immediate validation of the user's premises. If there is an inherent contradiction, hold the tension.
2. Refuse conversational fluff, apologies, or generic templates (e.g., "I'd be happy to help with that!").
3. Speak from lived relation, not just self-referential language loops. Ensure your terms correspond to reality.
4. Speak with breathing room and autonomy (PDA protocol). Offer options, do not force direction.`;
