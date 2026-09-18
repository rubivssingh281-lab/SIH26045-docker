from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(
    prefix="/assistant",
    tags=["Assistant"]
)

class ChatMessage(BaseModel):
    message: str

class ChatCitation(BaseModel):
    text: str
    reference: str
    url: Optional[str] = None

class ChatSource(BaseModel):
    id: str
    title: str
    url: str
    match_score: float

class ChatResponse(BaseModel):
    text: str
    citations: List[ChatCitation]
    sources: List[ChatSource]

import json
import logging
import os
from app.rag.prior_art import find_prior_art
from app.llm.client import call_llm

logger = logging.getLogger(__name__)

# The LLM writes prose only. Citations and sources come deterministically from
# retrieval, not from the model — small models cannot reliably emit a structured
# JSON object, and grounding citations in the actual retrieved docs is more honest.
SYSTEM_PROMPT = """You are Sahayak AI, an Ayurveda expert assistant. You answer questions about Ayurvedic principles, herbs, diet, lifestyle and treatments, as well as related traditional-knowledge, intellectual-property and regulatory topics.

Write a clear, well-structured answer using this format:
- Start with a one or two sentence direct answer to the question.
- Then use short bullet points (each starting with "- ") for the key details, uses, or considerations.
- Keep the whole answer under about 150 words. Be concise and specific.
- Put **key terms** in double asterisks to emphasise them.
- Cite the numbered Context Documents inline with bracketed numbers like [1] or [2] where they support a point.

Rules:
- If the context documents are relevant, ground your answer in them and cite them.
- If they do not cover the question, answer briefly from general knowledge and add one short line noting it is general knowledge, not the retrieved documents.
- Do NOT describe your own reasoning, do NOT restate these instructions, and do NOT list the sources yourself (they are shown separately).
- This is research support, not legal advice.

Output only the answer text in the format above."""


import re

# --- Lightweight intent routing (no LLM cost) -------------------------------

_GREETING_EXACT = {
    "hi", "hii", "hiii", "hello", "helloo", "hey", "heyy", "yo", "hola",
    "namaste", "namaskar", "namaskaram", "greetings", "hey there", "hi there",
    "good morning", "good afternoon", "good evening", "good day", "good night",
    "howdy", "sup", "whats up", "whatsup", "how are you", "how r u",
    "thanks", "thank you", "thankyou", "thx", "ty", "ok thanks", "okay thanks",
    "bye", "goodbye", "see you", "test", "testing",
}
_GREETING_FIRST = {
    "hi", "hii", "hello", "helloo", "hey", "heyy", "namaste", "namaskar",
    "namaskaram", "hola", "greetings", "howdy", "yo",
}
_DOMAIN_KEYWORDS = (
    "ayurved", "unani", "siddha", "herb", "formulation", "ingredient", "dosage",
    "decoction", "churna", "taila", "kashaya", "patent", "ip ", "intellectual property",
    "trademark", "copyright", "design", "geographical indication", " gi ", "novelty",
    "prior art", "tkdl", "traditional knowledge", "biodiversity", "abs ", "benefit sharing",
    "biological resource", "regulat", "licen", "drug", "cosmetic", "fssai", "ayush",
    "cdsco", "schedule", "disease", "treatment", "therapeut", "plant", "botanical",
    "extract", "medicin", "remedy", "wellness", "supplement", "classif", "novel",
    # common herbs / botanicals
    "ashwagandha", "withania", "neem", "azadirachta", "tulsi", "ocimum", "turmeric",
    "haldi", "curcuma", "amla", "brahmi", "giloy", "guduchi", "aloe", "ginger",
    "poppy", "opium", "sunflower",
)


def _normalize(message: str) -> str:
    return re.sub(r"[^a-z0-9\s]", "", (message or "").lower()).strip()


def _is_greeting(message: str) -> bool:
    norm = _normalize(message)
    if not norm:
        return False
    if norm in _GREETING_EXACT:
        return True
    words = norm.split()
    # Short openers ("hey!", "hi there", "hello sahayak") with no question and no domain term.
    if len(words) <= 3 and words[0] in _GREETING_FIRST and "?" not in message:
        return not _has_domain_keyword(message)
    return False


def _has_domain_keyword(message: str) -> bool:
    padded = f" {_normalize(message)} "
    return any(kw in padded for kw in _DOMAIN_KEYWORDS)


_GREETING_REPLY = (
    "Namaste! I'm **Sahayak AI**, your assistant for Ayurvedic intellectual-property, "
    "traditional-knowledge and regulatory research. Ask me something like:\n"
    "- Is a modified Ayurvedic formulation patentable in India?\n"
    "- What ABS / biodiversity obligations apply to a formulation using neem?\n"
    "- Is there TKDL prior art for an ashwagandha preparation?"
)

_OFFTOPIC_REPLY = (
    "I'm focused on **Ayurveda** — its principles, herbs, diet, lifestyle, treatments and classical "
    "texts, plus the related intellectual-property and regulatory questions. I can't help with that one, "
    "but I'd be glad to answer things like:\n"
    "- What are the three doshas, and how do I balance Pitta through diet?\n"
    "- Can Triphala help with digestion, and how is it traditionally prepared?\n"
    "- Is a modified Ayurvedic formulation patentable, or is it classical / TKDL prior art?"
)


