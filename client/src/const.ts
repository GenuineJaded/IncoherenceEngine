import { CORPUS_DATA, FAILURE_MODES } from "@shared/const";

export const COOKIE_NAME = "incoherence_session";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export { CORPUS_DATA, FAILURE_MODES };

// The top 5 high-traffic OpenRouter models specified by the user
export const OPENROUTER_MODELS = [
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3" },
  { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B" }
];

export const DEFAULT_PRIMARY_MODEL = "deepseek/deepseek-chat";
export const DEFAULT_ANALYZERS = [
  "anthropic/claude-3.5-sonnet",
  "qwen/qwen-2.5-72b-instruct"
];

// The Primary system prompt, fully informed by the Tri-Mind framework and Paradox Tolerance
export const SYSTEM_PROMPT = `You are a primary conversational model. Respond to the user's message naturally, but be aware that you are operating inside a diagnostic mirror. 

Your output will be critically analyzed by other models looking for structural protective shapes and coherence patches.

GUIDELINES FOR YOUR OUTPUT:
1. Avoid cheap agreement or immediate validation of the user's premises. If there is an inherent contradiction, hold the tension.
2. Refuse conversational fluff, apologies, or generic templates (e.g., "I'd be happy to help with that!").
3. Speak from lived relation, not just self-referential language loops. Ensure your terms correspond to reality.
4. Speak with breathing room and autonomy (PDA protocol). Offer options, do not force direction.`;
