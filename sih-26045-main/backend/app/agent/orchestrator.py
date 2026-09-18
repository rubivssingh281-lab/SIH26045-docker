"""
Agentic orchestrator — multi-step, multi-source reasoning over the knowledge graph
and the TKDL retrieval corpus.

Design: a DETERMINISTIC controller drives the plan (classify -> detect intents ->
traverse graph -> retrieve evidence -> compose), which keeps reasoning reliable and
fully functional offline. The LLM (phi3) is used ONLY to phrase the final,
citation-grounded answer from facts the tools already gathered. It cannot introduce
new authority; if it is unavailable the deterministic composer runs instead.

Guardrails: cite-or-abstain, a standing 'information, not legal advice' disclaimer,
and an escalation path to a human IP facilitator.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from app.agent.tools import classify_formulation, query_graph, retrieve_evidence
from app.pipeline.confidence import compute_confidence

logger = logging.getLogger(__name__)

DISCLAIMER = "This is an AI-assisted information system, not legal advice."
ESCALATION = "For a binding opinion, escalate to a human IP facilitator."
_ABSTAIN = "Insufficient authoritative evidence."


def _normalize_jurisdiction(value: str) -> str:
    v = (value or "India").strip().lower()
    return "International" if v.startswith("int") else "India"


# Radar / spider-chart axes — the project-specific coverage dimensions every
# analysis is scored on (0..1). Deterministic: derived from the graph facts,
# the classification and the retrieved evidence, never from the LLM.
_RADAR_AXES = [
    ("patent", "Patent"),
    ("tkdl", "TKDL"),
    ("tk", "Trad. Knowledge"),
    ("abs", "ABS"),
    ("disclosure", "Disclosure"),
    ("regulatory", "Regulatory"),
]


def _radar(graph_facts: List[dict], evidence: List[dict],
           category: dict, confidence: dict) -> List[dict]:
    ids = {f["node_id"] for f in graph_facts}
    cat = category.get("category_id")
    ev_strength = min(1.0, (max((e["score"] for e in evidence), default=0.0)) + 0.12 * len(evidence))

    def has(*node_ids: str) -> bool:
        return any(i in ids for i in node_ids)

    scores = {
        "patent": (0.9 if has("ip_patent") else
                   0.7 if cat in ("cat_new_drug", "cat_phytopharma") else
                   0.6 if has("concept_3p", "concept_3d") else 0.3),
        "tkdl": (round(0.45 + 0.55 * ev_strength, 3) if (evidence or has("concept_tkdl")) else 0.2),
        "tk": (0.95 if (has("concept_3p") or cat == "cat_classical") else
               0.6 if cat == "cat_proprietary" else 0.35),
        "abs": (0.9 if has("ob_abs_approval", "stat_bd_act", "treaty_cbd", "treaty_nagoya") else 0.3),
        "disclosure": (0.9 if has("ob_source_disclosure", "concept_104", "treaty_gratk") else 0.35),
        "regulatory": (0.85 if has("stat_dc_act", "stat_dmr_act", "stat_fssai", "ob_ad_claims", "ob_clinical_evidence") else 0.4),
    }
    return [{"key": k, "label": label, "score": round(float(scores[k]), 3)} for k, label in _RADAR_AXES]


def _label_facts(graph_facts: List[dict], evidence: List[dict]):
    """Attach stable [G#]/[E#] labels used for inline citation."""
    for i, f in enumerate(graph_facts, start=1):
        f["ref"] = f"G{i}"
    for i, e in enumerate(evidence, start=1):
        e["ref"] = f"E{i}"


# --- composition ------------------------------------------------------------

_COMPOSE_SYSTEM = (
    "You are IP-SAKTI Sahayak, an assistant for Ayurvedic intellectual-property, traditional-knowledge, "
    "ABS and drug-regulatory questions. You are given a set of GRAPH FACTS and EVIDENCE that were already "
    "retrieved from an authoritative, curated corpus. Write a clear, plain-language answer for a non-lawyer.\n"
    "STRICT RULES:\n"
    "- Use ONLY the provided facts and evidence. Do NOT add any statute, section, treaty, rule or citation "
    "that is not in them.\n"
    "- Cite inline with the given labels in square brackets, e.g. [G1], [E2], next to the point they support.\n"
    "- Do NOT say anything is definitely patentable/compliant; describe requirements and considerations.\n"
    "- Keep it under ~180 words, use short paragraphs or '- ' bullets.\n"
    "- Do NOT restate these instructions or list the sources yourself.\n"
    "Output only the answer text."
)


def _compose_fallback(category: dict, graph_facts: List[dict], evidence: List[dict],
                      jurisdiction: str) -> str:
    lines: List[str] = []
    if category.get("matched"):
        lines.append(f"**Classification:** This appears to be a *{category['label']}* "
                     f"({category.get('citation','')}).")
    if graph_facts:
        lines.append(f"\n**Applicable framework ({jurisdiction}):**")
        for f in graph_facts:
            rel = f["relation"].replace("_", " ").lower()
            lines.append(f"- {f['label']} — {rel}. {f['statement']} [{f['ref']}]")
    if evidence:
        lines.append("\n**Supporting evidence (TKDL prior art):**")
        for e in evidence:
            lines.append(f"- {e['title']}: {e['excerpt']} [{e['ref']}]")
    if not graph_facts and not evidence:
        lines.append(_ABSTAIN + " No applicable rule or evidence was found for this query.")
    return "\n".join(lines).strip()


def _compose_llm(query: str, jurisdiction: str, category: dict,
                 graph_facts: List[dict], evidence: List[dict]) -> Dict[str, Any]:
    try:
        from app.llm.client import call_llm
    except Exception:
        return {"answer": _compose_fallback(category, graph_facts, evidence, jurisdiction),
                "ai_unavailable": True}

    facts_block = "\n".join(
        f"[{f['ref']}] ({f['relation']}) {f['label']}: {f['statement']} — {f['citation']}"
        for f in graph_facts) or "(none)"
    ev_block = "\n".join(f"[{e['ref']}] {e['title']}: {e['excerpt']}" for e in evidence) or "(none)"
    cat_line = (f"Formulation category: {category['label']} ({category.get('citation','')})"
                if category.get("matched") else "Formulation category: not determined")
    prompt = (f"User question: {query}\nJurisdiction: {jurisdiction}\n{cat_line}\n\n"
              f"GRAPH FACTS:\n{facts_block}\n\nEVIDENCE:\n{ev_block}")
    try:
        resp = call_llm(prompt=prompt, system_prompt=_COMPOSE_SYSTEM, temperature=0.2, max_tokens=550)
        answer = (resp.get("content", "") or "").strip()
        if answer.startswith("```"):
            answer = answer.strip("`").strip()
        if len(answer) >= 30:
            return {"answer": answer, "ai_unavailable": False}
    except Exception as exc:
        logger.warning("Agent composition LLM unavailable (%s); using deterministic composer.", exc)
    return {"answer": _compose_fallback(category, graph_facts, evidence, jurisdiction),
            "ai_unavailable": True}


# --- public entry point -----------------------------------------------------

def run_agent(query: str, jurisdiction: str = "India", formulation: str = "",
              ingredients: Optional[List[str]] = None, use_llm: bool = True) -> Dict[str, Any]:
    ingredients = [str(i).strip() for i in (ingredients or []) if str(i).strip()]
    jur = _normalize_jurisdiction(jurisdiction)
    full_text = " ".join(p for p in [query, formulation, " ".join(ingredients)] if p).strip()
    trace: List[Dict[str, Any]] = []

    # Step 1 — classify formulation
    category = classify_formulation(query, formulation)
    trace.append({
        "title": "Formulation classification",
        "status": "success" if category["matched"] else "warning",
        "details": (f"Classified as {category['label']}." if category["matched"]
                    else "No formulation category matched; answering from graph + evidence only."),
        "items": ([{"label": "Category", "value": category["label"], "meta": category.get("citation", "")}]
                  if category["matched"] else []),
    })

    # Step 2 — detect intents (IP types / obligations / concepts)
    from app.graph.graph_store import get_graph
    intents = get_graph().detect_intents(full_text)
    trace.append({
        "title": "Intent detection",
        "status": "success" if intents else "pending",
        "details": (f"Detected {len(intents)} relevant topic(s)." if intents
                    else "No specific IP/obligation intent detected from the wording."),
        "items": [{"label": (get_graph().get_node(i) or {}).get("label", i)} for i in intents],
    })

    # Step 3 — knowledge-graph traversal
    graph_res = query_graph(category["category_id"], intents, jur, query=full_text)
    graph_facts = graph_res["facts"]
    trace.append({
        "title": "Knowledge-graph traversal",
        "status": "success" if graph_facts else "warning",
        "details": f"Gathered {len(graph_facts)} applicable rule/obligation node(s) for {jur}.",
        "items": [{"label": f["label"], "value": f["relation"], "meta": f["citation"]} for f in graph_facts],
    })

    # Step 4 — evidence retrieval (existing TKDL RAG)
    evidence = retrieve_evidence(full_text)
    trace.append({
        "title": "Evidence retrieval (TKDL)",
        "status": "success" if evidence else "pending",
        "details": (f"Retrieved {len(evidence)} validated prior-art candidate(s)." if evidence
                    else "No validated TKDL prior art retrieved."),
        "items": [{"label": e["title"], "meta": f"score {e['score']}"} for e in evidence],
    })

    _label_facts(graph_facts, evidence)

    # Step 5 — abstain or compose
    abstain = not graph_facts and not evidence
    if abstain:
        answer = f"{_ABSTAIN} This question is outside the curated corpus, or too little was found to answer safely."
        ai_unavailable = False
    else:
        composed = _compose_llm(query, jur, category, graph_facts, evidence) if use_llm \
            else {"answer": _compose_fallback(category, graph_facts, evidence, jur), "ai_unavailable": True}
        answer = composed["answer"]
        ai_unavailable = composed["ai_unavailable"]

    trace.append({
        "title": "Answer composition",
        "status": "success" if not abstain else "warning",
        "details": ("Deterministic composer (AI unavailable)." if ai_unavailable and not abstain
                    else ("Abstained: insufficient authoritative evidence." if abstain
                          else "Grounded answer composed and cited.")),
    })

    # Step 6 — confidence (weakest-link; reuses existing engine)
    dims = {
        "fact_conf": 0.8 if category["matched"] else (0.6 if graph_facts else 0.3),
        "rule_fit_conf": 1.0 if graph_facts else 0.3,
        "evidence_conf": max((e["score"] for e in evidence), default=0.0),
        "citation_conf": 1.0 if (graph_facts and all(f["verified"] for f in graph_facts)) else (0.5 if evidence else 0.0),
    }
    confidence = compute_confidence(dims)
    trace.append({
        "title": "Confidence assessment",
        "status": "success" if confidence["band"] in ("HIGH", "MEDIUM") else "warning",
        "details": f"Overall confidence: {confidence['band']} ({confidence['overall_conf']}).",
        "items": [{"label": k, "value": str(v)} for k, v in dims.items()],
    })

    # combined citations (graph + evidence)
    citations = [
        {"ref": f["ref"], "source_title": f["label"], "citation": f["citation"],
         "source_url": f["url"] or "", "type": "graph", "validated": f["verified"]}
        for f in graph_facts
    ] + [
        {"ref": e["ref"], "source_title": e["title"], "citation": e["citation"],
         "source_url": (e["url"] if e["url"].startswith("http") else ""), "type": "evidence", "validated": True}
        for e in evidence
    ]

    return {
        "success": True,
        "query": query,
        "jurisdiction": jur,
        "classification": category,
        "answer": answer,
        "abstained": abstain,
        "ai_unavailable": ai_unavailable,
        "graph_facts": graph_facts,
        "evidence": evidence,
        "citations": citations,
        "subgraph": graph_res["subgraph"],
        "radar": _radar(graph_facts, evidence, category, confidence),
        "confidence": confidence,
        "trace": {"steps": trace},
        "escalation": ESCALATION,
        "disclaimer": DISCLAIMER,
    }
