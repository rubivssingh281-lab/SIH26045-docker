export type Jurisdiction = "INDIA" | "INTERNATIONAL";
export type CaseStatus = "DRAFT" | "PENDING" | "VERIFYING" | "ANALYZING" | "COMPLETE" | "ABSTAINED" | "ESCALATED";
export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
export type FactStatus = "EXTRACTED" | "NORMALIZED" | "USER_CORRECTED" | "CONFIRMED";
export type ResearchTool = "ask" | "ip-navigator" | "formulation-classifier" | "abs" | "tkdl" | "regulatory";
export type CaseHistoryEventType = "CREATED" | "FACTS_MODIFIED" | "FACTS_CONFIRMED" | "ANALYZED" | "REPORT_GENERATED" | "ESCALATED" | "NOTE";

export interface CaseHistoryEvent {
  id: string;
  type: CaseHistoryEventType;
  title: string;
  description: string;
  actor: string;
  occurred_at: string;
  version?: number;
}


export interface FormulationIngredientInput {
  name: string;
  source_text_reference: string;
}

export interface FormulationClassifierInput {
  ingredients: FormulationIngredientInput[];
  first_schedule_text_match: "yes" | "no" | "unsure";
  processing_method: string;
  intended_use_and_claims: string;
  modifications_from_classical: string;
}

export interface AbsResourceInput {
  name: string;
}

export type AbsAccessContext = "wild-collected" | "cultivated" | "community-sourced" | "purchased-from-registered-supplier";
export type AbsCommercialUse = "domestic-sale" | "export" | "licensing" | "research-only";

export interface AbsComplianceInput {
  biological_resources: AbsResourceInput[];
  source_origin_location: string;
  access_context: AbsAccessContext;
  community_tk_involvement: "yes" | "no";
  community_tk_description: string;
  intended_commercial_use: AbsCommercialUse;
}

export interface AbsObligationItem {
  title: string;
  status: "REQUIRED" | "NOT_REQUIRED" | "CONDITIONAL" | "REVIEW";
  details: string;
  authority?: string;
  citation?: string;
}

export interface AbsAssessment {
  pathway_status: "PATHWAY_REQUIRED" | "PATHWAY_NOT_REQUIRED" | "CONDITIONAL_REVIEW" | "INSUFFICIENT";
  authority: string;
  obligations: AbsObligationItem[];
  disclosure_obligations: AbsObligationItem[];
  summary: string;
}


export type RegulatoryProductForm = "tablet" | "oil" | "powder" | "cosmetic" | "food-supplement";
export type RegulatoryMarketingChannel = "otc" | "prescription" | "e-commerce" | "export";
export interface RegulatoryPathwayInput {
  product_form: RegulatoryProductForm;
  intended_use: string;
  claims: string;
  dosage_directions: string;
  marketing_channel: RegulatoryMarketingChannel;
}
export interface RegulatoryRouteItem {
  title: string;
  status: "APPLICABLE" | "CONDITIONAL" | "NOT_INDICATED" | "REVIEW";
  details: string;
  authority?: string;
  citation?: string;
}
export interface RegulatoryAssessment {
  applicable_act: string;
  licensing_route: string;
  claim_restrictions: RegulatoryRouteItem[];
  labelling_requirements: RegulatoryRouteItem[];
  route_items: RegulatoryRouteItem[];
}

export interface Case {
  id: string;
  title: string;
  description: string;
  as_of_date: string;
  jurisdiction: Jurisdiction;
  status: CaseStatus;
  classification?: string;
  confidence?: ConfidenceScore;
  created_at: string;
  updated_at: string;
  version: number;
  changed_facts?: string[];
  changed_rules?: string[];
  confidence_delta?: number;
  history?: CaseHistoryEvent[];
  tool?: ResearchTool;
  tool_input?: Record<string, unknown>;
  analysis?: Analysis | null;
}

export interface Fact {
  id: string;
  field: string;
  value: string;
  normalized_value?: string;
  status: FactStatus;
  confidence: number;
  source_span?: string;
  user_editable: boolean;
}

export interface ConfidenceScore {
  fact_conf: number;
  rule_fit_conf: number;
  evidence_conf: number;
  citation_conf: number;
  overall_conf: number;
  band: ConfidenceBand;
}

export interface Rule {
  id: string;
  title: string;
  citation: string;
  summary: string;
}

export interface Evidence {
  id: string;
  title: string;
  source_type: string;
  citation: string;
  excerpt: string;
  jurisdiction: Jurisdiction;
  validated: boolean;
}

export interface PriorArtCandidate {
  id: string;
  title: string;
  source: string;
  relevance: string;
  access_status?: "PUBLIC" | "RESTRICTED";
  access_note?: string;
}

export interface GroundedCitation {
  title: string;
  citation: string;
  excerpt: string;
  validated: boolean;
  source_url?: string;
}

export interface GroundedAnswer {
  answer: string;
  citations: GroundedCitation[];
  confidence: ConfidenceScore;
}

export type IpRouteStatus = "APPLICABLE" | "NOT_APPLICABLE" | "CONDITIONAL";

