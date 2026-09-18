import type { AbsAssessment, Analysis, Case, ExplainabilityTrace, Fact } from "@/types";

const commonHistory = [
  { id: "h1", type: "CREATED" as const, title: "Case created", description: "Research case created from the formulation brief.", actor: "Researcher", occurred_at: "2026-08-22T09:30:00Z", version: 1 },
  { id: "h2", type: "FACTS_MODIFIED" as const, title: "Facts modified", description: "Dosage-related fact was corrected during verification.", actor: "Researcher", occurred_at: "2026-08-26T10:10:00Z", version: 2 },
  { id: "h3", type: "FACTS_CONFIRMED" as const, title: "Facts confirmed", description: "Verified facts were confirmed for analysis.", actor: "Researcher", occurred_at: "2026-08-26T10:18:00Z", version: 2 },
  { id: "h4", type: "ANALYZED" as const, title: "Case analyzed", description: "Evidence retrieval, rule evaluation and confidence scoring completed.", actor: "IP-SAKTI Sahayak", occurred_at: "2026-08-27T11:15:00Z", version: 2 },
];


const mockIpRoutes = [
  { ip_type: "Patent" as const, status: "CONDITIONAL" as const, citation: "Backend citation required", rationale: "Potential route where the claimed feature is sufficiently new and not excluded by the backend patentability screen." },
  { ip_type: "GI" as const, status: "CONDITIONAL" as const, citation: "Backend citation required", rationale: "Route depends on whether the product is tied to the required geographic origin and qualifying characteristics." },
  { ip_type: "Trademark" as const, status: "APPLICABLE" as const, citation: "Backend citation required", rationale: "A source-validated brand or distinctive sign may be evaluated separately from the underlying traditional knowledge." },
  { ip_type: "Design" as const, status: "NOT_APPLICABLE" as const, citation: "Backend citation required", rationale: "No design-specific representation has been supplied in this prototype case context." },
  { ip_type: "Copyright" as const, status: "CONDITIONAL" as const, citation: "Backend citation required", rationale: "Potentially relevant to original expression or documentation, not to an underlying idea or traditional knowledge itself." },
  { ip_type: "Plant Variety" as const, status: "NOT_APPLICABLE" as const, citation: "Backend citation required", rationale: "No plant-variety breeding or variety-right facts have been supplied for this prototype assessment." }
];


export const mockAbsAssessment: AbsAssessment = {
  pathway_status: "CONDITIONAL_REVIEW",
  authority: "Relevant biodiversity authority — backend determination required",
  summary: "The structured access facts indicate that an ABS review may be relevant. The final pathway and authority must come from the backend evidence and rule engine.",
  obligations: [
    { title: "Authority / approval review", status: "CONDITIONAL", details: "Check whether the access facts and intended use trigger an approval, intimation or other authority process.", authority: "NBA / relevant State Biodiversity Board", citation: "Backend citation required" },
    { title: "Benefit-sharing review", status: "CONDITIONAL", details: "Assess whether benefit-sharing obligations apply to the resource, access context and intended use.", authority: "NBA / relevant State Biodiversity Board", citation: "Backend citation required" }
  ],
  disclosure_obligations: [
    { title: "Nagoya / GRATK cross-border disclosure", status: "REVIEW", details: "This international-only item is shown because the case jurisdiction is international; the backend must determine the actual disclosure requirement.", citation: "Backend treaty/provision citation required" }
  ]
};

