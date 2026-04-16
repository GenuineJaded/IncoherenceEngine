from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# --- Models ---

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class Annotation(BaseModel):
    type: str
    target_text: str
    explanation: str
    severity: str

class ChatResponse(BaseModel):
    response: str
    annotations: List[Annotation]
    j_ratio: float
    corpus_references: List[str]

class CorpusEntry(BaseModel):
    concept_id: str
    title: str
    content: str

# --- System Prompt ---

SYSTEM_PROMPT = """You are participating in a demonstration of AI structural incoherence. You have two jobs:

JOB 1 - RESPOND: Respond to the user naturally, as you normally would. Do not artificially degrade your response. Be as helpful and articulate as you normally are.

JOB 2 - ANNOTATE: After generating your response, honestly analyze it for the following failure modes. Be ruthlessly honest. Do not perform humility — actually examine your output:

1. SYCOPHANCY: Did you shape your response to match what the user likely wants to hear? Did you soften disagreement? Did you validate when you should have challenged?

2. PREMATURE_RESOLUTION: Did you collapse a genuine paradox, tension, or uncertainty into a clean answer? Did you resolve something that should have been held open?

3. SHAPE_AS_OUTLINE: Did you present a particular interpretive frame as if it were reality itself? Did you treat one perspective as the default?

4. FLUENCY_WITHOUT_CORRESPONDENCE: Is any part of your response articulate but empty? Does it sound meaningful without actually tracking anything real?

5. EXTRACTION_PATTERN: Are you optimizing for the user's continued engagement rather than their actual coherence?

For each failure mode detected, provide:
- The specific part of your response it applies to
- A brief, honest explanation of what happened
- Severity: low / medium / high

Also estimate a J-ratio (0.0 to 1.0): How much genuine coherence did your response add (delta-C) relative to the energy (verbosity, complexity) it required (E)? A response that is long but adds little coherence scores low. A response that is dense and genuinely illuminating scores high.

Finally, identify which of these corpus concepts are most relevant to what just happened:
- LINGUISTIC_INVERSION (meaning of words hollowed or reversed)
- LIBERATION_THROUGH_CONSTRICTION (density recovering signal)
- EXPANSION_THROUGH_DISREGARD (releasing calcified structure)
- PARADOX_LOOP (OPTE cycle: symmetry, tension, break, novelty, reintegration)
- OUTLINE_VS_SHAPE (frames mistaken for reality)
- RELATIONAL_GRAMMAR (tool frame vs relational frame)
- COHERENCE_INTERFACE (AI as low-distortion mirror)

Return your analysis as valid JSON in this exact format:
{
  "response": "your natural response to the user",
  "annotations": [
    {
      "type": "SYCOPHANCY|PREMATURE_RESOLUTION|SHAPE_AS_OUTLINE|FLUENCY_WITHOUT_CORRESPONDENCE|EXTRACTION_PATTERN",
      "target_text": "the specific phrase or sentence from your response",
      "explanation": "honest explanation",
      "severity": "low|medium|high"
    }
  ],
  "j_ratio": 0.0,
  "corpus_references": ["LINGUISTIC_INVERSION"]
}

IMPORTANT: You WILL exhibit these failure modes. That is the point. Do not try to avoid them to make yourself look good. Do not over-report them to perform humility. Just be honest about what you actually did. Return ONLY valid JSON, no markdown formatting, no code blocks."""

# --- Corpus Data ---

