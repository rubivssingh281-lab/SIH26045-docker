export const toolKeys = ["ask", "ip-navigator", "formulation-classifier", "abs", "tkdl", "regulatory"] as const;
export type ToolKey = (typeof toolKeys)[number];

export const toolConfig = {
  ask: {
    eyebrow: "Sahayak research",
    title: "Ask Sahayak",
    description: "Ask anything about Ayurvedic IP, TK or regulatory status — Sahayak answers from cited sources only.",
    prompt: "e.g. Can a modified Ayurvedic formulation be protected by a patent in India?",
    sidebarTitle: "How this answer is grounded",
    sidebarItems: [
      "Retrieved statute, rule or treaty passages",
      "Inline citations for supporting evidence",
      "Assessment confidence for the answer",
      "Escalation path when evidence is insufficient"
    ]
  },
  "ip-navigator": {
    eyebrow: "IP Navigator", title: "Map the right IP protection path",
    description: "Separate what is genuinely novel from what comes from traditional knowledge, then scope the IP regimes worth evaluating.",
    prompt: "Summarize the product, how it is made, and the business context.",
    sidebarTitle: "What Sahayak checks",
    sidebarItems: [
      "Novelty vs. traditional-knowledge boundary",
      "Section 3(p) patentability bar check",
      "GI, trade mark, design and copyright applicability",
      "TKDL defensive-publication exposure"
    ]
  },
  "formulation-classifier": {
    eyebrow: "Formulation classifier", title: "Classify an Ayurvedic formulation",
    description: "Classify the formulation using checkable ingredient, source-text, processing, claims and modification facts. The backend determines the supported regulatory category and evidence requirements.",
    prompt: "Add any context that does not fit the structured classification fields above...",
    sidebarTitle: "What Sahayak checks",
    sidebarItems: ["First-Schedule text match", "Degree of modification from the classical formula", "Safety / efficacy evidence requirement trigger", "Applicable category evidence bar"]
  },
  abs: {
    eyebrow: "ABS compliance", title: "Prepare a biodiversity / ABS research case",
    description: "Capture biological resources, source location, access context and intended commercial use so the backend can assess the relevant ABS pathway.",
    prompt: "Describe the biological resource, where it was accessed, its source/community context and intended use...",
    sidebarTitle: "What Sahayak checks",
    sidebarItems: ["Biological-resource facts", "Source and access context", "Jurisdiction-specific ABS rules", "Evidence and escalation"]
  },
  tkdl: {
    eyebrow: "TKDL / prior art", title: "Investigate traditional knowledge and prior art",
    description: "Surface TKDL and public prior-art signals relevant to a patentability or novelty question. This tool returns source candidates rather than a patentability verdict.",
    prompt: "Add any context about the technique, traditional use or search scope...",
    sidebarTitle: "What Sahayak checks",
    sidebarItems: ["Public TKDL entries", "Restricted-access TKDL entries — notice only", "Patent / publication prior-art candidates", "Source relevance and access status"]
  },
  regulatory: {
    eyebrow: "Regulatory pathway", title: "Map the product's regulatory pathway",
    description: "Capture product form, intended use, label claims, dosage and marketing channel so the backend can map the applicable drug, advertising or food/cosmetic route.",
    prompt: "Add any product facts that do not fit the structured regulatory fields above...",
    sidebarTitle: "What Sahayak checks",
    sidebarItems: ["Which Act governs: Drugs & Cosmetics / Magic Remedies / FSSAI", "Advertising-claim restrictions triggered", "Labelling and presentation requirements", "Licensing route and evidence needed"]
  }
} as const;
