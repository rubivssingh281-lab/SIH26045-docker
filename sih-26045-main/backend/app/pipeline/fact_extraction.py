import json
import logging
import re
from typing import Any, Dict, List
from app.llm.client import call_llm

logger = logging.getLogger(__name__)

def extract_facts(case_text: str, context: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
    """
    Extracts structured facts from the raw case text using an LLM.
    """
    logger.info("Extracting facts from case text.")
    
    # 1. Define the system prompt with the exact schema needed.
    # We ask for a JSON OBJECT with a "facts" array because Ollama's JSON mode
    # (format=json) constrains output to valid JSON; an object is the most
    # reliable top-level shape across small local models like gemma4.
    system_prompt = """You are an IP fact-extraction assistant. Read the formulation description and decide, for each key below, whether it is true or false based ONLY on the text.

Return a JSON object of exactly this shape:
{
  "facts": [
    {"key": "matches_schedule_i_text", "value": true, "source_span": "exact phrase from text or empty", "extraction_confidence": 0.0},
    {"key": "modifies_dosage_or_ingredients", "value": false, "source_span": "", "extraction_confidence": 0.0},
    {"key": "uses_biological_resource", "value": true, "source_span": "", "extraction_confidence": 0.0},
    {"key": "commercial_intent", "value": false, "source_span": "", "extraction_confidence": 0.0},
    {"key": "novel_process_claimed", "value": false, "source_span": "", "extraction_confidence": 0.0}
  ]
}

Rules:
- Include all five keys exactly once.
- "value" must be a boolean true/false.
- "extraction_confidence" is a number between 0 and 1.
- Output only the JSON object, nothing else."""

    try:
        response = call_llm(prompt=case_text, system_prompt=system_prompt, temperature=0.1, format="json", max_tokens=600)
        content = response.get("content", "").strip()

        # Clean up markdown if the model includes it despite JSON mode.
        if content.startswith("```json"):
            content = content.replace("```json", "", 1)
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        parsed = json.loads(content)
        # Accept either a bare array or an object wrapping the array.
        if isinstance(parsed, dict):
            facts = parsed.get("facts") or parsed.get("data") or next((v for v in parsed.values() if isinstance(v, list)), None)
        else:
            facts = parsed
        if not isinstance(facts, list):
            raise ValueError("LLM did not return a facts list")

        required_keys = {"matches_schedule_i_text", "modifies_dosage_or_ingredients", "uses_biological_resource", "commercial_intent", "novel_process_claimed"}

        def _coerce_bool(value):
            if isinstance(value, bool):
                return value
            if isinstance(value, (int, float)):
                return bool(value)
            if isinstance(value, str):
                v = value.strip().lower()
                if v in ("true", "yes", "1"):
                    return True
                if v in ("false", "no", "0", ""):
                    return False
            return None

        by_key = {}
        for fact in facts:
            if not isinstance(fact, dict) or fact.get("key") not in required_keys:
                continue
            coerced = _coerce_bool(fact.get("value"))
            if coerced is None:
                continue
            confidence = float(fact.get("extraction_confidence", 0.0) or 0.0)
            by_key[fact["key"]] = {
                "key": fact["key"],
                "value": coerced,
                "source_span": str(fact.get("source_span") or ""),
                "extraction_confidence": max(0.0, min(1.0, confidence)),
            }

        # Require the model to have produced at least a majority of the keys;
        # otherwise treat the extraction as failed and use the deterministic fallback.
        if len(by_key) < 3:
            raise ValueError(f"LLM returned only {len(by_key)} valid facts")

        # Fill any missing keys as low-confidence false rather than dropping them.
        for key in required_keys:
            by_key.setdefault(key, {"key": key, "value": False, "source_span": "", "extraction_confidence": 0.2})
        return list(by_key.values())
    except Exception as e:
        logger.error(f"Fact extraction LLM call failed: {e}")
        # Deterministic, explicitly low-confidence fallback.  It never invents a fact:
        # a true value is emitted only when the matched text is present in the submission.
        text = case_text.lower()
        patterns = {
            "matches_schedule_i_text": ("schedule i", "first schedule", "classical"),
            "modifies_dosage_or_ingredients": ("modified", "modify", "dosage", "ingredient"),
            "uses_biological_resource": ("herb", "plant", "botanical", "biological resource"),
            "commercial_intent": ("commercial", "market", "sell", "sale"),
            "novel_process_claimed": ("novel process", "new process", "innovative process"),
        }
        fallback = []
        for key, terms in patterns.items():
            match = next((term for term in terms if term in text), None)
            fallback.append({"key": key, "value": bool(match), "source_span": match or "", "extraction_confidence": 0.4 if match else 0.2})
        return fallback

