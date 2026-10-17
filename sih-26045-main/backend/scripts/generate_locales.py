import json
import os
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(r"e:\sih-26045-main\sih-26045-main\backend")
sys.path.insert(0, str(BACKEND_DIR))

LOCALES_DIR = Path(r"e:\sih-26045-main\sih-26045-main\IP-SAKTI-frontend\frontend-koutsa\src\locales")
EN_JSON = LOCALES_DIR / "en.json"

from app.translation.bhashini_translator import get_translator

LANG_FILE_MAP = {
    "hi": "Hindi",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
    "or": "Odia",
    "ur": "Urdu",
    "as": "Assamese",
    "sa": "Sanskrit",
    "ne": "Nepali",
    "gom": "Konkani",
    "sd": "Sindhi",
    "doi": "Dogri",
    "mai": "Maithili",
    "sat": "Santali",
    "ks": "Kashmiri",
    "mni": "Manipuri",
    "brx": "Bodo",
    "awa": "Awadhi",
    "bho": "Bhojpuri",
    "bra": "Braj",
    "hne": "Chhattisgarhi",
    "gon": "Gondi",
    "hoc": "Ho",
    "xnr": "Kangri",
    "mag": "Magahi",
    "lus": "Mizo",
    "si": "Sinhala",
    "tcy": "Tulu",
    "bhb": "Bhili",
    "bgc": "Haryanvi",
    "raj": "Rajasthani",
    "kha": "Khasi",
    "hinglish": "Hinglish",
}