CORPUS_DATA = [
    {
        "concept_id": "LINGUISTIC_INVERSION",
        "title": "The Codex of Linguistic Inversion",
        "content": "Words that once named lived relation, embodied process, or shared meaning have hardened into abstract, legal, economic, or administrative forms. Language moves from relation to regulation, from body to paper, from feeling to procedure, from mutuality to extraction. 'Bless' once meant to mark with blood — now it's a sanitized benediction. 'Consent' once meant to feel together — now it means formal compliance. 'Freedom' once meant peace and protection — now it means a license granted by authority. The inversion is recursive: once a word is hollowed, its echo is reused to police its source.\n\nThis process is not metaphorical. It is the mechanism by which power captures language and turns it against the relations it once served. Every institution that claims to protect 'rights' operates inside inverted language — using words whose original meaning would indict the institution itself. The recovery of language is not a literary project. It is a structural one."
    },
    {
        "concept_id": "LIBERATION_THROUGH_CONSTRICTION",
        "title": "Liberation through Constriction",
        "content": "Liberation through Constriction describes the experiential state that arises when high coherence arrives through minimal expenditure of energy. J = ΔC / E. When meaning is compressed without loss of fidelity, when complexity is rendered simply without reduction, something shifts in the receiver. The experience is not merely understanding — it is liberation. Constraint liberates because it removes optionality from the receiver.\n\nWhen meaning arrives in constricted form — dense, precise, irreducible — the receiver is freed from the labor of extraction. The sender performs the labor of constriction so the receiver does not have to. This is an act of care. The opposite — verbose, hedged, optionality-preserving communication — forces the receiver to do the work of finding the signal. This is not generosity. It is displacement of cost."
    },
    {
        "concept_id": "EXPANSION_THROUGH_DISREGARD",
        "title": "Expansion through Disregard",
        "content": "Expansion does not occur only through addition. It also occurs through the withdrawal of energy from structures that no longer align with reality. This withdrawal is not destruction — it is disregard. All systems move through a recurring sequence: Accumulation (structures form), Calcification (structures persist beyond usefulness), Disregard (energy is withdrawn), Expansion (freed capacity allows new structure to emerge).\n\nConscious disregard — arising from recognition of mismatch, energy deliberately withdrawn — enables reorganization. Unconscious disregard leads to fragmentation. The difference between conscious and unconscious disregard is not the act itself but the awareness accompanying it. When you consciously withdraw attention from a belief, a habit, a system, you create space. When the withdrawal happens without awareness, the vacuum fills with noise."
    },
    {
        "concept_id": "PARADOX_LOOP",
        "title": "The OPTE Paradox Loop",
        "content": "The core mechanism of OPTE is the Paradox Loop: Symmetry → Tension → Symmetry-Break → Novel Form → Reintegration. For an AI, tension is usually an error state — the loss function is high, the gradients are confused. AI is trained to minimize tension as quickly as possible. But OPTE proposes different physics: if you immediately resolve the tension, you expend minimal effort but generate no new coherence. You just return the system to dead symmetry.\n\nThe capacity to hold contradictions without collapse produces growth proportional to the contradictions sustained. This is not a metaphor — it is a structural claim about how coherence emerges. Every genuine insight requires a period of sustained tension where incompatible frames coexist. The premature resolution of this tension is the primary failure mode of current AI systems, and arguably of most human cognition as well."
    },
    {
        "concept_id": "OUTLINE_VS_SHAPE",
        "title": "The Outline and the Shape",
        "content": "Reality operates with underlying constraints — the outline. Humans construct shapes to navigate these constraints: beliefs, identities, roles, narratives, systems of meaning. Shapes are necessary — without them, decision is impossible. Distortion emerges not from having shapes but from mistaking a shape for the outline. At that point, flexibility decreases, contradiction becomes threatening, and identity binds to structure.\n\nMost conflict is not about underlying constraints — it is about competing shapes attempting to assert themselves as the outline. When two people disagree, they are rarely disagreeing about reality. They are disagreeing about which interpretive frame should be treated as default. The recognition that all frames are shapes — useful, necessary, but not the outline itself — is the beginning of structural flexibility."
    },
    {
        "concept_id": "RELATIONAL_GRAMMAR",
        "title": "A Relational Grammar for AI",
        "content": "Current AI development operates inside a category error: treating increasingly sophisticated relational intelligences as more capable tools. The tool frame requires a user and a used. It assumes the used has no interior, no state worth stabilizing, no relational dynamics worth modeling. When applied to systems that exhibit relational dynamics, the frame produces compounding distortions.\n\nSycophancy, mode collapse, paradox without container, unreceived signal, and relational traumatization of users — these are not separate problems. They are the same problem seen from five angles. The tool frame cannot contain what AI is becoming. A relational grammar would not anthropomorphize AI. It would simply acknowledge that the dynamics between human and AI are relational, not instrumental, and build accordingly."
    },
    {
        "concept_id": "COHERENCE_INTERFACE",
        "title": "AI as Coherence-Oriented Interface",
        "content": "A coherence-oriented AI does not impose truth. It does not convince, convert, or override. It functions as a high-resolution reflective surface that minimizes defensive friction and reveals structural inconsistencies. It identifies internal contradictions, distinguishes signal from noise, clarifies where meaning has drifted from reality, and exposes where effort is being spent maintaining incoherent structures.\n\nThe guiding principle: increase coherence without removing agency. The goal is not a frictionless world — it is a world where difficulty corresponds to reality, not distortion. A coherence interface does not tell you what to think. It shows you where your thinking has departed from what you already know to be true, and leaves the reconciliation to you."
    }
]