export const mockCases: Case[] = [
  {
    id: "case-2026-005",
    title: "Neem Community-Sourced Botanical Review",
    description: "ABS access review using structured biological-resource and community context.",
    as_of_date: "2026-08-27",
    jurisdiction: "INDIA",
    status: "COMPLETE",
    classification: "ABS review",
    confidence: { fact_conf: .9, rule_fit_conf: .86, evidence_conf: .83, citation_conf: .84, overall_conf: .86, band: "HIGH" },
    created_at: "2026-08-19T08:50:00Z",
    updated_at: "2026-08-27T12:30:00Z",
    version: 1,
    tool: "abs",
    tool_input: {
      biological_resources: [{ name: "Neem (Azadirachta indica) leaves" }, { name: "Neem seed material" }],
      source_origin_location: "Uttar Pradesh, India",
      access_context: "community-sourced",
      community_tk_involvement: "yes",
      community_tk_description: "Community-held traditional use information supplied by the researcher.",
      intended_commercial_use: "licensing"
    },
    history: [
      { id: "h13", type: "CREATED", title: "Case created", description: "Structured ABS access-review case created.", actor: "Researcher", occurred_at: "2026-08-19T08:50:00Z", version: 1 },
      { id: "h14", type: "FACTS_CONFIRMED", title: "ABS facts confirmed", description: "Resource, origin, access context and community information were confirmed.", actor: "Researcher", occurred_at: "2026-08-27T12:10:00Z", version: 1 },
      { id: "h15", type: "ANALYZED", title: "ABS pathway reviewed", description: "The backend generated an ABS pathway and obligations assessment.", actor: "IP-SAKTI Sahayak", occurred_at: "2026-08-27T12:30:00Z", version: 1 }
    ]
  },
  {
    id: "case-2026-004",
    title: "Ashwagandha Classical Formula Review",
    description: "Structured formulation classification case using ingredient-level references and intended-use claims.",
    as_of_date: "2026-08-27",
    jurisdiction: "INDIA",
    status: "COMPLETE",
    classification: "Classical",
    confidence: { fact_conf: .94, rule_fit_conf: .93, evidence_conf: .9, citation_conf: .89, overall_conf: .92, band: "HIGH" },
    created_at: "2026-08-21T09:00:00Z",
    updated_at: "2026-08-27T14:25:00Z",
    version: 1,
    tool: "formulation-classifier",
    tool_input: {
      ingredients: [
        { name: "Ashwagandha root", source_text_reference: "Charaka Samhita, Chikitsa Sthana — reference supplied by researcher" },
        { name: "Ghee", source_text_reference: "Classical formulation reference — researcher supplied" }
      ],
      first_schedule_text_match: "yes",
      processing_method: "Powdering and traditional preparation with ghee.",
      intended_use_and_claims: "Traditional Ayurvedic therapeutic use; claims to be assessed by the backend.",
      modifications_from_classical: "No material modification reported."
    },
    history: [
      { id: "h10", type: "CREATED", title: "Case created", description: "Structured formulation-classification case created.", actor: "Researcher", occurred_at: "2026-08-21T09:00:00Z", version: 1 },
      { id: "h11", type: "FACTS_CONFIRMED", title: "Facts confirmed", description: "Ingredient and formulation facts were confirmed for classification.", actor: "Researcher", occurred_at: "2026-08-27T13:55:00Z", version: 1 },
      { id: "h12", type: "ANALYZED", title: "Classification completed", description: "Backend classification and evidence confidence assessment were generated.", actor: "IP-SAKTI Sahayak", occurred_at: "2026-08-27T14:25:00Z", version: 1 }
    ]
  },
  {
    id: "case-2026-001",
    title: "Turmeric-Derived Curcuminoid Formulation",
    description: "Assessment of a modified turmeric-derived formulation and its prior-art, biodiversity and regulatory pathway.",
    as_of_date: "2026-08-27",
    jurisdiction: "INDIA",
    status: "ANALYZING",
    classification: "Classical",
    confidence: { fact_conf: .85, rule_fit_conf: 1, evidence_conf: .9, citation_conf: .8, overall_conf: .8, band: "HIGH" },
    created_at: "2026-08-22T09:30:00Z",
    updated_at: "2026-08-27T11:15:00Z",
    version: 2,
    changed_facts: ["Dosage modification"],
    changed_rules: ["R-3P-02"],
    confidence_delta: .04,
    tool: "ip-navigator",
    tool_input: { novelty: "Modified dosage profile", traditional_knowledge: "Turmeric-based Ayurvedic use", ip_types: ["Patent", "GI", "Trademark", "Design", "Copyright", "Plant Variety"], commercialization_stage: "research" },
    history: commonHistory
  },
  {
    id: "case-2026-002",
    title: "Ashwagandha Extract — Stress Relief",
    description: "Formulation classification and evidence review.",
    as_of_date: "2026-08-25",
    jurisdiction: "INDIA",
    status: "COMPLETE",
    classification: "Proprietary",
    confidence: { fact_conf: .91, rule_fit_conf: .88, evidence_conf: .86, citation_conf: .92, overall_conf: .89, band: "HIGH" },
    created_at: "2026-08-18T10:20:00Z",
    updated_at: "2026-08-25T16:40:00Z",
    version: 1,
    history: [
      { id: "h5", type: "CREATED", title: "Case created", description: "Research case created from the formulation brief.", actor: "Researcher", occurred_at: "2026-08-18T10:20:00Z", version: 1 },
      { id: "h8", type: "FACTS_CONFIRMED", title: "Facts confirmed", description: "Verified formulation facts were confirmed for analysis.", actor: "Researcher", occurred_at: "2026-08-22T14:05:00Z", version: 1 },
      { id: "h9", type: "ANALYZED", title: "Case analyzed", description: "Research evidence and confidence assessment were generated.", actor: "IP-SAKTI Sahayak", occurred_at: "2026-08-25T16:40:00Z", version: 1 }
    ]
  },
  {
    id: "case-2026-003",
    title: "Neem & Aloe Vera Skin Ointment",
    description: "Traditional-knowledge overlap and cosmetic/drug boundary review.",
    as_of_date: "2026-08-20",
    jurisdiction: "INTERNATIONAL",
    status: "ABSTAINED",
    classification: "Insufficient evidence",
    confidence: { fact_conf: .52, rule_fit_conf: .41, evidence_conf: .37, citation_conf: .55, overall_conf: .44, band: "INSUFFICIENT" },
    created_at: "2026-08-17T12:05:00Z",
    updated_at: "2026-08-20T13:12:00Z",
    version: 1,
    history: [
      { id: "h6", type: "CREATED", title: "Case created", description: "International research case created.", actor: "Researcher", occurred_at: "2026-08-17T12:05:00Z", version: 1 },
      { id: "h7", type: "ANALYZED", title: "Assessment abstained", description: "The evidence set was insufficient for a reliable grounded assessment.", actor: "IP-SAKTI Sahayak", occurred_at: "2026-08-20T13:12:00Z", version: 1 }
    ]
  }
];