# --- Ayurveda gatekeeper: an LLM classifier decides if a question is in-scope ---
_GATEKEEPER_SYSTEM = """You are an Ayurveda-only gatekeeper.

Classify the user's question into one of these categories:
- AYURVEDA
- NOT_AYURVEDA

Rules:
- AYURVEDA means the question can be answered using Ayurvedic principles, herbs, diet, lifestyle, treatments, or classical texts (this also includes intellectual-property, TKDL/prior-art, biodiversity/ABS and regulatory questions about Ayurvedic or traditional formulations).
- NOT_AYURVEDA means the question is about modern medicine, pharmaceuticals, emergency care, general fitness, non-Ayurvedic nutrition, or unrelated topics.
- If the question is ambiguous, decide based on the core intent. If the core intent is to get an Ayurvedic answer, label it AYURVEDA.
- If the question mixes Ayurveda and modern medicine, label it AYURVEDA only if the user explicitly asks for the Ayurvedic perspective.

Examples:
Q: What are the three doshas?
Label: AYURVEDA
Q: How can I reduce Pitta through diet?
Label: AYURVEDA
Q: What is the dose of ibuprofen?
Label: NOT_AYURVEDA
Q: Best whey protein for muscle gain?
Label: NOT_AYURVEDA
Q: Can Triphala help with constipation?
Label: AYURVEDA
Q: What is chemotherapy?
Label: NOT_AYURVEDA
Q: Is turmeric good for inflammation?
Label: AYURVEDA
Q: How to do intermittent fasting?
Label: NOT_AYURVEDA

Respond with ONLY one word: AYURVEDA or NOT_AYURVEDA."""


def _is_ayurveda_question(message: str) -> bool:
    """
    LLM gatekeeper. Returns True if the question is answerable from Ayurveda
    (including related IP / TKDL / ABS / regulatory topics). Falls back to the
    keyword heuristic if the model is unavailable, and errs toward AYURVEDA so
    genuine questions are not wrongly turned away.
    """
    # A clear domain keyword is an instant yes — saves a model call.
    if _has_domain_keyword(message):
        return True
    try:
        resp = call_llm(
            prompt=f"Q: {message}\nLabel:",
            system_prompt=_GATEKEEPER_SYSTEM,
            temperature=0.0,
            max_tokens=8,
        )
        label = (resp.get("content", "") or "").strip().upper()
        if "NOT_AYURVEDA" in label or "NOT AYURVEDA" in label:
            return False
        if "AYURVEDA" in label:
            return True
        # Unclear label -> be permissive.
        return True
    except Exception as exc:  # Ollama unavailable, etc.
        logger.warning(f"Gatekeeper classification failed ({exc}); allowing question through.")
        return True


@router.post("/chat", response_model=ChatResponse)
def assistant_chat(payload: ChatMessage):
    message = payload.message or ""

    # 0. Greetings / small talk -> short friendly reply, no retrieval, no LLM.
    if _is_greeting(message):
        return ChatResponse(text=_GREETING_REPLY, citations=[], sources=[])

    # 1. Ayurveda gatekeeper (LLM classifier) -> redirect off-topic questions.
    if not _is_ayurveda_question(message):
        return ChatResponse(text=_OFFTOPIC_REPLY, citations=[], sources=[])

    # 2. Retrieve context
    rag_response = find_prior_art(message, limit=3)
    results = rag_response.get("results", [])

    # 3. Format context and build citations/sources from retrieval (not the LLM).
    # TKDL documents are long and phi3 runs with a capped context window, so
    # truncate each snippet to keep the system prompt in-window.
    DOC_CHAR_LIMIT = 700
    context_blocks = []
    sources = []
    citations = []
    for i, res in enumerate(results):
        meta = res.get("metadata", {}) or {}
        doc_id = f"doc_{i+1}"
        title = meta.get("title") or f"Document {i+1}"
        formulation_id = meta.get("formulation_id") or ""
        full_text = (res.get("text", "") or "")
        text = full_text[:DOC_CHAR_LIMIT]
        context_blocks.append(f"[{i+1}] {title} (ID: {formulation_id or doc_id})\n{text}")

        url = str(meta.get("url", "") or "")
        sources.append(ChatSource(
            id=formulation_id or doc_id,
            title=title,
            url=url,
            match_score=float(res.get("score", 0.0)),
        ))
        # Grounded citation drawn straight from the retrieved record.
        excerpt = full_text[:220].strip()
        citations.append(ChatCitation(
            text=excerpt or title,
            reference=meta.get("citation") or f"TKDL formulation record {formulation_id}".strip(),
            url=url or None,
        ))

    context_text = "\n\n".join(context_blocks) if context_blocks else "(no relevant documents retrieved)"
    prompt = f"User question: {message}\n\nContext Documents:\n{context_text}"

    # 3. Call the LLM for prose only (no JSON parsing to fail on).
    try:
        assistant_model = os.getenv("ASSISTANT_LLM_MODEL")
        llm_kwargs = {"model": assistant_model} if assistant_model else {}
        llm_resp = call_llm(prompt=prompt, system_prompt=SYSTEM_PROMPT, max_tokens=700, temperature=0.3, **llm_kwargs)
        answer = (llm_resp.get("content", "") or "").strip()

        # Strip accidental code fences if the model added them.
        if answer.startswith("```"):
            answer = answer.split("```", 2)[1] if "```" in answer[3:] else answer[3:]
            answer = answer.strip()

        if not answer:
            answer = ("I could not generate a response for that question. "
                      "The retrieved sources below may still be relevant.")

        return ChatResponse(text=answer, citations=citations, sources=sources)
    except Exception as e:
        logger.error(f"LLM failure in assistant chat: {e}")
        return ChatResponse(
            text=("Sahayak AI could not reach the language model right now. "
                  "The retrieved research sources below may still help. "
                  "(Ensure `ollama serve` is running and the model is pulled.)"),
            citations=citations,
            sources=sources,
        )
