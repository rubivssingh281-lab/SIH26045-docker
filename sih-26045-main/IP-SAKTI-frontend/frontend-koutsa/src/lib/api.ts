import axios from "axios";
import type { AgentResult, Analysis, AuthResponse, AuthUser, Case, CaseHistoryEvent, Connector, ConnectorAuditEvent, ExplainabilityTrace, Fact, GraphData, GroundedAnswer, Jurisdiction, JurisdictionDiff, ResearchTool, RegulatoryAssessment } from "@/types";
import { mockAbsAssessment, mockAnalysis, mockCases, mockFacts, mockTrace } from "@/lib/mocks/data";

const useMock = false;
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const assistantChatPath = process.env.NEXT_PUBLIC_ASSISTANT_CHAT_PATH || "/assistant/chat";
// Fact extraction, analysis and the assistant run a local LLM (gemma4 via Ollama)
// that can take tens of seconds on CPU, so the client timeout must be generous.
const apiTimeout = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS) || 300000;

export const api = axios.create({
  baseURL,
  timeout: apiTimeout,
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use(config => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ip-sakti-token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== "undefined" && config.data instanceof FormData && config.headers) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("ip-sakti-token");
      localStorage.removeItem("ip-sakti-user");
      document.cookie = "ip_sakti_session=; path=/; max-age=0; SameSite=Lax";
      window.dispatchEvent(new Event("ip-sakti-auth-expired"));
    }
    return Promise.reject(error);
  }
);

function mockDelay<T>(data: T, ms = 350): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(structuredClone(data)), ms));
}

let mockOtp = "";
let mockUsers: AuthUser[] = [
  { id: "u-demo", email: "demo@ipsakti.in", role: "Researcher", first_name: "IP-SAKTI", last_name: "Researcher", default_jurisdiction: "INDIA" }
];

function makeMockToken(email: string) {
  return `mock.${btoa(unescape(encodeURIComponent(email)))}.${Date.now()}`;
}