export interface IpRouteAssessment {
  ip_type: "Patent" | "GI" | "Trademark" | "Design" | "Copyright" | "Plant Variety";
  status: IpRouteStatus;
  citation: string;
  rationale: string;
}

export interface Analysis {
  classification: string;
  confidence: ConfidenceScore;
  applicable_rule?: Rule;
  evidence: Evidence[];
  jurisdiction: Jurisdiction;
  as_of_date: string;
  abs_indication: string;
  tkdl_indication: string;
  next_action: string;
  limitations: string[];
  prior_art: PriorArtCandidate[];
  result_type: "RESULT" | "CLARIFICATION" | "ABSTENTION" | "ESCALATION";
  ip_routes?: IpRouteAssessment[];
  abs_assessment?: AbsAssessment;
  regulatory_assessment?: RegulatoryAssessment;
}

// --- Jurisdiction Diff ---
export type JurisdictionConcern = "LOW" | "MODERATE" | "HIGH" | "INSUFFICIENT";

export interface JurisdictionEvidence {
  source_title: string;
  source_type: string;
  jurisdiction: string;
  source_url: string;
  relevance: string;
  retrieval_score: number;
}

export interface JurisdictionOfficialSource {
  source_title: string;
  source_type: string;
  jurisdiction: string;
  source_url: string;
}

export interface JurisdictionDifference {
  area: string;
  india: string;
  india_citation: string;
  international: string;
  international_citation: string;
}

export interface JurisdictionIndiaResult {
  risk_category: JurisdictionConcern;
  risk_score: number | null;
  ml_score_note: string;
  evidence_strength: string;
  considerations: string[];
  evidence: JurisdictionEvidence[];
  confidence: ConfidenceBand;
  confidence_detail: ConfidenceScore;
  official_sources: JurisdictionOfficialSource[];
}

export interface JurisdictionInternationalResult {
  risk_category: "COUNTRY_DEPENDENT";
  risk_score: null;
  ml_score_note: string;
  evidence_strength: string;
  considerations: string[];
  evidence: JurisdictionEvidence[];
  confidence: string;
  official_sources: JurisdictionOfficialSource[];
}

export interface JurisdictionDiff {
  success: boolean;
  query: string;
  formulation: string;
  ingredients: string[];
  india: JurisdictionIndiaResult;
  international: JurisdictionInternationalResult;
  differences: JurisdictionDifference[];
  common_considerations: string[];
  evidence: JurisdictionEvidence[];
  confidence: ConfidenceBand;
  limitations: string[];
  last_verified: string;
  disclaimer: string;
  ai_unavailable: boolean;
  what_changes: { india: string; international: string; main_difference: string };
}

// --- Knowledge graph + agent ---
export interface GraphNode {
  id: string;
  type: string;
  label: string;
  jurisdiction: string;
  citation: string;
  url: string;
  summary: string;
  verified: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  note?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  version?: string;
  last_verified?: string;
}

export interface AgentCitation {
  ref: string;
  source_title: string;
  citation: string;
  source_url: string;
  type: "graph" | "evidence";
  validated: boolean;
}

export interface AgentClassification {
  category_id: string | null;
  label: string | null;
  citation: string;
  summary?: string;
  candidates: string[];
  matched: boolean;
}

export interface AgentGraphFact {
  ref: string;
  relation: string;
  node_id: string;
  statement: string;
  label: string;
  type: string;
  citation: string;
  url: string;
  verified: boolean;
}

export interface AgentEvidence {
  ref: string;
  title: string;
  excerpt: string;
  citation: string;
  url: string;
  score: number;
}

export interface AgentRadarAxis {
  key: string;
  label: string;
  score: number;
}

export interface AgentResult {
  success: boolean;
  query: string;
  jurisdiction: "India" | "International";
  classification: AgentClassification;
  radar: AgentRadarAxis[];
  answer: string;
  abstained: boolean;
  ai_unavailable: boolean;
  graph_facts: AgentGraphFact[];
  evidence: AgentEvidence[];
  citations: AgentCitation[];
  subgraph: GraphData;
  confidence: ConfidenceScore;
  trace: ExplainabilityTrace;
  escalation: string;
  disclaimer: string;
}

// --- Paid connectors ---
export interface Connector {
  id: string;
  name: string;
  provider: string;
  base_url: string;
  auth_type: "bearer" | "header";
  header_name: string;
  enabled: boolean;
  consent: boolean;
  key_masked: string;
  created_at: string;
  last_tested: string | null;
  last_status: string | null;
}

export interface ConnectorAuditEvent {
  time: string;
  action: string;
  connector: string;
  detail: string;
}

export interface ExplainabilityItem {
  label: string;
  value?: string;
  meta?: string;
}

export interface ExplainabilityStep {
  title: string;
  status: "success" | "warning" | "pending" | "error";
  details: string;
  items?: ExplainabilityItem[];
}

export interface ExplainabilityTrace {
  steps: ExplainabilityStep[];
}

export interface EscalationRecord {
  id: string;
  reason: string;
  status: "REQUESTED" | "QUEUED" | "ASSIGNED";
  created_at: string;
}
export * from "./auth";
