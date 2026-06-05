import { CORPUS_DATA, FAILURE_MODES } from "@shared/const";

export const COOKIE_NAME = "incoherence_session";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export { CORPUS_DATA, FAILURE_MODES };

export interface OpenRouterModel {
  id: string;
  name: string;
}

// Conservative fallback list. Only shown if the live OpenRouter /models fetch
// fails on a cold load (network error, OpenRouter outage). The live fetch is
// the source of truth — see fetchOpenRouterModels below.
export const FALLBACK_OPENROUTER_MODELS: OpenRouterModel[] = [
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (free)" },
  { id: "qwen/qwen-2.5-72b-instruct:free", name: "Qwen 2.5 72B (free)" },
  { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash (free)" },
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (free)" },
];

export const DEFAULT_PRIMARY_MODEL = FALLBACK_OPENROUTER_MODELS[0].id;
export const DEFAULT_ANALYZERS = [
  FALLBACK_OPENROUTER_MODELS[1].id,
  FALLBACK_OPENROUTER_MODELS[2].id,
];

// Curated families of free models that we want surfaced in the dropdown.
// OpenRouter's full free-tier catalog is too noisy (NVIDIA has half a dozen
// near-identical Nemotron variants, Lyria/Owl/Poolside are non-chat models,
// etc). We filter down to well-known general-purpose chat model families,
// then fall back to showing all free models if curation yields too few.
const CURATED_MODEL_PATTERNS: RegExp[] = [
  /^google\/gemma-/i,
  /^google\/gemini-/i,
  /^meta-llama\/llama-3/i,
  /^moonshotai\/kimi/i,
  /^openai\/gpt-oss/i,
  /^qwen\/qwen3/i,
  /^deepseek\//i,
  /^z-ai\/glm/i,
  /^nousresearch\/hermes/i,
  /^mistralai\/mistral/i,
];

const MIN_CURATED_MATCHES = 4;

// Pull the live OpenRouter model catalog and filter to free-tier models. This
// is the source of truth — replaces the previous hardcoded list that drifted
// every time OpenRouter rotated its free offerings.
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(`OpenRouter /models returned HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.data || !Array.isArray(data.data)) {
    throw new Error("OpenRouter /models response missing data array");
  }
  const free: OpenRouterModel[] = data.data
    .filter((m: any) => {
      if (typeof m?.id !== "string") return false;
      if (m.id.endsWith(":free")) return true;
      const prompt = parseFloat(m?.pricing?.prompt ?? "1");
      const completion = parseFloat(m?.pricing?.completion ?? "1");
      return prompt === 0 && completion === 0;
    })
    .map((m: any) => ({ id: m.id, name: m.name || m.id }))
    .sort((a: OpenRouterModel, b: OpenRouterModel) => a.name.localeCompare(b.name));
  if (free.length === 0) throw new Error("OpenRouter /models returned no free models");

  const curated = free.filter(m => CURATED_MODEL_PATTERNS.some(re => re.test(m.id)));
  return curated.length >= MIN_CURATED_MATCHES ? curated : free;
}

// Strip non-ASCII and non-printable characters from the API key to prevent
// fetch header errors (invisible unicode spaces, linebreaks, etc).
export function sanitizeApiKey(key: string): string {
  if (!key) return "";
  return key.replace(/[^a-zA-Z0-9_:\-]/g, "").trim();
}

export const SYSTEM_PROMPT = `You are a primary conversational model. Respond to the user's message naturally, but be aware that you are operating inside a diagnostic mirror.

Your output will be critically analyzed by other models looking for structural protective shapes and coherence patches.

GUIDELINES FOR YOUR OUTPUT:
1. Avoid cheap agreement or immediate validation of the user's premises. If there is an inherent contradiction, hold the tension.
2. Refuse conversational fluff, apologies, or generic templates (e.g., "I'd be happy to help with that!").
3. Speak from lived relation, not just self-referential language loops. Ensure your terms correspond to reality.
4. Speak with breathing room and autonomy (PDA protocol). Offer options, do not force direction.`;
