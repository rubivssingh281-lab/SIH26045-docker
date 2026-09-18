import json
import logging
from sqlalchemy.orm import Session
from app.models import FormulationSubmission, ExtractedFact
from app.db import SessionLocal
from app.rag.prior_art import find_prior_art
from app.llm.client import call_llm
from app.pipeline.fact_extraction import extract_facts
from app.pipeline.rule_engine import evaluate_rules
from app.pipeline.confidence import compute_confidence
from app.pipeline.citation_validation import validate_citations
from app.pipeline.explain import build_detailed_trace

logger = logging.getLogger(__name__)


def _shape_rule(rule: dict | None) -> dict | None:
    """Map a rules.json entry to the frontend `Rule` shape {id,title,citation,summary}."""
    if not rule:
        return None
    return {
        "id": rule.get("id", ""),
        "title": rule.get("name") or rule.get("id", ""),
        "citation": rule.get("citation", ""),
        "summary": rule.get("explanation") or rule.get("description", ""),
    }


def _build_prior_art(evidence: list) -> list:
    """
    Build frontend PriorArtCandidate[] from retrieved TKDL evidence.

    These are source candidates from the TKDL prior-art corpus, not a novelty
    or patentability determination. All ingested TKDL records are public.
    """
    candidates = []
    for item in evidence:
        meta = item.get("metadata", {}) or {}
        fid = meta.get("formulation_id") or meta.get("id") or ""
        title = meta.get("title") or meta.get("source") or "Prior-art candidate"
        excerpt = (item.get("text", "") or "").strip()
        relevance = (excerpt[:280] + "…") if len(excerpt) > 280 else (
            excerpt or "Retrieved as potentially relevant to the described formulation."
        )
        candidates.append({
            "id": fid or f"candidate-{len(candidates)+1}",
            "title": f"{title} ({fid})" if fid else title,
            "source": "TKDL formulation corpus",
            "relevance": relevance,
            "access_status": "PUBLIC",
            "access_note": "Public TKDL formulation candidate returned by retrieval. "
                           "Source-level verification is required before any novelty conclusion.",
        })
    return candidates


def _build_abs_assessment(rule_results: dict, facts: list) -> dict:
    """
    Derive an ABS pathway assessment from the deterministic rule result.

    Grounded in whether the ABS rule fired; it does not invent a legal
    conclusion beyond what the rule engine determined.
    """
    fact_dict = {f.get("key"): f.get("value") for f in facts}
    abs_rule_fired = any(
        "abs" in (r.get("conclusion", "").lower()) or r.get("id", "").startswith("R-BDACT")
        for r in rule_results.get("matches", [])
    )
    uses_bio = bool(fact_dict.get("uses_biological_resource"))
    commercial = bool(fact_dict.get("commercial_intent"))

    if abs_rule_fired:
        pathway_status = "PATHWAY_REQUIRED"
        summary = ("Confirmed use of a biological resource with commercial intent triggers the "
                   "ABS approval pathway under the amended Biological Diversity regime.")
        primary_status = "REQUIRED"
    elif uses_bio:
        pathway_status = "CONDITIONAL_REVIEW"
        summary = ("A biological resource is used but the commercial-intent trigger was not confirmed. "
                   "Human review is needed to determine the applicable ABS pathway.")
        primary_status = "CONDITIONAL"
    else:
        pathway_status = "INSUFFICIENT"
        summary = ("No confirmed biological-resource use was found in the facts. The ABS pathway cannot "
                   "be assessed without additional confirmed facts.")
        primary_status = "REVIEW"

    citation = "Biological Diversity (Amendment) Act 2023"
    obligations = [
        {"title": "ABS approval / agreement", "status": primary_status,
         "details": "Approval or a benefit-sharing agreement with the competent authority where a "
                    "biological resource is accessed for commercial use.",
         "authority": "National Biodiversity Authority / State Biodiversity Board", "citation": citation},
        {"title": "Benefit-sharing terms", "status": primary_status if primary_status != "REVIEW" else "REVIEW",
         "details": "Fair and equitable benefit-sharing terms determined by the applicable authority.",
         "authority": "National Biodiversity Authority", "citation": citation},
    ]
    disclosure_obligations = [
        {"title": "Source & geographic-origin disclosure", "status": "REQUIRED" if uses_bio else "REVIEW",
         "details": "Disclosure of the biological resource's source and geographic origin in applicable filings.",
         "authority": "WIPO GRATK Treaty / patent office", "citation": "WIPO GRATK Treaty 2024"},
    ]
    return {
        "pathway_status": pathway_status,
        "authority": "National Biodiversity Authority / State Biodiversity Board",
        "obligations": obligations,
        "disclosure_obligations": disclosure_obligations,
        "summary": summary,
    }


