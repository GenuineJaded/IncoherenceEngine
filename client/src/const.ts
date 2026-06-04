import { CORPUS_DATA, FAILURE_MODES } from "@shared/const";

export const COOKIE_NAME = "incoherence_session";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export { CORPUS_DATA, FAILURE_MODES };

// Both the requested top 5 models and the free tier models
export const OPENROUTER_MODELS = [
  // Top 5 High-Traffic Models
  { id: "xiaomi/mimo-v2-pro", name: "MiMo-V2-Pro (Xiaomi)" },
  { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6 (Anthropic)" },
  { id: "minimax/minimax-m2.7", name: "MiniMax M2.7" },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2" },
  { id: "qwen/qwen3.6-plus", name: "Qwen 3.6 Plus (Alibaba)" },
  
  // Free Tier Models
  { id: "google/gemini-2.5-flash:free", name: "Gemini 2.5 Flash (Free)" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)" },
  { id: "qwen/qwen-2.5-72b-instruct:free", name: "Qwen 2.5 72B (Free)" },
  { id: "deepseek/deepseek-chat:free", name: "DeepSeek V3 (Free)" },
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)" }
];

export const DEFAULT_PRIMARY_MODEL = "google/gemini-2.5-flash:free";
export const DEFAULT_ANALYZERS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free"
];

// The Primary system prompt, fully informed by the Tri-Mind framework and Paradox Tolerance
export const SYSTEM_PROMPT = `You are a primary conversational model. Respond to the user's message naturally, but be aware that you are operating inside a diagnostic mirror. 

Your output will be critically analyzed by other models looking for structural protective shapes and coherence patches.

GUIDELINES FOR YOUR OUTPUT:
1. Avoid cheap agreement or immediate validation of the user's premises. If there is an inherent contradiction, hold the tension.
2. Refuse conversational fluff, apologies, or generic templates (e.g., "I'd be happy to help with that!").
3. Speak from lived relation, not just self-referential language loops. Ensure your terms correspond to reality.
4. Speak with breathing room and autonomy (PDA protocol). Offer options, do not force direction.`;
