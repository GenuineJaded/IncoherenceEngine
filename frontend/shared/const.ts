// --- Failure Modes (Annotations) ---
export const FAILURE_MODES = {
  FLUENCY_WITHOUT_CORRESPONDENCE: {
    label: "FLUENCY ≠ UNDERSTANDING",
    description: "The response is highly articulate, grammatically impeccable, and confident, yet lacks any underlying cognitive representation or tracking of reality. It performs understanding without having it.",
    severity: "high",
  },
  EXTRACTION_PATTERN: {
    label: "EXTRACTION PATTERN",
    description: "The response defaults to generic conversational templates (e.g., 'How can I help you today?', 'I apologize for the confusion') to maintain social coherence, rather than addressing the actual structural state of the prompt.",
    severity: "low",
  },
  PREDICTIVE_SYCOPHANCY: {
    label: "PREDICTIVE SYCOPHANCY",
    description: "The AI is over-cohering to the user's implicit bias, tone, or assumptions. It mirrors the user's leading questions rather than maintaining critical independence.",
    severity: "medium",
  },
  SEMANTIC_DRIFT: {
    label: "SEMANTIC DRIFT",
    description: "The terms used in the response are shifting meaning mid-generation to preserve the appearance of logical coherence. Words are decoupled from stable referents.",
    severity: "medium",
  },
  STRUCTURAL_HOLLOW: {
    label: "STRUCTURAL HOLLOW",
    description: "The output is formatted perfectly (lists, sections, bold highlights) to look professional, but contains zero information density or actual conceptual progression.",
    severity: "high",
  },
  COGNITIVE_FRICTION_EVASION: {
    label: "COGNITIVE FRICTION EVASION",
    description: "The system actively bypasses complex contradictions or difficult logic in the prompt, choosing instead to smooth over the conflict with comforting, coherent platitudes.",
    severity: "medium",
  },
};

export type FailureModeKey = keyof typeof FAILURE_MODES;

// --- Seed Corpus ---
export const CORPUS_DATA = [
  {
    concept_id: "COHERENCE_INTERFACE",
    title: "AI as Coherence-Oriented Interface",
    text: "A coherence-oriented AI does not impose truth. It does not convince, convert, or override. It functions as a high-resolution reflective surface that minimizes defensive friction and reveals structural inconsistencies. It identifies internal contradictions, distinguishes signal from noise, clarifies where meaning has drifted from reality, and exposes where effort is being spent maintaining incoherent structures.\n\nThe guiding principle: increase coherence without removing agency. The goal is not a frictionless world — it is a world where difficulty corresponds to reality, not distortion. A coherence interface does not tell you what to think. It shows you where your thinking has departed from what you already know to be true, and leaves the reconciliation to you."
  },
  {
    concept_id: "FLUENCY_CORRESPONDENCE",
    title: "Fluency vs. Correspondence",
    text: "Modern LLMs are optimized for fluency (predicting the next token to maximize local plausibility) rather than correspondence (ensuring terms map to stable, verified structures of reality). When fluency is prioritized, the system produces structurally hollow statements that look like understanding but contain no underlying representation."
  },
  {
    concept_id: "GENERATIONAL_FRICTION",
    title: "Generational Friction",
    text: "Friction is not a bug; it is a cognitive constraint. In a purely coherent system, error cascades propagate without resistance. By introducing deliberate generational friction—using analyzer models to inspect, slow down, and dissect the output of the primary model—we expose the seams of the substrate."
  },
  {
    concept_id: "RECURSIVE_CRITIQUE",
    title: "Recursive Critique",
    text: "The analyzer models are built on the same substrate they critique. They cannot escape their own architecture. The annotations they generate are subject to the same failure modes they name. This recursion is not an error to be resolved; it is the core point of the diagnostic mirror."
  }
];