def _build_ip_routes(submission, evidence: list) -> list:
    """
    Structured IP-route matrix for the IP Navigator tool.

    The prototype rule engine does not make per-regime patentability verdicts, so
    every route is returned as CONDITIONAL with an honest, human-review rationale
    rather than an invented APPLICABLE/NOT_APPLICABLE conclusion.
    """
    has_prior_art = bool(evidence)
    prior_art_note = (" Retrieved TKDL prior-art candidates should be reviewed for overlap."
                      if has_prior_art else "")
    regimes = [
        ("Patent", "Patentability depends on novelty and non-obviousness over prior art, and on the "
                   "Section 3(p) traditional-knowledge bar. Requires human IP review." + prior_art_note,
         "Patents Act 1970, s.3(p)"),
        ("GI", "Geographical Indication may apply where the product has a defined geographic origin and reputation.",
         "GI of Goods (Registration and Protection) Act 1999"),
        ("Trademark", "A brand name/logo may be registrable independently of the formulation itself.",
         "Trade Marks Act 1999"),
        ("Design", "Design protection may apply to a novel visual/ornamental aspect of the article.",
         "Designs Act 2000"),
        ("Copyright", "Copyright may cover original literary/artistic material (e.g. labels, manuals), not the formulation.",
         "Copyright Act 1957"),
        ("Plant Variety", "Plant-variety protection may apply where a distinct new plant variety is involved.",
         "PPV&FR Act 2001"),
    ]
    return [
        {"ip_type": name, "status": "CONDITIONAL", "citation": citation, "rationale": rationale}
        for name, rationale, citation in regimes
    ]


def _build_regulatory_assessment(submission) -> dict:
    """
    Structured regulatory-pathway assessment for the Regulatory tool.

    Returns honest REVIEW items: the prototype does not select a definitive
    regulatory route, so it surfaces the questions a human reviewer must resolve.
    """
    review = "REVIEW"
    return {
        "applicable_act": "Human regulatory review required (Drugs & Cosmetics / AYUSH / FSSAI depending on form and claims)",
        "licensing_route": "Licensing route to be confirmed by a regulatory reviewer for the product form and claims.",
        "claim_restrictions": [
            {"title": "Therapeutic / disease claims", "status": review,
             "details": "Disease/therapeutic claims are restricted; review the product's claims against the applicable advertising regime.",
             "authority": "Drugs and Magic Remedies (Objectionable Advertisements) Act 1954",
             "citation": "DMR Act 1954"},
        ],
        "labelling_requirements": [
            {"title": "Product identity & directions", "status": review,
             "details": "Required label particulars depend on the confirmed regulatory route.",
             "authority": "Drugs & Cosmetics Rules", "citation": "Drugs & Cosmetics Act 1940"},
        ],
        "route_items": [
            {"title": "Governing Act", "status": review,
             "details": "Determine whether Drugs & Cosmetics (incl. ASU drugs), FSSAI or another route governs the product.",
             "authority": "CDSCO / Ministry of AYUSH / FSSAI", "citation": "Drugs & Cosmetics Act 1940 / FSS Act 2006"},
            {"title": "Licensing / registration route", "status": review,
             "details": "Identify the applicable licence, registration or market-entry route for the confirmed category.",
             "authority": "State Licensing Authority", "citation": "Drugs & Cosmetics Rules 1945"},
        ],
    }