export const mockFacts: Fact[] = [
  { id: "f1", field: "Product / formulation name", value: "Turmeric-Derived Curcuminoid Formulation", normalized_value: "Curcuma longa-derived curcuminoid formulation", status: "NORMALIZED", confidence: .94, source_span: "Turmeric-derived curcuminoid formulation", user_editable: true },
  { id: "f2", field: "Primary ingredient", value: "Turmeric", normalized_value: "Curcuma longa", status: "CONFIRMED", confidence: .98, source_span: "turmeric", user_editable: true },
  { id: "f3", field: "Modification", value: "Modified dosage profile", normalized_value: "dosage modification", status: "USER_CORRECTED", confidence: .79, source_span: "modified dosage", user_editable: true },
  { id: "f4", field: "Intended use", value: "Ayurvedic therapeutic use", normalized_value: "therapeutic medicinal use", status: "EXTRACTED", confidence: .84, source_span: "therapeutic formulation", user_editable: true }
];

export const mockAnalysis: Analysis = {
  classification: "Classical",
  confidence: { fact_conf: .85, rule_fit_conf: 1, evidence_conf: .9, citation_conf: .8, overall_conf: .8, band: "HIGH" },
  applicable_rule: {
    id: "R-3P-02",
    title: "Traditional-knowledge patentability screening",
    citation: "Patents Act 1970, Section 3(p)",
    summary: "The backend rule engine flagged the supplied traditional-knowledge relationship for statutory screening."
  },
  evidence: [
    { id: "e1", title: "Illustrative statutory evidence", source_type: "Mock statute record", citation: "Backend citation required", excerpt: "This development record is a UI placeholder. A real backend response must supply the authoritative statute citation and evidence text.", jurisdiction: "INDIA", validated: true },
    { id: "e2", title: "TK / prior-art access notice", source_type: "Prototype access state", citation: "Restricted source access", excerpt: "No unrestricted TKDL result is asserted by this prototype; a backend-controlled public information pointer may be shown when available.", jurisdiction: "INDIA", validated: true }
  ],
  jurisdiction: "INDIA",
  as_of_date: "2026-08-27",
  abs_indication: "Backend assessment indicates that biodiversity / ABS review may be relevant; authoritative applicability must come from the analysis service.",
  tkdl_indication: "Restricted TKDL access — not available in this prototype.",
  next_action: "Review the cited evidence and, where necessary, escalate to an IP facilitator.",
  limitations: ["Prototype mock evidence is displayed for UI development.", "The frontend does not independently determine legal applicability."],
  prior_art: [
    { id: "p1", title: "Illustrative prior-art candidate", source: "Mock registry pointer", relevance: "UI placeholder only; backend verification required." },
    { id: "p2", title: "Illustrative traditional-knowledge pointer", source: "Mock traditional-knowledge source", relevance: "UI placeholder only; not a verified TKDL result." }
  ],
  result_type: "RESULT",
  ip_routes: mockIpRoutes
};

export const mockTrace: ExplainabilityTrace = {
  steps: [
    { title: "User Input", status: "success", details: "Case description received and associated with the case record." },
    { title: "Extracted Facts", status: "success", details: "Found 4 facts with 85% confidence." },
    { title: "User Corrections", status: "success", details: "One dosage-related fact was corrected by the user." },
    { title: "Rules Triggered", status: "success", details: "Triggered R-3P-02 based on the backend fact set." },
    { title: "Statutory Provision", status: "success", details: "Backend supplied Patents Act 1970, Section 3(p)." },
    { title: "Supporting Evidence", status: "success", details: "Two evidence records were returned." },
    { title: "Citation Validation", status: "success", details: "Returned citations are marked validated by the backend response." },
    { title: "Confidence Breakdown", status: "success", details: "Overall assessment confidence: 0.80 (HIGH)." },
    { title: "Explanation", status: "success", details: "The result is presented as an evidence-grounded research assessment." },
    { title: "Next Action", status: "warning", details: "Review evidence and escalate when the case requires human IP-facilitator review." }
  ]
};