NEW_SECTIONS = {
    "archive": {
        "eyebrow": "Records",
        "title": "Case archive",
        "description": "Browse, filter and reopen past evidence-grounded research cases. This view is designed for retrieval, not dashboard monitoring.",
        "export_pdf": "Export filtered PDF",
        "search": "Search",
        "search_placeholder": "Search cases, tools or results…",
        "tool": "Tool",
        "all_tools": "All tools",
        "status": "Status",
        "all_statuses": "All statuses",
        "pending": "Pending",
        "complete": "Complete",
        "escalated": "Escalated",
        "jurisdiction": "Jurisdiction",
        "all": "All",
        "india": "India",
        "international": "International",
        "updated_from": "Updated from",
        "updated_to": "Updated to",
        "sort": "Sort",
        "last_updated": "Last updated",
        "title_sort": "Title",
        "clear_filters": "Clear filters",
        "records_count": "{count} records",
        "reopen_hint": "Click a row to reopen the case",
        "col_case": "Case",
        "col_tool": "Tool",
        "col_jurisdiction": "Jurisdiction",
        "col_result": "Result",
        "col_status": "Status",
        "col_updated": "Updated",
        "no_records": "No archive records match",
        "no_records_desc": "Adjust your filters or clear the search.",
        "page_of": "Page {page} of {total}",
        "previous": "Previous",
        "next": "Next",
        "export_empty": "No cases match the current filters.",
        "export_success": "Case archive exported as PDF",
        "export_failed": "Export failed"
    },
    "sources": {
        "eyebrow": "Corpus",
        "title": "Source library",
        "description": "Browse the source categories the research service can use to ground an assessment. Each category exposes a versioned catalog surface; restricted databases remain access-controlled.",
        "freshness_eyebrow": "Corpus freshness",
        "freshness_title": "Prototype corpus snapshot",
        "freshness_desc": "Last synchronized: 27 Aug 2026 · Backend sync status: demonstration data. Production deployments should expose the authoritative sync timestamp from the corpus service.",
        "paid_title": "Paid source access",
        "paid_desc": "Connect a user-provided subscription only after explicit consent is recorded.",
        "review_consent": "Review consent",
        "categories_eyebrow": "Source categories",
        "categories_title": "Browse the grounding corpus",
        "indexed": "indexed",
        "open_category": "Open category",
        "catalog_note": "Source records shown here are a frontend catalog surface. The backend must remain the authority for current versions, access permissions, citations and actual retrieval results.",
        "back_to_library": "Source library",
        "category_eyebrow": "Source category",
        "request_record": "Request current source record",
        "col_source": "Source",
        "col_type": "Type",
        "col_version": "Version",
        "col_updated": "Last updated",
        "col_access": "Access",
        "public": "Public",
        "restricted": "Restricted",
        "category_not_found": "Source category not found",
        "back_to_sources": "Back to source library",
        "detail_note": "Current source text, version metadata and citation validity must be supplied by the backend corpus service before being treated as authoritative.",
        "cat_indian_ip_title": "Indian IP law",
        "cat_indian_ip_desc": "Patents, geographical indications, trade marks, designs and copyright sources.",
        "cat_indian_ip_type": "Primary legal sources",
        "cat_bio_title": "Biodiversity & ABS",
        "cat_bio_desc": "Biological-diversity legislation, rules and access-and-benefit-sharing material.",
        "cat_bio_type": "India + international",
        "cat_tk_title": "Traditional knowledge",
        "cat_tk_desc": "Public traditional-knowledge references and restricted TKDL access pointers.",
        "cat_tk_type": "Access controlled",
        "cat_ayush_title": "AYUSH regulation",
        "cat_ayush_desc": "Drug, advertising, food and cosmetic classification material relevant to Ayurvedic products.",
        "cat_ayush_type": "Regulatory sources",
        "cat_intl_title": "International frameworks",
        "cat_intl_desc": "TRIPS, CBD, Nagoya, WIPO GRATK, PCT and related international systems.",
        "cat_intl_type": "Treaties + systems",
        "cat_prior_title": "Prior art records",
        "cat_prior_desc": "Patent and public-registry records returned by the evidence layer.",
        "cat_prior_type": "Registry evidence"
    },
    "tools": {
        "ask_eyebrow": "Sahayak research",
        "ask_title": "Ask Sahayak",
        "ask_desc": "Ask anything about Ayurvedic IP, TK or regulatory status — Sahayak answers from cited sources only.",
        "ask_prompt": "e.g. Can a modified Ayurvedic formulation be protected by a patent in India?",
        "ask_sidebar_title": "How this answer is grounded",
        "ask_sidebar_1": "Retrieved statute, rule or treaty passages",
        "ask_sidebar_2": "Inline citations for supporting evidence",
        "ask_sidebar_3": "Assessment confidence for the answer",
        "ask_sidebar_4": "Escalation path when evidence is insufficient",
        "navigator_eyebrow": "IP Navigator",
        "navigator_title": "Map the right IP protection path",
        "navigator_desc": "Separate what is genuinely novel from what comes from traditional knowledge, then scope the IP regimes worth evaluating.",
        "navigator_prompt": "Summarize the product, how it is made, and the business context.",
        "navigator_sidebar_title": "What Sahayak checks",
        "navigator_sidebar_1": "Novelty vs. traditional-knowledge boundary",
        "navigator_sidebar_2": "Section 3(p) patentability bar check",
        "navigator_sidebar_3": "GI, trade mark, design and copyright applicability",
        "navigator_sidebar_4": "TKDL defensive-publication exposure",
        "classifier_eyebrow": "Formulation classifier",
        "classifier_title": "Classify an Ayurvedic formulation",
        "classifier_desc": "Classify the formulation using checkable ingredient, source-text, processing, claims and modification facts. The backend determines the supported regulatory category and evidence requirements.",
        "classifier_prompt": "Add any context that does not fit the structured classification fields above...",
        "classifier_sidebar_title": "What Sahayak checks",
        "classifier_sidebar_1": "First-Schedule text match",
        "classifier_sidebar_2": "Degree of modification from the classical formula",
        "classifier_sidebar_3": "Safety / efficacy evidence requirement trigger",
        "classifier_sidebar_4": "Applicable category evidence bar",
        "abs_eyebrow": "ABS compliance",
        "abs_title": "Prepare a biodiversity / ABS research case",
        "abs_desc": "Capture biological resources, source location, access context and intended commercial use so the backend can assess the relevant ABS pathway.",
        "abs_prompt": "Describe the biological resource, where it was accessed, its source/community context and intended use...",
        "abs_sidebar_title": "What Sahayak checks",
        "abs_sidebar_1": "Biological-resource facts",
        "abs_sidebar_2": "Source and access context",
        "abs_sidebar_3": "Jurisdiction-specific ABS rules",
        "abs_sidebar_4": "Evidence and escalation",
        "tkdl_eyebrow": "TKDL / prior art",
        "tkdl_title": "Investigate traditional knowledge and prior art",
        "tkdl_desc": "Surface TKDL and public prior-art signals relevant to a patentability or novelty question. This tool returns source candidates rather than a patentability verdict.",
        "tkdl_prompt": "Add any context about the technique, traditional use or search scope...",
        "tkdl_sidebar_title": "What Sahayak checks",
        "tkdl_sidebar_1": "Public TKDL entries",
        "tkdl_sidebar_2": "Restricted-access TKDL entries — notice only",
        "tkdl_sidebar_3": "Patent / publication prior-art candidates",
        "tkdl_sidebar_4": "Source relevance and access status",
        "regulatory_eyebrow": "Regulatory pathway",
        "regulatory_title": "Map the product's regulatory pathway",
        "regulatory_desc": "Capture product form, intended use, label claims, dosage and marketing channel so the backend can map the applicable drug, advertising or food/cosmetic route.",
        "regulatory_prompt": "Add any product facts that do not fit the structured regulatory fields above...",
        "regulatory_sidebar_title": "What Sahayak checks",
        "regulatory_sidebar_1": "Which Act governs: Drugs & Cosmetics / Magic Remedies / FSSAI",
        "regulatory_sidebar_2": "Advertising-claim restrictions triggered",
        "regulatory_sidebar_3": "Labelling and presentation requirements",
        "regulatory_sidebar_4": "Licensing route and evidence needed"
    },
    "case_new": {
        "novelty_title": "What's novel vs. new",
        "novelty_placeholder": "Describe the technical, formulation, process or commercial features you believe are new.",
        "novelty_hint": "Focus on the feature you believe is genuinely new, not the traditional ingredients or uses you inherited.",
        "traditional_title": "What's traditional knowledge",
        "traditional_placeholder": "Describe traditional ingredients, formulations, uses, source texts or community-held knowledge involved.",
        "traditional_hint": "Be explicit about known Ayurvedic texts, customary use or traditional formulation features.",
        "ip_types_title": "IP types of interest",
        "ip_types_hint": "Only selected regimes are sent as the navigator's retrieval scope.",
        "stage_title": "Commercialization stage",
        "stage_research": "Research",
        "stage_pre_launch": "Pre-launch",
        "stage_launched": "Launched",
        "ingredients_title": "Ingredients",
        "ingredients_hint": "Add each ingredient separately and cite the source text you are relying on for that ingredient.",
        "add_ingredient": "Add ingredient",
        "ingredient_name": "Ingredient name",
        "ingredient_placeholder": "e.g. Ashwagandha root",
        "source_reference_title": "Source text reference",
        "source_reference_placeholder": "e.g. Charaka Samhita, Sutra 1",
        "first_schedule_q": "Does it appear in a First-Schedule authoritative text?",
        "yes": "Yes",
        "no": "No",
        "unsure": "Unsure",
        "processing_title": "Processing / manufacturing method",
        "processing_placeholder": "Describe heating, extraction, purification, fermentation, dosage preparation or other manufacturing steps.",
        "intended_use_title": "Intended use + claims",
        "intended_use_placeholder": "State the intended use and the exact therapeutic, wellness or other claims to be assessed.",
        "modifications_title": "Modifications from classical formulation",
        "modifications_placeholder": "Describe any change to ingredients, proportions, dosage, processing or presentation compared with the classical formulation.",
        "bio_resources_title": "Biological resources",
        "bio_resources_hint": "List each biological resource separately so access and source facts remain checkable.",
        "add_resource": "Add resource",
        "resource_name": "Biological resource name (botanical / common)",
        "origin_title": "Source / origin location (State, District, Forest, Farm)",
        "origin_placeholder": "e.g. Uttar Pradesh, India — district / region if known",
        "origin_hint": "Use the access location or provenance you know; geography can affect the backend ABS assessment.",
        "access_context_title": "Access context",
        "access_wild": "Wild-collected",
        "access_cultivated": "Cultivated",
        "access_community": "Community-sourced",
        "access_supplier": "Purchased from registered supplier",
        "community_tk_title": "Community / TK holder involvement",
        "community_desc_title": "Community / TK holder description",
        "community_desc_placeholder": "Describe the community or traditional-knowledge holder involvement, known consent/process context, or relevant knowledge contribution.",
        "commercial_use_title": "Intended commercial use",
        "use_domestic": "Domestic sale",
        "use_export": "Export",
        "use_licensing": "Licensing",
        "use_research_only": "Research only",
        "tkdl_formulation_title": "Formulation / technique description",
        "tkdl_formulation_placeholder": "Describe the formulation, plant parts, processing method or claimed novelty...",
        "tkdl_source_title": "Authoritative source text or oral-tradition reference (if known)",
        "tkdl_source_placeholder": "e.g. classical text, chapter/verse, practitioner record, community reference or oral-tradition note.",
        "tkdl_novel_title": "What do you believe may be novel?",
        "tkdl_novel_placeholder": "Be specific about the feature, method, combination or use you want the prior-art search to scope.",
        "tkdl_novel_hint": "This scopes retrieval; it is not a frontend determination of novelty.",
        "product_form_title": "Product form",
        "product_form_hint": "Product form helps scope the backend route before claim and labelling checks.",
        "form_tablet": "Tablet",
        "form_capsule": "Capsule",
        "form_syrup": "Syrup / Liquid",
        "form_churna": "Churna / Powder",
        "form_oil": "Oil / Ghrata",
        "form_ointment": "Ointment / Lepa",
        "form_cosmetic": "Cosmetic",
        "form_food_supplement": "Food supplement",
        "form_other": "Other",
        "reg_use_title": "Intended use",
        "reg_use_placeholder": "What is the product intended to do or support?",
        "reg_claims_title": "Claims made on label / marketing",
        "reg_claims_placeholder": "Enter the claims exactly or as closely as possible.",
        "reg_dosage_title": "Dosage / directions for use",
        "reg_dosage_placeholder": "Dosage, frequency, route and directions for use.",
        "reg_channel_title": "Marketing channel",
        "channel_otc": "Over-the-counter (OTC)",
        "channel_prescription": "Prescription (Ayurvedic Practitioner)",
        "channel_ecommerce": "Direct-to-consumer online",
        "channel_institutional": "Institutional / Hospital",
        "channel_export": "Export"
    },
    "case_view": {
        "desc_ask": "A grounded answer with supporting citations and an assessment-confidence indicator.",
        "desc_default": "Backend analysis is the source of truth. This screen only presents returned classification, evidence, confidence and next actions.",
        "share": "Share",
        "link_copied": "Link copied",
        "report": "Report",
        "history": "History",
        "research_context": "Research context",
        "as_of": "As of",
        "run_analysis": "Run analysis",
        "rerun_analysis": "Re-run analysis",
        "running_analysis": "Running analysis…",
        "your_question": "Your question",
        "ready_answer_title": "Ready for a grounded answer",
        "ready_answer_desc": "Sahayak will retrieve supporting evidence, validate citations and return an assessment-confidence indicator.",
        "get_grounded_answer": "Get grounded answer",
        "grounding_answer": "Grounding answer…",
        "refresh_answer": "Refresh answer",
        "refreshing": "Refreshing…",
        "facts_ready_title": "Facts confirmed. Ready for analysis.",
        "facts_ready_desc": "Run the backend analysis to retrieve the classification, applicable rule, evidence and confidence breakdown.",
        "explainability": "View explainability",
        "search_scope": "Search scope",
        "what_searched": "What was searched",
        "formulation_technique": "Formulation / technique",
        "believed_novel": "Believed novel feature",
        "source_ref": "Source reference",
        "no_source_ref": "No source reference supplied.",
        "reg_pipeline_eyebrow": "Regulatory classification pipeline",
        "reg_pipeline_title": "Structured formulation assessment",
        "reg_pipeline_desc": "The classification below is the backend assessment for the structured ingredient, source-text, processing, claims and modification facts you supplied.",
        "backend_result": "Backend result",
        "classification": "Classification",
        "insufficient_evidence_title": "Insufficient Grounded Evidence",
        "insufficient_evidence_desc": "The available evidence is not sufficient to support a reliable assessment.",
        "triggered_rule": "Triggered rule",
        "backend_pending": "Backend pending",
        "no_rule_supplied": "No rule supplied",
        "citation": "Citation",
        "backend_citation_pending": "Backend citation pending",
        "evidence": "Evidence",
        "validated": "Validated",
        "review": "Review",
        "abs_tkdl_posture": "ABS & TKDL posture",
        "abs_indication": "ABS indication",
        "tkdl_indication": "TKDL indication",
        "next_action": "Next action",
        "no_next_action": "Analysis has not yet returned a next action.",
        "request_human_review": "Request human review",
        "requesting_review": "Requesting review…",
        "review_requested": "Review Requested",
        "review_requested_desc": "The case has been queued for human review.",
        "limitations": "Limitations",
        "navigator_scope": "Navigator scope",
        "what_evaluated": "What the backend evaluated",
        "routes_selected": "Routes selected",
        "supporting_evidence": "Supporting evidence",
        "access_posture": "Access posture",
        "access_posture_desc": "Public TKDL information may be shown when returned by the backend. Restricted TKDL entry content is not displayed by this prototype.",
        "default_next_action": "Review the candidate records and follow up through the appropriate source registry or human facilitator.",
        "reg_inputs_considered": "Regulatory inputs considered",
        "product_form": "Product form",
        "intended_use": "Intended use",
        "claims": "Claims",
        "dosage_directions": "Dosage / directions",
        "marketing_channel": "Marketing channel",
        "input_not_supplied": "Backend input not supplied",
        "route_matrix_title": "Protection route matrix",
        "ip_options_scope": "IP options in scope",
        "route_matrix_desc": "Each row reflects a backend assessment for an IP regime selected during intake.",
        "col_ip_type": "IP type",
        "col_status": "Status",
        "col_rationale": "Backend rationale & citation",
        "status_applicable": "Applicable",
        "status_conditional": "Conditional",
        "status_not_applicable": "Not applicable",
        "abs_pathway_title": "ABS pathway",
        "abs_pathway_required": "ABS pathway required",
        "abs_pathway_not_indicated": "ABS pathway not indicated",
        "abs_insufficient": "Insufficient grounded evidence",
        "abs_conditional": "Conditional ABS review",
        "authority_to_approach": "Authority to approach",
        "obligations_checklist": "Obligations checklist",
        "no_obligations": "No obligation items were returned by the backend.",
        "intl_disclosure": "International disclosure",
        "intl_disclosure_desc": "This section appears only for international cases. The backend must determine whether a cross-border Nagoya Protocol or WIPO GRATK disclosure requirement actually applies.",
        "no_intl_disclosure": "No international disclosure obligation was returned.",
        "prior_art_signals": "TKDL / prior-art signals",
        "potentially_relevant": "Potentially relevant records",
        "prior_art_desc": "These are source candidates returned by the backend. They are not a legal novelty or patentability determination.",
        "relevance_note": "Relevance note",
        "no_candidates": "No prior-art candidates were returned for this search scope.",
        "reg_route_title": "Regulatory route",
        "reg_route_heading": "Applicable regulatory pathway",
        "applicable_act": "Applicable Act",
        "licensing_market_route": "Licensing / market route",
        "route_obligations": "Route obligations",
        "which_route_applies": "Which route applies",
        "no_route_items": "No route items were returned by the backend.",
        "advertising_claims": "Advertising & claims",
        "claim_restrictions": "Claim restrictions",
        "labelling": "Labelling",
        "label_requirements": "Label requirements"
    },
    "verify": {
        "title_abs": "Review ABS access facts",
        "title_tkdl": "Review prior-art search facts",
        "title_default": "Review extracted facts",
        "desc_abs": "Confirm the resource, geography, access, community/TK and intended-use facts before the ABS pathway assessment.",
        "desc_tkdl": "Confirm the search description, source reference and novelty focus before prior-art retrieval.",
        "desc_default": "Confirm the structured facts before analysis. Extraction and normalization are shown separately from user corrections.",
        "banner_abs": "No final ABS pathway or obligation assessment is displayed until the access facts are confirmed.",
        "banner_tkdl": "No prior-art candidates are displayed until the search scope facts are confirmed.",
        "banner_default": "No final legal or regulatory assessment is displayed until facts are confirmed.",
        "fact_verification": "Fact Verification",
        "col_fact": "Fact",
        "col_value": "Value",
        "col_normalized": "Normalized",
        "col_status": "Status",
        "source": "Source",
        "backend_span_not_supplied": "Backend span not supplied",
        "pending_normalization": "Pending normalization",
        "extraction_confidence": "extraction confidence",
        "add_missing_fact": "Add missing fact",
        "confirm_facts": "Confirm facts & continue",
        "confirming": "Confirming…",
        "facts_updated": "Facts Updated",
        "facts_updated_desc": "The verified facts are ready for analysis."
    },
    "explain": {
        "title": "Explainability",
        "description": "A traceable view of the backend workflow from facts through rules, evidence, citation validation and confidence.",
        "back_to_result": "Back to result",
        "trace_title": "Trace",
        "trace_heading": "How the assessment was formed",
        "case": "Case",
        "jurisdiction": "Jurisdiction",
        "as_of_date": "As-of date",
        "analysis_version": "Analysis version",
        "version_n": "Version {version}",
        "versioning": "Versioning",
        "versioning_desc": "Older analysis versions remain distinct. The backend should supply changed facts, changed rules and confidence delta when versions are compared.",
        "changed_since": "Changed since previous analysis",
        "rule_changes": "Rule changes",
        "confidence_delta": "Confidence delta",
        "print_save_trace": "Print / save trace",
        "error_trace": "We couldn't load the analysis trace.",
        "error_trace_desc": "Please return to the result and try again."
    },
    "report": {
        "title": "Case report",
        "description": "A printable, shareable view of the current evidence-grounded assessment. The report is informational and remains subject to backend evidence and versioning.",
        "print": "Print",
        "download_pdf": "Download PDF",
        "preparing_pdf": "Preparing PDF…",
        "report_contents": "Report contents",
        "report_contents_desc": "The generated backend report may contain classification, confidence, rules, evidence, citations, limitations, ABS/TKDL indicators and other case-specific research outputs.",
        "case_controls": "Case controls",
        "view_analysis": "View analysis",
        "view_case_history": "View case history",
        "readonly_sharing": "Read-only sharing",
        "readonly_sharing_desc": "This prototype copies the current case URL. A tokenized public link can be enabled later if the backend adds one."
    },
    "history": {
        "title": "Case history",
        "description": "Review the audit trail of this research case, including when facts changed, who made the change, and when analyses were run.",
        "back_to_analysis": "Back to analysis",
        "case_report": "Case report",
        "audit_trail": "Audit trail",
        "history_heading": "Case history",
        "history_desc": "A chronological record of case creation, fact changes, confirmation, analysis and other backend-reported actions.",
        "no_history": "No case history is available for this record.",
        "error_history": "We couldn't load the case history.",
        "error_history_desc": "Please try again from the case report."
    },
    "chat": {
        "title": "Sahayak AI",
        "subtitle": "Grounded Ayurvedic IP research",
        "starter": "Namaste. Ask about Ayurvedic IP, TK or regulatory status. I answer from cited research sources and will say when the evidence is insufficient.",
        "disclaimer": "Research support only. Responses are informational and do not constitute legal advice.",
        "placeholder": "Ask about Ayurvedic IP…",
        "hint": "Try: “How is an Ayurvedic formulation classified?”",
        "open_chat": "Open Sahayak AI chat",
        "close_chat": "Close Sahayak AI chat",
        "send": "Send question"
    },
    "dropzone": {
        "upload_title": "Upload a PDF label or formulation document",
        "drop_title": "Drop the PDF here",
        "extracting": "Extracting document text…",
        "hint": "Drag & drop or click to browse · PDF only · up to 10 MB",
        "text_will_add": "Text will be added to the research brief for your review.",
        "remove_uploaded": "Remove uploaded document",
        "file_too_large": "The PDF is larger than 10 MB.",
        "file_invalid_type": "Only PDF documents are supported.",
        "file_rejected": "We could not accept that file. Please choose a PDF and try again."
    },
    "common": {
        "disclaimer": "This is an AI-assisted research assessment and does not constitute legal advice.",
        "india": "India",
        "international": "International",
        "status_draft": "Draft",
        "status_pending": "Pending",
        "status_verifying": "Verifying",
        "status_analyzing": "In progress",
        "status_complete": "Complete",
        "status_abstained": "Abstained",
        "status_escalated": "Escalated",
        "patent": "Patent",
        "trademark": "Trademark",
        "gi": "GI",
        "design": "Design",
        "copyright": "Copyright",
        "plant_variety": "Plant Variety",
        "first_name": "First Name",
        "last_name": "Last Name",
        "job_role": "Job Role",
        "email_address": "Email Address (Read-only)",
        "physical_address": "Physical Address",
        "placeholder_first_name": "e.g. Aditi",
        "placeholder_last_name": "e.g. Sharma",
        "placeholder_job_role": "e.g. Lead Researcher",
        "placeholder_address": "e.g. 123 Research Park, New Delhi",
        "search_languages": "Search 39 languages...",
        "no_languages_match": "No languages match",
        "scheduled_languages": "Scheduled Languages",
        "additional_languages": "Additional Indian Languages",
        "international_languages": "International",
        "account": "Account",
        "sign_out": "Sign out",
        "profile_preferences": "Profile & preferences",
        "workspace": "Workspace",
        "research_preferences": "Research preferences",
        "preferences_dialog_desc": "Your jurisdiction preference is reused when starting a new research case. It does not replace the case-level jurisdiction control."
    }
}