export const authApi = {
  async register(payload: { first_name: string; last_name: string; email: string; password: string }): Promise<AuthResponse> {
    if (useMock) {
      const user: AuthUser = { id: `u-${Date.now()}`, email: payload.email, first_name: payload.first_name, last_name: payload.last_name, role: "Researcher", default_jurisdiction: "INDIA" };
      mockUsers = [user, ...mockUsers.filter(item => item.email !== payload.email)];
      return mockDelay({ access_token: makeMockToken(user.email), token_type: "bearer", user, requires_otp: false, message: "Account created" });
    }
    const { data } = await api.post<{ user: AuthUser; requires_otp: boolean; message?: string; dev_otp?: string | null }>(
      "/auth/signup",
      { ...payload, email: payload.email.trim().toLowerCase() }
    );
    return {
      requires_otp: data.requires_otp ?? true,
      user: data.user,
      access_token: "",
      message: data.message || "OTP sent to your email",
      dev_otp: data.dev_otp ?? null
    } as AuthResponse;
  },
  async login(email: string, password: string): Promise<AuthResponse> {
    if (useMock) {
      if (!email || password.length < 6) throw new Error("Invalid credentials");
      const user = mockUsers.find(item => item.email === email) ?? { email, role: "Researcher", default_jurisdiction: "INDIA" as const };
      return mockDelay({ access_token: makeMockToken(email), token_type: "bearer", user, message: "Signed in" });
    }
    const { data } = await api.post<AuthResponse>("/auth/login", { email: email.trim().toLowerCase(), password });
    return data;
  },
  async requestOtp(email: string): Promise<{ message: string; dev_otp?: string | null }> {
    if (useMock) {
      const values = new Uint32Array(1);
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(values);
        mockOtp = String(values[0] % 1_000_000).padStart(6, "0");
      } else {
        mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
      }
      console.info(`[IP-SAKTI mock] OTP generated for ${email}: ${mockOtp}`);
      return mockDelay({ message: "OTP requested" });
    }
    const { data } = await api.post<{ message: string; dev_otp?: string | null }>("/auth/request-otp", { email: email.trim().toLowerCase() });
    return data;
  },
  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    if (useMock) {
      if (otp !== mockOtp) return mockDelay({ access_token: "", authenticated: false } as AuthResponse & { authenticated: boolean });
      const user = mockUsers.find(item => item.email === email) ?? { email, role: "Researcher", default_jurisdiction: "INDIA" as const };
      return mockDelay({ access_token: makeMockToken(email), token_type: "bearer", user, message: "OTP verified" });
    }
    const { data } = await api.post<AuthResponse>("/auth/verify-otp", { email: email.trim().toLowerCase(), otp_code: otp.trim() });
    return data;
  },
  async me(): Promise<AuthUser> {
    if (useMock) {
      const email = typeof window !== "undefined" ? localStorage.getItem("ip-sakti-user") : null;
      if (email) return JSON.parse(email) as AuthUser;
      return mockUsers[0];
    }
    const { data } = await api.get<AuthUser>("/auth/me");
    return data;
  },
  async updateProfile(payload: Partial<AuthUser>): Promise<AuthUser> {
    if (useMock) {
      const current = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("ip-sakti-user") || "null") as AuthUser | null : null;
      const user = { ...(current ?? mockUsers[0]), ...payload };
      return mockDelay(user);
    }
    const { data } = await api.patch<AuthUser>("/auth/me", payload);
    return data;
  },
  async forgotPassword(email: string): Promise<{ message: string; dev_otp?: string | null }> {
    if (useMock) {
      return mockDelay({ message: "Password reset code sent to your email" });
    }
    const { data } = await api.post<{ message: string; dev_otp?: string | null }>("/auth/forgot-password", {
      email: email.trim().toLowerCase()
    });
    return data;
  },
  async resetPassword(payload: { email: string; otp_code: string; new_password: string }): Promise<AuthResponse> {
    if (useMock) {
      const user = mockUsers.find(item => item.email === payload.email) ?? mockUsers[0];
      return mockDelay({
        access_token: makeMockToken(user.email),
        token_type: "bearer",
        user,
        message: "Password reset successfully"
      });
    }
    const { data } = await api.post<AuthResponse>("/auth/reset-password", {
      email: payload.email.trim().toLowerCase(),
      otp_code: payload.otp_code.trim(),
      new_password: payload.new_password
    });
    return data;
  },
  async googleLogin(payload: { email: string; first_name?: string; last_name?: string; id_token?: string }): Promise<AuthResponse> {
    if (useMock) {
      const user = {
        id: `u-${Date.now()}`,
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name,
        role: "Researcher" as const,
        default_jurisdiction: "INDIA" as const
      };
      return mockDelay({ access_token: makeMockToken(user.email), token_type: "bearer", user, message: "Signed in with Google" });
    }
    const { data } = await api.post<AuthResponse>("/auth/google", {
      email: payload.email.trim().toLowerCase(),
      first_name: payload.first_name,
      last_name: payload.last_name,
      id_token: payload.id_token
    });
    return data;
  }
};

