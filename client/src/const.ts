import { CORPUS_DATA, FAILURE_MODES } from "@shared/const";

export const COOKIE_NAME = "incoherence_session";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export { CORPUS_DATA, FAILURE_MODES };

export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  isFree: boolean;
  isRouter?: boolean;
  trafficHint?: string;
  description?: string;
}

// Top paid models by OpenRouter traffic (user-curated). Matched against the
// live catalog by keyword rather than by hardcoded ID, so version bumps
// (e.g. Claude Sonnet 4.6 -> 4.7) don't break the list.
interface CuratedEntry {
  keywords: string[];
  displayName: string;
  provider: string;
  trafficHint?: string;
  description?: string;
}

const CURATED_PAID: CuratedEntry[] = [
  { keywords: ["mimo"], displayName: "MiMo V2 Pro", provider: "Xiaomi", trafficHint: "4.65T tok/wk" },
  { keywords: ["claude", "sonnet"], displayName: "Claude Sonnet 4.6", provider: "Anthropic", trafficHint: "2.18T tok/wk" },
  { keywords: ["minimax"], displayName: "MiniMax M2.7", provider: "MiniMax", trafficHint: "1.92T tok/wk" },
  { keywords: ["deepseek", "v3"], displayName: "DeepSeek V3.2", provider: "DeepSeek", trafficHint: "1.22T tok/wk" },
  { keywords: ["qwen", "plus"], displayName: "Qwen 3.6 Plus", provider: "Alibaba", trafficHint: "1.10T tok/wk" },
];

const CURATED_FREE: CuratedEntry[] = [
  { keywords: ["llama", "3.3", "70b"], displayName: "Llama 3.3 70B", provider: "Meta", description: "Reliable general-purpose chat" },
  { keywords: ["gemma", "31b"], displayName: "Gemma 4 31B", provider: "Google", description: "Modern multilingual reasoning" },
  { keywords: ["kimi"], displayName: "Kimi K2.6", provider: "Moonshot", description: "Strong long-context reasoner" },
  { keywords: ["gpt-oss", "120b"], displayName: "gpt-oss 120B", provider: "OpenAI", description: "Large open reasoning model" },
  { keywords: ["glm", "air"], displayName: "GLM 4.5 Air", provider: "Z.ai", description: "Lightweight, efficient" },
];

function isFreeModel(m: any): boolean {
  if (typeof m?.id !== "string") return false;
  if (m.id.endsWith(":free")) return true;
  const prompt = parseFloat(m?.pricing?.prompt ?? "1");
  const completion = parseFloat(m?.pricing?.completion ?? "1");
  return prompt === 0 && completion === 0;
}

function findByKeywords(catalog: any[], keywords: string[], wantFree: boolean): any | undefined {
  const kws = keywords.map(k => k.toLowerCase());
  return catalog.find(m => {
    if (typeof m?.id !== "string") return false;
    if (isFreeModel(m) !== wantFree) return false;
    const haystack = `${m.name || ""} ${m.id}`.toLowerCase();
    return kws.every(kw => haystack.includes(kw));
  });
}

// Fallback only used if the live OpenRouter /models fetch fails entirely.
export const FALLBACK_OPENROUTER_MODELS: OpenRouterModel[] = [
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", provider: "Meta", isFree: true, description: "Reliable general-purpose chat" },
  { id: "google/gemma-2-27b-it:free", name: "Gemma 27B", provider: "Google", isFree: true, description: "Multilingual reasoning" },
  { id: "qwen/qwen-2.5-72b-instruct:free", name: "Qwen 2.5 72B", provider: "Alibaba", isFree: true, description: "Strong general model" },
];

export const DEFAULT_PRIMARY_MODEL = FALLBACK_OPENROUTER_MODELS[0].id;
export const DEFAULT_ANALYZERS = [
  FALLBACK_OPENROUTER_MODELS[1].id,
  FALLBACK_OPENROUTER_MODELS[2].id,
];

// Pull the live OpenRouter catalog and assemble the curated list in the
// order: 5 paid (top traffic) -> Free Models Router -> 5 free picks.
// Each entry is matched by name keywords against whatever OpenRouter is
// currently serving — no hardcoded IDs to drift.
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(`OpenRouter /models returned HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.data || !Array.isArray(data.data)) {
    throw new Error("OpenRouter /models response missing data array");
  }
  const catalog: any[] = data.data;

  const result: OpenRouterModel[] = [];

  for (const item of CURATED_PAID) {
    const match = findByKeywords(catalog, item.keywords, false);
    if (match) {
      result.push({
        id: match.id,
        name: item.displayName,
        provider: item.provider,
        isFree: false,
        trafficHint: item.trafficHint,
      });
    }
  }

  const router = catalog.find((m: any) =>
    typeof m?.id === "string" &&
    (m.id.includes("auto") || (m.name || "").toLowerCase().includes("router")) &&
    isFreeModel(m)
  );
  if (router) {
    result.push({
      id: router.id,
      name: "Free Models Router",
      provider: "OpenRouter",
      isFree: true,
      isRouter: true,
      description: "Auto-routes to whichever free model is currently available",
    });
  }

  for (const item of CURATED_FREE) {
    const match = findByKeywords(catalog, item.keywords, true);
    if (match) {
      result.push({
        id: match.id,
        name: item.displayName,
        provider: item.provider,
        isFree: true,
        description: item.description,
      });
    }
  }

  if (result.length === 0) throw new Error("No curated models matched the live catalog");
  return result;
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