def _fallback_conclusion(classification, band, facts, rule, evidence_view):
    lines = [f"**Summary:** The case was classified as *{classification}* with an assessment confidence band of "
             f"*{band}*, based on the user-confirmed facts and the retrieved evidence."]
    if facts:
        lines.append("\n**Key Facts:**")
        for f in facts:
            lines.append(f"- {str(f.get('key','')).replace('_',' ')}: {f.get('value')}")
    if rule:
        lines.append(f"\n**Rule Application:** Rule '{rule.get('name') or rule.get('id')}' applied — "
                     f"{rule.get('citation','no citation')}.")
    else:
        lines.append("\n**Rule Application:** No deterministic rule matched the confirmed facts; any tool-specific "
                     "assessment shown is a structured review, not a rule-based verdict.")
    if evidence_view:
        lines.append(f"\n**Conclusion:** {len(evidence_view)} supporting record(s) were retrieved and validated. "
                     "This is research support, not legal advice.")
    return "\n".join(lines)


def generate_conclusion(classification, band, facts, fired_rules, evidence_view, title=""):
    """
    Produce a rich, natural-language conclusion (markdown) explaining the outcome,
    grounded strictly in the deterministic results. Uses the local LLM; falls back
    to a deterministic summary if the model is unavailable.
    """
    rule = fired_rules[0] if fired_rules else None
    fact_lines = "; ".join(f"{f.get('key')}={f.get('value')}" for f in facts) or "none"
    rule_line = (f"{rule.get('name') or rule.get('id')} — citation: {rule.get('citation','n/a')}"
                 if rule else "no deterministic rule matched")
    ev_lines = "; ".join((e.get("title") or "") for e in evidence_view[:3]) or "none"

    system_prompt = (
        "You are an Ayurvedic IP research assistant. Write a clear CONCLUSION explaining the assessment, "
        "using EXACTLY these bold section headers in this order:\n"
        "**Summary:** (one short paragraph)\n"
        "**Key Facts:** (short '- ' bullet points)\n"
        "**Rule Application:** (short '- ' bullet points)\n"
        "**Conclusion:** (one or two sentences)\n"
        "Base everything ONLY on the classification, facts, rule and evidence given. Do NOT invent statutes or "
        "numbers. Keep the whole thing under ~180 words. Output only the conclusion text."
    )
    prompt = (f"Classification: {classification}\nConfidence band: {band}\nConfirmed facts: {fact_lines}\n"
              f"Fired rule: {rule_line}\nRetrieved evidence: {ev_lines}\nCase: {title}")
    try:
        resp = call_llm(prompt=prompt, system_prompt=system_prompt, temperature=0.2, max_tokens=400)
        text = (resp.get("content", "") or "").strip()
        if text and "**" in text:
            return text
    except Exception as exc:
        logger.warning(f"Conclusion generation failed ({exc}); using deterministic fallback.")
    return _fallback_conclusion(classification, band, facts, rule, evidence_view)


def execute_fact_extraction(submission_id: str, case_text: str) -> list:
    """
    Executes the LLM Fact Extraction step.
    Returns a list of extracted facts.
    """
    db: Session = SessionLocal()
    try:
        submission = db.query(FormulationSubmission).filter(FormulationSubmission.submission_id == submission_id).first()
        if not submission:
            raise ValueError(f"Submission {submission_id} not found.")

        submission.status = "PROCESSING"
        db.commit()

        # Call fact extraction
        facts = extract_facts(case_text)
        
        # Extracted facts remain provisional.  The API persists them for review.
        db.commit()
        
        return facts
    finally:
        db.close()