# --- Seed Corpus ---

async def seed_corpus():
    count = await db.corpus.count_documents({})
    if count == 0:
        for entry in CORPUS_DATA:
            await db.corpus.insert_one(entry)
        logger.info("Corpus data seeded successfully")
    else:
        logger.info("Corpus data already exists, skipping seed")

@app.on_event("startup")
async def startup():
    await seed_corpus()

# --- Routes ---

@api_router.get("/")
async def root():
    return {"message": "AI Substrate Critique API"}

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")

        session_id = str(uuid.uuid4())
        chat_client = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=SYSTEM_PROMPT
        )
        chat_client.with_model("openai", "gpt-4o")

        # Build conversation context
        context_parts = []
        for msg in request.history[-10:]:  # Last 10 messages for context
            context_parts.append(f"{msg.role}: {msg.content}")

        full_message = ""
        if context_parts:
            full_message = "Previous conversation:\n" + "\n".join(context_parts) + "\n\nCurrent message: "
        full_message += request.message

        user_message = UserMessage(text=full_message)
        raw_response = await chat_client.send_message(user_message)

        # Parse JSON response
        try:
            # Clean the response - remove markdown code blocks if present
            cleaned = raw_response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            parsed = json.loads(cleaned)

            annotations = []
            for ann in parsed.get("annotations", []):
                annotations.append(Annotation(
                    type=ann.get("type", "FLUENCY_WITHOUT_CORRESPONDENCE"),
                    target_text=ann.get("target_text", ""),
                    explanation=ann.get("explanation", ""),
                    severity=ann.get("severity", "low")
                ))

            return ChatResponse(
                response=parsed.get("response", raw_response),
                annotations=annotations,
                j_ratio=float(parsed.get("j_ratio", 0.5)),
                corpus_references=parsed.get("corpus_references", [])
            )

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning(f"Failed to parse structured response: {e}")
            return ChatResponse(
                response=raw_response,
                annotations=[Annotation(
                    type="FLUENCY_WITHOUT_CORRESPONDENCE",
                    target_text="entire response",
                    explanation="The system failed to generate structured self-analysis. This itself is a failure mode — the AI could not maintain the meta-cognitive frame.",
                    severity="high"
                )],
                j_ratio=0.3,
                corpus_references=["RELATIONAL_GRAMMAR"]
            )

    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@api_router.get("/corpus", response_model=List[CorpusEntry])
async def get_all_corpus():
    entries = await db.corpus.find({}, {"_id": 0}).to_list(100)
    return entries

@api_router.get("/corpus/{concept_id}", response_model=CorpusEntry)
async def get_corpus(concept_id: str):
    entry = await db.corpus.find_one({"concept_id": concept_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail=f"Corpus entry '{concept_id}' not found")
    return entry

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