function createMockReportPdf(caseId: string): Blob {
  const safe = (value: string) => value.replace(/[\\()]/g, "\\$&");
  const lines = [
    "IP-SAKTI Sahayak - Case Report",
    `Case ID: ${caseId}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "Illustrative mock report for frontend development.",
    "Production reports should be returned as application/pdf by the FastAPI backend."
  ];
  const content = [
    "BT",
    "/F1 15 Tf",
    "54 740 Td",
    `(${safe(lines[0])}) Tj`,
    "/F1 10 Tf",
    ...lines.slice(1).map((line) => `0 -22 Td (${safe(line)}) Tj`),
    "ET"
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`
  ];

  const header = "%PDF-1.4\n";
  const chunks = [header];
  const offsets: number[] = [0];
  let position = header.length;

  for (let i = 0; i < objects.length; i++) {
    offsets.push(position);
    const objectText = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    chunks.push(objectText);
    position += objectText.length;
  }

  const xrefStart = position;
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  for (let i = 1; i < offsets.length; i++) {
    chunks.push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  return new Blob([chunks.join("")], { type: "application/pdf" });
}

export const assistantApi = {
  async ask(message: string): Promise<GroundedAnswer> {
    if (useMock) {
      const normalized = message.toLowerCase();
      let answer = "Sahayak can help with Ayurvedic intellectual property, traditional knowledge and regulatory research. Describe the product, jurisdiction of interest and any source document you want grounded.[1] This response is informational and does not constitute legal advice.";
      let citation = { title: "IP-SAKTI research workflow", citation: "Prototype evidence pointer", excerpt: "Illustrative citation returned by the frontend mock. Replace this with backend-validated authority before production.", validated: true };
      if (normalized.includes("patent")) {
        answer = "For a patent-focused question, identify the technical feature you believe is new, how the formulation differs from known practice, and any traditional-knowledge relationship.[1] Sahayak should then ground the response in the applicable jurisdiction's patent sources.";
        citation = { title: "Patent research input guide", citation: "Prototype source pointer", excerpt: "Illustrative evidence for UI development; the production backend should return the actual statutory passage and record.", validated: true };
      } else if (normalized.includes("tkdl") || normalized.includes("prior art")) {
        answer = "For TKDL or prior-art research, include the formulation, traditional-use context and the source text you know.[1] This prototype does not claim unrestricted TKDL access; any public or restricted status must come from the backend.";
        citation = { title: "TKDL / prior-art research pointer", citation: "Prototype source pointer", excerpt: "Illustrative public-information pointer. No restricted TKDL result is asserted.", validated: true };
      } else if (normalized.includes("abs") || normalized.includes("biodiversity")) {
        answer = "For ABS research, provide the biological resource, where and from whom it was accessed, the access context and the intended use.[1] The backend should determine the applicable jurisdiction-specific pathway and supporting evidence.";
        citation = { title: "ABS research input guide", citation: "Prototype source pointer", excerpt: "Illustrative evidence for UI development; replace with authoritative biodiversity/ABS sources in production.", validated: true };
      } else if (normalized.includes("regulatory") || normalized.includes("drug") || normalized.includes("cosmetic")) {
        answer = "For regulatory-pathway questions, provide the product form, ingredients, intended use, claims, dosage and presentation.[1] The backend should map those facts to jurisdiction-specific regulatory evidence.";
        citation = { title: "Regulatory research input guide", citation: "Prototype source pointer", excerpt: "Illustrative evidence for UI development; production responses should cite the applicable regulatory instrument.", validated: true };
      }
      return mockDelay({
        answer,
        citations: [citation],
        confidence: { fact_conf: .86, rule_fit_conf: .82, evidence_conf: .84, citation_conf: .8, overall_conf: .83, band: "HIGH" }
      }, 550);
    }
    const { data } = await api.post<any>(assistantChatPath, { message });
    // Backend returns { text, citations:[{text,reference,url}], sources:[{id,title,url,match_score}] }.
    // Prefer LLM citations; fall back to retrieved sources so grounded TKDL evidence still shows
    // even when the LLM is unavailable. Map both into the GroundedCitation shape the UI expects.
    const rawCitations: any[] = Array.isArray(data.citations) && data.citations.length
      ? data.citations
      : (Array.isArray(data.sources) ? data.sources : []);
    const citations = rawCitations.map((c: any) => ({
      title: c.title || c.reference || "Source",
      citation: c.reference || c.citation || c.title || "",
      excerpt: c.text || c.excerpt || "",
      validated: true,
      source_url: c.url || c.source_url || undefined
    }));
    return {
      ...data,
      answer: data.answer || data.text || "Backend response missing.",
      citations,
      confidence: data.confidence
    } as GroundedAnswer;
  }
};

export const translateApi = {
  // Translate arbitrary text into the target UI language via the Bhashini backend.
  // Returns the original text on any failure or for English, so callers are safe.
  async text(text: string, targetLanguage: string): Promise<string> {
    if (!text || !text.trim() || !targetLanguage || targetLanguage.toLowerCase() === "english") return text;
    try {
      const { data } = await api.post<{ translated: string }>("/translate", { text, target_language: targetLanguage });
      return data.translated || text;
    } catch {
      return text;
    }
  },
  // Translate a whole UI dictionary (nested JSON) in one batched call.
  async dictionary(dictionary: Record<string, unknown>, targetLanguage: string): Promise<Record<string, unknown>> {
    const { data } = await api.post<{ dictionary: Record<string, unknown> }>(
      "/translate/dictionary",
      { dictionary, target_language: targetLanguage },
      { timeout: 600000 } // Bhashini translates the full UI dictionary in chunks; cached after the first switch
    );
    return data.dictionary;
  }
};

export const connectorsApi = {
  async providers(): Promise<string[]> {
    const { data } = await api.get<{ providers: string[] }>("/connectors/providers");
    return data.providers;
  },
  async list(): Promise<Connector[]> {
    const { data } = await api.get<{ connectors: Connector[] }>("/connectors");
    return data.connectors;
  },
  async add(payload: { name: string; provider: string; base_url: string; api_key: string; auth_type: string; header_name: string; consent: boolean }): Promise<Connector> {
    const { data } = await api.post<Connector>("/connectors", payload);
    return data;
  },
  async toggle(id: string, enabled: boolean): Promise<Connector> {
    const { data } = await api.patch<Connector>(`/connectors/${id}?enabled=${enabled}`);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/connectors/${id}`);
  },
  async test(id: string): Promise<{ ok: boolean; status: number | null; detail: string; connector: Connector }> {
    const { data } = await api.post(`/connectors/${id}/test`, {}, { timeout: 15000 });
    return data;
  },
  async audit(): Promise<ConnectorAuditEvent[]> {
    const { data } = await api.get<{ audit: ConnectorAuditEvent[] }>("/connectors/audit");
    return data.audit;
  }
};

export const agentApi = {
  // Multi-step, citation-grounded reasoning. LLM composition can take a while on CPU.
  async query(payload: { query: string; jurisdiction?: string; formulation?: string; ingredients?: string[] }): Promise<AgentResult> {
    const { data } = await api.post<AgentResult>(
      "/agent/query",
      { query: payload.query, jurisdiction: payload.jurisdiction ?? "India", formulation: payload.formulation ?? "", ingredients: payload.ingredients ?? [] },
      { timeout: 240000 }
    );
    return data;
  }
};

export const graphApi = {
  async full(): Promise<GraphData> {
    const { data } = await api.get<GraphData>("/graph");
    return data;
  },
  async subgraph(payload: { query?: string; seeds?: string[]; jurisdiction?: string; hops?: number }): Promise<GraphData> {
    const { data } = await api.post<GraphData>("/graph/subgraph", payload);
    return data;
  }
};

export const jurisdictionDiffApi = {
  // Deterministic India vs International comparison. The LLM explanation can take
  // tens of seconds on CPU, so allow a generous timeout.
  async run(payload: { query: string; formulation?: string; ingredients?: string[]; jurisdiction?: string }): Promise<JurisdictionDiff> {
    const { data } = await api.post<JurisdictionDiff>(
      "/jurisdiction-diff",
      {
        query: payload.query,
        formulation: payload.formulation ?? "",
        ingredients: payload.ingredients ?? [],
        jurisdiction: payload.jurisdiction ?? "diff",
      },
      { timeout: 180000 }
    );
    return data;
  }
};

export const caseApi = {
  async list(): Promise<Case[]> {
    if (useMock) return mockDelay(mockCases);
    const { data } = await api.get<Case[]>("/cases");
    return data;
  },
  async get(id: string): Promise<Case> {
    if (useMock) {
      const item = mockCases.find(c => c.id === id) ?? mockCases[0];
      return mockDelay(item);
    }
    const { data } = await api.get<Case>(`/cases/${id}`);
    return data;
  },
  async create(payload: { title: string; description: string; as_of_date: string; jurisdiction: Jurisdiction; tool?: ResearchTool; tool_input?: Record<string, unknown> }): Promise<Case> {
    if (useMock) {
      const created: Case = {
        id: `case-${Date.now()}`,
        ...payload,
        status: "VERIFYING",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        tool: payload.tool,
        tool_input: payload.tool_input,
        history: [
          {
            id: `history-${Date.now()}`,
            type: "CREATED",
            title: "Case created",
            description: "Research case created from the formulation brief.",
            actor: "Researcher",
            occurred_at: new Date().toISOString(),
            version: 1
          }
        ]
      };
      mockCases.unshift(created);
      return mockDelay(created);
    }
    const { data } = await api.post<Case>("/cases", payload);
    return data;
  },
  async facts(id: string): Promise<Fact[]> {
    if (useMock) {
      const currentCase = mockCases.find(item => item.id === id);
      if (currentCase?.tool === "abs" && currentCase.tool_input) {
        const input = currentCase.tool_input;
        const resources = Array.isArray(input.biological_resources) ? input.biological_resources : [];
        const resourceFacts: Fact[] = resources.flatMap((item, index) => {
          if (!item || typeof item !== "object") return [];
          const value = item as Record<string, unknown>;
          return [{
            id: `abs-resource-${index + 1}`,
            field: `Biological resource ${index + 1}`,
            value: typeof value.name === "string" ? value.name : "",
            normalized_value: typeof value.name === "string" ? value.name : undefined,
            status: "CONFIRMED" as const,
            confidence: .92,
            user_editable: true
          }];
        });
        return mockDelay([
          ...resourceFacts,
          { id: "abs-origin", field: "Source / origin location", value: typeof input.source_origin_location === "string" ? input.source_origin_location : "", normalized_value: "Geographic source / origin", status: "CONFIRMED", confidence: .9, user_editable: true },
          { id: "abs-access", field: "Access context", value: typeof input.access_context === "string" ? input.access_context : "", normalized_value: "Access context", status: "CONFIRMED", confidence: .89, user_editable: true },
          { id: "abs-community", field: "Community / TK holder involvement", value: typeof input.community_tk_involvement === "string" ? input.community_tk_involvement : "", normalized_value: typeof input.community_tk_description === "string" ? input.community_tk_description : undefined, status: "CONFIRMED", confidence: .87, user_editable: true },
          { id: "abs-commercial", field: "Intended commercial use", value: typeof input.intended_commercial_use === "string" ? input.intended_commercial_use : "", normalized_value: "Commercial-use context", status: "CONFIRMED", confidence: .91, user_editable: true }
        ]);
      }
      if (currentCase?.tool === "tkdl" && currentCase.tool_input) {
        const input = currentCase.tool_input;
        return mockDelay([
          { id: "tkdl-formulation", field: "Formulation / technique description", value: typeof input.formulation_technique_description === "string" ? input.formulation_technique_description : "", normalized_value: "Traditional formulation / technique", status: "CONFIRMED", confidence: .9, user_editable: true },
          { id: "tkdl-source", field: "Source text or oral-tradition reference", value: typeof input.source_text_or_oral_tradition_reference === "string" ? input.source_text_or_oral_tradition_reference : "", normalized_value: "Source reference", status: "CONFIRMED", confidence: .82, user_editable: true },
          { id: "tkdl-novel", field: "Believed novel feature", value: typeof input.believed_novel_feature === "string" ? input.believed_novel_feature : "", normalized_value: "Prior-art search focus", status: "CONFIRMED", confidence: .93, user_editable: true }
        ]);
      }
      if (currentCase?.tool === "regulatory" && currentCase.tool_input) {
        const input = currentCase.tool_input;
        return mockDelay([
          { id: "reg-form", field: "Product form", value: typeof input.product_form === "string" ? input.product_form : "", normalized_value: "Regulatory product form", status: "CONFIRMED", confidence: .95, user_editable: true },
          { id: "reg-use", field: "Intended use", value: typeof input.intended_use === "string" ? input.intended_use : "", normalized_value: "Intended use", status: "CONFIRMED", confidence: .91, user_editable: true },
          { id: "reg-claims", field: "Claims made on label / marketing", value: typeof input.claims === "string" ? input.claims : "", normalized_value: "Label / marketing claims", status: "CONFIRMED", confidence: .89, user_editable: true },
          { id: "reg-dosage", field: "Dosage / directions for use", value: typeof input.dosage_directions === "string" ? input.dosage_directions : "", normalized_value: "Dosage and directions", status: "CONFIRMED", confidence: .9, user_editable: true },
          { id: "reg-channel", field: "Marketing channel", value: typeof input.marketing_channel === "string" ? input.marketing_channel : "", normalized_value: "Marketing channel", status: "CONFIRMED", confidence: .88, user_editable: true }
        ]);
      }
      if (currentCase?.tool === "formulation-classifier" && currentCase.tool_input) {
        const input = currentCase.tool_input;
        const rawIngredients = Array.isArray(input.ingredients) ? input.ingredients : [];
        const ingredientFacts: Fact[] = rawIngredients.flatMap((item, index) => {
          if (!item || typeof item !== "object") return [];
          const value = item as Record<string, unknown>;
          return [{
            id: `classifier-ingredient-${index + 1}`,
            field: `Ingredient ${index + 1}`,
            value: typeof value.name === "string" ? value.name : "",
            normalized_value: typeof value.name === "string" ? value.name : undefined,
            status: "CONFIRMED" as const,
            confidence: .93,
            source_span: typeof value.source_text_reference === "string" ? value.source_text_reference : undefined,
            user_editable: true
          }];
        });
        return mockDelay([
          ...ingredientFacts,
          { id: "classifier-source", field: "First-Schedule text match", value: typeof input.first_schedule_text_match === "string" ? input.first_schedule_text_match : "unsure", normalized_value: "First-Schedule reference status", status: "CONFIRMED", confidence: .91, user_editable: true },
          { id: "classifier-processing", field: "Processing / manufacturing method", value: typeof input.processing_method === "string" ? input.processing_method : "", normalized_value: "Processing method", status: "CONFIRMED", confidence: .88, user_editable: true },
          { id: "classifier-intended", field: "Intended use + claims", value: typeof input.intended_use_and_claims === "string" ? input.intended_use_and_claims : "", normalized_value: "Intended use and claims", status: "CONFIRMED", confidence: .86, user_editable: true },
          { id: "classifier-modifications", field: "Modifications from classical formulation", value: typeof input.modifications_from_classical === "string" ? input.modifications_from_classical : "", normalized_value: "Modification status", status: "CONFIRMED", confidence: .9, user_editable: true }
        ]);
      }
      return mockDelay(mockFacts);
    }
    const { data } = await api.post<{message: string, facts: Fact[]}>(`/cases/${id}/facts`);
    return data.facts;
  },
  async confirmFacts(id: string, facts: Fact[]): Promise<Fact[]> {
    if (useMock) return mockDelay(facts.map(f => ({ ...f, status: "CONFIRMED" as const })));
    const { data } = await api.post<{message: string, facts: Fact[]}>(`/cases/${id}/facts`, { facts });
    return data.facts;
  },
  async analyze(id: string, payload: { jurisdiction: Jurisdiction; as_of_date: string; tool?: string }): Promise<Analysis> {
    if (useMock) {
      const currentCase = mockCases.find(item => item.id === id);
      const selected = currentCase?.tool_input?.ip_types;
      const selectedTypes = Array.isArray(selected) ? selected.filter((item): item is string => typeof item === "string") : [];
      const routes = payload.tool === "ip-navigator"
        ? mockAnalysis.ip_routes?.filter(route => selectedTypes.length === 0 || selectedTypes.includes(route.ip_type))
        : undefined;
      const priorArt = payload.tool === "tkdl" ? [
        { id: "tkdl-public-1", title: "Public traditional-knowledge / formulation candidate", source: "Backend public-source pointer", relevance: "Potentially relevant to the formulation or technique described; source-level verification is required before drawing any novelty conclusion.", access_status: "PUBLIC" as const, access_note: "Public source candidate returned by the mock backend." },
        { id: "tkdl-restricted-1", title: "Restricted TKDL entry notice", source: "TKDL access-controlled pointer", relevance: "The search may have an access-restricted match. Entry content is intentionally not shown in this prototype.", access_status: "RESTRICTED" as const, access_note: "Restricted access — no TKDL entry content is shown." },
        { id: "tkdl-patent-1", title: "Patent / publication prior-art candidate", source: "Public patent/publication pointer", relevance: "Potentially overlapping disclosure based on the backend search scope; inspect the underlying publication record.", access_status: "PUBLIC" as const, access_note: "Public patent/publication candidate." }
      ] : undefined;
      const absAssessment = payload.tool === "abs" ? {
        ...mockAbsAssessment,
        disclosure_obligations: payload.jurisdiction === "INTERNATIONAL" ? mockAbsAssessment.disclosure_obligations : []
      } : undefined;
      const regulatoryAssessment: RegulatoryAssessment | undefined = payload.tool === "regulatory" ? {
        applicable_act: "Backend route determination required",
        licensing_route: "Backend licensing-route assessment required",
        claim_restrictions: [
          { title: "Therapeutic / disease claims", status: "REVIEW", details: "Review the backend-selected restrictions for the product form, intended use and label claims.", citation: "Backend advertising-regime citation required" },
          { title: "Digital / e-commerce claims", status: "CONDITIONAL", details: "Marketing-channel facts may change the applicable advertising and presentation checks.", citation: "Backend citation required" }
        ],
        labelling_requirements: [
          { title: "Product identity and directions", status: "REVIEW", details: "Required label particulars depend on the backend-selected regulatory route.", citation: "Backend labelling citation required" },
          { title: "Warnings / mandatory statements", status: "CONDITIONAL", details: "Backend should return the mandatory statements applicable to the product category and claims.", citation: "Backend citation required" }
        ],
        route_items: [
          { title: "Governing Act", status: "REVIEW", details: "The backend should identify whether Drugs & Cosmetics, Drugs and Magic Remedies, FSSAI or another route governs.", citation: "Backend statutory citation required" },
          { title: "Licensing / registration route", status: "REVIEW", details: "The backend should return the applicable licence, registration or market-entry route.", citation: "Backend licensing citation required" }
        ]
      } : undefined;
      return mockDelay({ ...mockAnalysis, jurisdiction: payload.jurisdiction, as_of_date: payload.as_of_date, ip_routes: routes, abs_assessment: absAssessment, regulatory_assessment: regulatoryAssessment, prior_art: priorArt ?? mockAnalysis.prior_art, result_type: "RESULT" });
    }
    const { data } = await api.post<Analysis>(`/cases/${id}/analyze`, payload);
    return data;
  },
  async explain(id: string): Promise<ExplainabilityTrace> {
    if (useMock) return mockDelay(mockTrace);
    const { data } = await api.get<ExplainabilityTrace>(`/cases/${id}/explain`);
    return data;
  },
  async history(id: string): Promise<CaseHistoryEvent[]> {
    if (useMock) {
      const item = mockCases.find(c => c.id === id) ?? mockCases[0];
      return mockDelay(item.history ?? []);
    }
    const { data } = await api.get<Case>(`/cases/${id}`);
    return data.history ?? [];
  },
  async report(id: string): Promise<Blob> {
    if (useMock) {
      return mockDelay(createMockReportPdf(id));
    }
    // Backend returns a ready-made PDF.
    const { data } = await api.get(`/cases/${id}/report`, { responseType: "blob" });
    return new Blob([data], { type: "application/pdf" });
  },
  async exportArchivePdf(rows: Array<Record<string, unknown>>): Promise<Blob> {
    if (useMock) return mockDelay(createMockReportPdf("archive"));
    const { data } = await api.post(`/cases/export-pdf`, { rows }, { responseType: "blob" });
    return new Blob([data], { type: "application/pdf" });
  },
  async uploadDocument(file: File): Promise<{ extracted_text: string; filename: string }> {
    if (useMock) {
      return mockDelay({
        filename: file.name,
        extracted_text: `Illustrative extracted text for ${file.name}.\n\nBackend PDF text extraction is not enabled in mock mode. Replace this response with the FastAPI /cases/upload extraction result before production use.`
      });
    }
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<{ extracted_text: string; filename?: string }>("/cases/upload", form);
    return { extracted_text: data.extracted_text, filename: data.filename ?? file.name };
  },
  async saveAskResult(id: string, result: GroundedAnswer): Promise<void> {
    if (useMock) return;
    await api.post(`/cases/${id}/ask-result`, {
      answer: result.answer,
      citations: (result.citations || []).map(c => ({ title: c.title, citation: c.citation, excerpt: c.excerpt, source_url: c.source_url }))
    });
  },
  async escalate(id: string, reason: string): Promise<{ id: string; status: string }> {
    if (useMock) return mockDelay({ id: `esc-${Date.now()}`, status: "REQUESTED" });
    const { data } = await api.post<{ id: string; status: string }>(`/cases/${id}/escalate`, { reason });
    return data;
  }
};

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "The research service could not be reached. Please try again.";
    
    // Extract FastAPI detail message if it exists
    if (error.response.data && typeof error.response.data.detail === "string") {
      return error.response.data.detail;
    }

    if (error.response.status === 401) return "Your session has expired. Please sign in again.";
    if (error.response.status === 404) return "The requested case or research record could not be found.";
    if (error.response.status === 422) return "Some information could not be validated. Review the fields and try again.";
    if (error.response.status >= 500) return "The research service is temporarily unavailable. Please try again.";
  }
  return fallback;
}