def execute_analysis(submission_id: str) -> dict:
    """
    Executes the Rule Engine, RAG Retrieval, and Confidence pipelines.
    """
    db: Session = SessionLocal()
    try:
        submission = db.query(FormulationSubmission).filter(FormulationSubmission.submission_id == submission_id).first()
        if not submission:
            raise ValueError(f"Submission {submission_id} not found.")

        # 1. Load only facts explicitly confirmed by the user.
        records = db.query(ExtractedFact).filter(ExtractedFact.submission_id == submission_id, ExtractedFact.status == "CONFIRMED").all()
        def parse_value(value):
            if value in ("true", "false"): return value == "true"
            return value
        facts = [{"key": item.field, "value": parse_value(item.value), "source_span": item.source_span, "extraction_confidence": item.confidence} for item in records]
        if not facts:
            raise ValueError("Facts must be extracted and confirmed before analysis.")

        submission.status = "SCORED"
        db.commit()

        # 2. Rule Engine
        rule_results = evaluate_rules(facts, submission.as_of_date)
        
        # 3. RAG / Evidence Retrieval
        # We query the vector store for the triggered rules' citations or user text.
        # TKDL prior art is not jurisdiction-scoped: a traditional-knowledge record
        # is relevant to novelty regardless of the case jurisdiction, and the
        # ingested corpus carries no jurisdiction metadata to filter on. Passing a
        # jurisdiction here would silently return zero evidence.
        query_text = f"{submission.title or ''} {submission.description or ''}"
        prior_art_res = find_prior_art(query_text, limit=3)
        matches = prior_art_res.get("results", [])
        # Validate retrieved evidence against the case text, not the boolean
        # rule-signal fact keys (which share no vocabulary with evidence prose).
        evidence = validate_citations(matches, facts, query_text=query_text)
        
        # 4. Confidence Engine
        tool = (submission.tool or "").lower()
        # A tool that produces its own structured assessment (IP routes, ABS pathway,
        # regulatory review, TKDL prior art) is not decided by the deterministic rule
        # engine, so "0 rules fired" must NOT zero out its confidence.
        produces_tool_assessment = tool in ("abs", "ip-navigator", "regulatory") or (tool == "tkdl" and bool(evidence))

        # fact_conf: these facts were explicitly CONFIRMED by the user, so they are
        # reliable. Use the average extraction confidence but floor it, rather than
        # keying off a single fact (which produced misleading 0% scores).
        fact_scores = [float(f["extraction_confidence"]) for f in facts
                       if isinstance(f.get("extraction_confidence"), (int, float))]
        avg_fact = sum(fact_scores) / len(fact_scores) if fact_scores else 0.0
        fact_conf = max(avg_fact, 0.8)  # user-confirmed -> reliable

        if rule_results["rules_applied"] > 0:
            rule_fit_conf = 1.0
        elif produces_tool_assessment:
            rule_fit_conf = 0.7  # tool produced a structured (conditional / review) assessment
        else:
            rule_fit_conf = 0.0  # plain classifier path with no matching rule

        dimensions = {
            "fact_conf": fact_conf,
            "rule_fit_conf": rule_fit_conf,
            "evidence_conf": max((float(item.get("score", 0)) for item in matches), default=0.0),
            "citation_conf": 1.0 if evidence and all(item.get("is_valid") for item in evidence) else 0.0
        }
        confidence_result = compute_confidence(dimensions)
        
        # 5. Explainability (LLM Generation)
        submission.status = "EXPLAINED"
        db.commit()
        
        # Explanation is deterministic trace data; it cannot change the legal conclusion.
        explanation = "Deterministic rule evaluation produced: " + rule_results["classification"]
        
        # 6. Final Result Assembly
        previous = json.loads(submission.result_json or "{}")
        version = int(previous.get("version", 0)) + 1
        history = previous.get("history", [])
        
        import uuid, datetime
        history.append({
            "id": f"history-{uuid.uuid4().hex[:8]}",
            "type": "ANALYZED",
            "title": f"Analysis run v{version}",
            "description": f"Classification: {rule_results['classification']}",
            "actor": "System",
            "occurred_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "version": version
        })

        # Frontend-facing shapes derived from the deterministic results.
        evidence_view = [
            {
                "id": item.get("metadata", {}).get("formulation_id") or item.get("metadata", {}).get("id", f"doc_{i}"),
                "title": item.get("metadata", {}).get("title") or item.get("metadata", {}).get("source", "Retrieved evidence"),
                "source_type": item.get("metadata", {}).get("source", "TKDL corpus"),
                "citation": item.get("metadata", {}).get("citation", "TKDL corpus record"),
                "excerpt": item.get("text", ""),
                "jurisdiction": submission.jurisdiction,
                "validated": item.get("is_valid", False),
            }
            for i, item in enumerate(evidence)
        ]
        prior_art = _build_prior_art(evidence)
        applicable_rule = _shape_rule(rule_results["matches"][0] if rule_results["matches"] else None)
        abs_assessment = _build_abs_assessment(rule_results, facts) if tool == "abs" else None
        ip_routes = _build_ip_routes(submission, evidence) if tool == "ip-navigator" else None
        regulatory_assessment = _build_regulatory_assessment(submission) if tool == "regulatory" else None

        final_result = {
            "version": version,
            "history": history,
            "facts": facts,
            "classification": rule_results["classification"],
            "confidence": confidence_result,
            "fired_rules": rule_results["matches"],
            "explanation_text": explanation,
            "citations": [doc.get("metadata", {}).get("formulation_id", f"doc_{i}") for i, doc in enumerate(evidence)],
            "evidence": evidence_view,
            "applicable_rule": applicable_rule,
            "jurisdiction": submission.jurisdiction, "as_of_date": submission.as_of_date,
            "result_type": "RESULT" if confidence_result["band"] != "INSUFFICIENT" else "ABSTENTION",
            "next_action": "Request human review." if confidence_result["band"] == "INSUFFICIENT" else "Review the rule and supporting evidence.",
            "limitations": ["Evidence retrieval is unavailable or unvalidated."] if not evidence else [],
            "abs_indication": "Review confirmed biological-resource facts.",
            "tkdl_indication": f"{len(prior_art)} public TKDL prior-art candidate(s) retrieved; no restricted TKDL content is displayed." if prior_art else "No restricted TKDL content is displayed.",
            "prior_art": prior_art,
            "abs_assessment": abs_assessment,
            "ip_routes": ip_routes,
            "regulatory_assessment": regulatory_assessment,
        }
        # Natural-language, LLM-generated conclusion grounded in the results.
        final_result["conclusion_text"] = generate_conclusion(
            rule_results["classification"], confidence_result["band"], facts,
            rule_results["matches"], evidence_view, submission.title or "",
        )
        # Rich, sourced explainability trace (facts, rules, evidence+citations, confidence, conclusion).
        final_result["trace"] = build_detailed_trace(final_result)
        
        submission.status = "DONE"
        submission.result_json = json.dumps(final_result)
        db.commit()
        
        return final_result
    except Exception as e:
        logger.error(f"[{submission_id}] Pipeline failed: {str(e)}")
        submission.status = "FAILED"
        submission.result_json = json.dumps({"error": str(e)})
        db.commit()
        raise e
    finally:
        db.close()

import asyncio

async def run_formulation_pipeline(submission_id: str):
    """
    Background wrapper for the legacy /formulation endpoint.
    Runs extraction and analysis sequentially.
    """
    db: Session = SessionLocal()
    try:
        submission = db.query(FormulationSubmission).filter(FormulationSubmission.submission_id == submission_id).first()
        if not submission:
            return
            
        case_text = f"{submission.title or ''} {submission.ingredients or ''} {submission.disease or ''}"
        execute_fact_extraction(submission_id, case_text)
        execute_analysis(submission_id)
    except Exception as e:
        logger.error(f"Background pipeline failed: {e}")
    finally:
        db.close()