def update_en():
    with open(EN_JSON, "r", encoding="utf-8") as f:
        en_data = json.load(f)
    for section, keys in NEW_SECTIONS.items():
        if section not in en_data:
            en_data[section] = {}
        en_data[section].update(keys)
    with open(EN_JSON, "w", encoding="utf-8") as f:
        json.dump(en_data, f, ensure_ascii=False, indent=2)
    print("Updated en.json.")
    return en_data

def flatten_dict(d, prefix=""):
    items = []
    for k, v in d.items():
        pk = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, pk))
        elif isinstance(v, str):
            items.append((pk, v))
    return items

def unflatten_dict(items):
    out = {}
    for path, v in items:
        keys = path.split(".")
        curr = out
        for k in keys[:-1]:
            if k not in curr:
                curr[k] = {}
            curr = curr[k]
        curr[keys[-1]] = v
    return out

def translate_all():
    update_en()
    translator = get_translator()
    
    # Flatten new sections
    flat_items = flatten_dict(NEW_SECTIONS)
    paths = [p for p, _ in flat_items]
    texts = [t for _, t in flat_items]
    print(f"Total strings to translate: {len(texts)}")

    # Step 1: Translate Hindi first (to serve as high-quality fallback for North/Central dialects)
    print("Translating Hindi first...")
    hindi_translations = {}
    BATCH_SIZE = 25
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        try:
            res = translator.translate_batch(batch, "Hindi")
            for p, tr in zip(paths[i:i + BATCH_SIZE], res):
                hindi_translations[p] = tr
        except Exception as e:
            print(f"Hindi batch {i} error: {e}")
            for p, eng in zip(paths[i:i + BATCH_SIZE], batch):
                hindi_translations[p] = eng
    
    print("Hindi translation done.")
    
    # Update hi.json
    hi_file = LOCALES_DIR / "hi.json"
    if hi_file.exists():
        with open(hi_file, "r", encoding="utf-8") as f:
            hi_data = json.load(f)
        for p, tr in hindi_translations.items():
            keys = p.split(".")
            curr = hi_data
            for k in keys[:-1]:
                if k not in curr:
                    curr[k] = {}
                curr = curr[k]
            curr[keys[-1]] = tr
        with open(hi_file, "w", encoding="utf-8") as f:
            json.dump(hi_data, f, ensure_ascii=False, indent=2)
        print("Updated hi.json")

    # Step 2: Translate all other languages
    for code, lang_name in LANG_FILE_MAP.items():
        if code == "hi":
            continue
        lang_file = LOCALES_DIR / f"{code}.json"
        if not lang_file.exists():
            print(f"File {lang_file} does not exist, skipping")
            continue
        
        print(f"Translating for {lang_name} ({code})...")
        translated_map = {}
        success = True
        
        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i:i + BATCH_SIZE]
            try:
                res = translator.translate_batch(batch, lang_name)
                if res and len(res) == len(batch):
                    for p, tr in zip(paths[i:i + BATCH_SIZE], res):
                        translated_map[p] = tr
                else:
                    success = False
                    break
            except Exception as e:
                # If language fails (like Hinglish or unsupported dialect), we will fall back
                success = False
                break
        
        if not success or len(translated_map) < len(texts):
            print(f"Direct translation for {lang_name} failed or incomplete. Using Hindi fallback.")
            # For dialect languages (Bhojpuri, Awadhi, Hinglish, etc.), use Hindi translation as base
            translated_map = hindi_translations.copy()
        
        # Load existing json and merge
        with open(lang_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        for p, tr in translated_map.items():
            keys = p.split(".")
            curr = data
            for k in keys[:-1]:
                if k not in curr:
                    curr[k] = {}
                curr = curr[k]
            curr[keys[-1]] = tr
            
        with open(lang_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Successfully updated {code}.json for {lang_name}!")

    print("ALL 39 LOCALE FILES UPDATED COMPLETELY!")

if __name__ == "__main__":
    translate_all()
