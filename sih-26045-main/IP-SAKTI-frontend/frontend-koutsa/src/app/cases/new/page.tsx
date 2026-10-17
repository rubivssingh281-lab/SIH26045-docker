"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, Check, ChevronDown, ChevronUp, ClipboardCheck, FileText, Gavel, MessageSquare, Network, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useCreateCase, useUploadCaseDocument } from "@/hooks/queries/use-cases";
import { useLanguage } from "@/components/providers/language-provider";
import { Breadcrumb, PageHeader } from "@/components/domain/page-header";
import { JurisdictionToggle } from "@/components/domain/jurisdiction-toggle";
import { Disclaimer } from "@/components/domain/disclaimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormulationClassifierInput, Jurisdiction, RegulatoryPathwayInput, FormulationIngredientInput } from "@/types";
import { getApiErrorMessage } from "@/lib/api";
import { FileUploadDropzone } from "@/components/domain/file-upload-dropzone";
import { toast } from "sonner";
import { getTranslatedToolConfig, toolKeys, type ToolKey } from "@/lib/tool-config";
import { cn } from "@/lib/utils";

const ipTypes = ["Patent", "GI", "Trademark", "Design", "Copyright", "Plant Variety"] as const;

const TOOL_TABS: Array<{ key: ToolKey; labelKey: string; defaultLabel: string; icon: typeof MessageSquare }> = [
  { key: "ask", labelKey: "nav.ask_sahayak", defaultLabel: "Ask Sahayak", icon: MessageSquare },
  { key: "ip-navigator", labelKey: "nav.ip_navigator", defaultLabel: "IP Navigator", icon: Gavel },
  { key: "formulation-classifier", labelKey: "nav.formulation_classifier", defaultLabel: "Classifier", icon: ClipboardCheck },
  { key: "abs", labelKey: "nav.abs_compliance", defaultLabel: "ABS", icon: ShieldCheck },
  { key: "tkdl", labelKey: "nav.tkdl_prior_art", defaultLabel: "TKDL", icon: FileText },
  { key: "regulatory", labelKey: "nav.regulatory_pathway", defaultLabel: "Regulatory", icon: Network },
];

export default function NewCasePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const mutation = useCreateCase();
  const uploadMutation = useUploadCaseDocument();
  const tool = (params.get("tool") as ToolKey | null);
  const activeTool: ToolKey = tool && toolKeys.includes(tool) ? tool : "ask";
  const config = getTranslatedToolConfig(activeTool, t);

  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("INDIA");

  const [novelty, setNovelty] = useState("");
  const [traditional, setTraditional] = useState("");
  const [selectedIpTypes, setSelectedIpTypes] = useState<string[]>(["Patent", "Trademark"]);
  const [stage, setStage] = useState<"research" | "pre-launch" | "launched">("research");

  type IngredientRow = FormulationIngredientInput & { id: string };
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { id: "ingredient-1", name: "", source_text_reference: "" }
  ]);
  const [sourceTextMatch, setSourceTextMatch] = useState<"yes" | "no" | "unsure">("unsure");
  const [processingMethod, setProcessingMethod] = useState("");
  const [intendedUseAndClaims, setIntendedUseAndClaims] = useState("");
  const [modifications, setModifications] = useState("");

  type AbsResourceRow = { id: string; name: string };
  const [absResources, setAbsResources] = useState<AbsResourceRow[]>([{ id: "abs-resource-1", name: "" }]);
  const [absOrigin, setAbsOrigin] = useState("");
  const [absAccessContext, setAbsAccessContext] = useState<"wild-collected" | "cultivated" | "community-sourced" | "purchased-from-registered-supplier">("wild-collected");
  const [absCommunity, setAbsCommunity] = useState<"yes" | "no">("no");
  const [absCommunityDescription, setAbsCommunityDescription] = useState("");
  const [absCommercialUse, setAbsCommercialUse] = useState<"domestic-sale" | "export" | "licensing" | "research-only">("domestic-sale");

  const [tkdlFormulation, setTkdlFormulation] = useState("");
  const [tkdlSourceReference, setTkdlSourceReference] = useState("");
  const [tkdlNovelFeature, setTkdlNovelFeature] = useState("");
  const [regulatoryProductForm, setRegulatoryProductForm] = useState<RegulatoryPathwayInput["product_form"]>("tablet");
  const [regulatoryIntendedUse, setRegulatoryIntendedUse] = useState("");
  const [regulatoryClaims, setRegulatoryClaims] = useState("");
  const [regulatoryDosage, setRegulatoryDosage] = useState("");
  const [regulatoryChannel, setRegulatoryChannel] = useState<RegulatoryPathwayInput["marketing_channel"]>("otc");

  useEffect(() => {
    const stored = window.localStorage.getItem("ip-sakti-jurisdiction") as Jurisdiction | null;
    if (stored === "INDIA" || stored === "INTERNATIONAL") setJurisdiction(stored);
  }, []);

  useEffect(() => {
    const defaults: Partial<Record<ToolKey, string>> = {
      ask: "",
      "formulation-classifier": "Ayurvedic formulation classification — ",
      abs: "ABS review — ",
      tkdl: "TKDL / prior-art review — ",
      regulatory: "Regulatory pathway — ",
      "ip-navigator": "IP protection review — "
    };
    setTitle(defaults[activeTool] ?? "");
  }, [activeTool]);

  const sidebarItems = config.sidebarItems;

  const descriptionForSubmission = useMemo(() => {
    if (activeTool === "ip-navigator") {
      return [
        `Novel / potentially new: ${novelty.trim()}`,
        `Traditional knowledge: ${traditional.trim()}`,
        `IP types of interest: ${selectedIpTypes.join(", ")}`,
        `Commercialization stage: ${stage}`,
        description.trim() ? `Additional context: ${description.trim()}` : ""
      ].filter(Boolean).join("\n\n");
    }
    if (activeTool === "abs") {
      return [
        `Biological resources: ${absResources.map(item => item.name.trim()).filter(Boolean).join("; ")}`,
        `Source / origin location: ${absOrigin.trim()}`,
        `Access context: ${absAccessContext}`,
        `Community / TK holder involvement: ${absCommunity}${absCommunityDescription.trim() ? ` — ${absCommunityDescription.trim()}` : ""}`,
        `Intended commercial use: ${absCommercialUse}`,
        description.trim() ? `Additional context: ${description.trim()}` : ""
      ].filter(Boolean).join("\n\n");
    }
    if (activeTool === "tkdl") {
      return [
        `Formulation / technique description: ${tkdlFormulation.trim()}`,
        `Source text or oral-tradition reference: ${tkdlSourceReference.trim() || "Not supplied"}`,
        `What the user believes may be novel: ${tkdlNovelFeature.trim()}`,
        description.trim() ? `Additional context: ${description.trim()}` : ""
      ].filter(Boolean).join("\n\n");
    }
    if (activeTool === "regulatory") {
      return [
        `Product form: ${regulatoryProductForm}`,
        `Intended use: ${regulatoryIntendedUse.trim()}`,
        `Claims made on label / marketing: ${regulatoryClaims.trim()}`,
        `Dosage / directions for use: ${regulatoryDosage.trim()}`,
        `Marketing channel: ${regulatoryChannel}`,
        description.trim() ? `Additional context: ${description.trim()}` : ""
      ].filter(Boolean).join("\n\n");
    }
    if (activeTool === "formulation-classifier") {      return [
        `Ingredients: ${ingredients.map(item => `${item.name.trim()}${item.source_text_reference.trim() ? ` (source: ${item.source_text_reference.trim()})` : ""}`).filter(Boolean).join("; ")}`,
        `First-Schedule text match: ${sourceTextMatch}`,
        `Processing / manufacturing method: ${processingMethod.trim()}`,
        `Intended use + claims: ${intendedUseAndClaims.trim()}`,
        `Modifications from classical formulation: ${modifications.trim()}`,
        description.trim() ? `Additional context: ${description.trim()}` : ""
      ].filter(Boolean).join("\n\n");
    }
    return description;
  }, [activeTool, novelty, traditional, selectedIpTypes, stage, description, ingredients, sourceTextMatch, processingMethod, intendedUseAndClaims, modifications, absResources, absOrigin, absAccessContext, absCommunity, absCommunityDescription, absCommercialUse, tkdlFormulation, tkdlSourceReference, tkdlNovelFeature, regulatoryProductForm, regulatoryIntendedUse, regulatoryClaims, regulatoryDosage, regulatoryChannel]);

  const toggleIpType = (value: string) => {
    setSelectedIpTypes(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (activeTool === "ip-navigator" && selectedIpTypes.length === 0) {
      toast.error(t("case_new.select_ip_type_err"), { description: t("case_new.select_ip_type_desc") });
      return;
    }
    if (activeTool === "abs") {
      if (absResources.some(item => !item.name.trim()) || !absOrigin.trim()) {
        toast.error("Complete the ABS intake", { description: "Add at least one biological resource and its source / origin location." });
        return;
      }
      if (absCommunity === "yes" && !absCommunityDescription.trim()) {
        toast.error("Describe community / TK involvement", { description: "Add a short description when community or traditional-knowledge holder involvement is marked yes." });
        return;
      }
    }
    if (activeTool === "tkdl") {
      if (!tkdlFormulation.trim() || !tkdlNovelFeature.trim()) {
        toast.error("Complete the prior-art search scope", { description: "Provide the formulation/technique description and what you believe may be novel." });
        return;
      }
    }
    if (activeTool === "regulatory") {
      if (!regulatoryIntendedUse.trim() || !regulatoryClaims.trim() || !regulatoryDosage.trim()) {
        toast.error("Complete the regulatory intake", { description: "Provide intended use, label/marketing claims and dosage or directions for use." });
        return;
      }
    }
    if (activeTool === "formulation-classifier") {
      if (ingredients.some(item => !item.name.trim())) {
        toast.error("Complete the ingredient list", { description: "Add an ingredient name for each row or remove the empty row." });
        return;
      }
      if (!processingMethod.trim() || !intendedUseAndClaims.trim() || !modifications.trim() || ingredients.some(item => !item.source_text_reference.trim())) {
        toast.error("Complete the classification intake", { description: "Each ingredient needs a source-text reference, and processing method, intended use/claims and modifications are required." });
        return;
      }
    }
    try {
      const result = await mutation.mutateAsync({
        title,
        description: descriptionForSubmission,
        as_of_date: date,
        jurisdiction,
        tool: activeTool,
        tool_input:
          activeTool === "ip-navigator"
            ? { novelty, traditional_knowledge: traditional, ip_types: selectedIpTypes, commercialization_stage: stage }
            : activeTool === "regulatory"
              ? { product_form: regulatoryProductForm, intended_use: regulatoryIntendedUse, claims: regulatoryClaims, dosage_directions: regulatoryDosage, marketing_channel: regulatoryChannel } satisfies RegulatoryPathwayInput
              : activeTool === "formulation-classifier"
              ? { ingredients: ingredients.map(({ name, source_text_reference }) => ({ name, source_text_reference })), first_schedule_text_match: sourceTextMatch, processing_method: processingMethod, intended_use_and_claims: intendedUseAndClaims, modifications_from_classical: modifications } satisfies FormulationClassifierInput
              : activeTool === "tkdl"
                ? { formulation_technique_description: tkdlFormulation, source_text_or_oral_tradition_reference: tkdlSourceReference, believed_novel_feature: tkdlNovelFeature }
              : activeTool === "abs"
                ? { biological_resources: absResources.map(({ name }) => ({ name })), source_origin_location: absOrigin, access_context: absAccessContext, community_tk_involvement: absCommunity, community_tk_description: absCommunityDescription, intended_commercial_use: absCommercialUse }
                : undefined
      });
      window.localStorage.setItem(`ip-sakti-case-tool:${result.id}`, activeTool);
      toast.success(t("case_new.create_success"), { description: t("case_new.create_success_desc") });
      router.push(`/cases/${result.id}/verify?tool=${encodeURIComponent(activeTool)}`);
    } catch (error) {
      toast.error(t("case_new.create_error"), { description: getApiErrorMessage(error, t("case_new.create_error_desc")) });
    }
  }

  return (
    <div>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: config.title }]} />
      <PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} />

      {/* Mobile Tool Switcher Strip */}
      <div className="no-scrollbar mb-3 sm:mb-5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
        {TOOL_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTool === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => router.push(`/cases/new?tool=${tab.key}`)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95",
                isActive
                  ? "bg-forest text-white shadow-sm font-bold"
                  : "bg-white text-ink/70 border border-line hover:bg-mist hover:text-navy"
              )}
            >
              <Icon size={13} />
              <span>{t(tab.labelKey, tab.defaultLabel)}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <p className="eyebrow text-[10px] sm:text-[11px]">{activeTool === "ip-navigator" ? t("case_new.intake_navigator") : activeTool === "formulation-classifier" ? t("case_new.intake_classifier") : activeTool === "abs" ? t("case_new.intake_abs") : activeTool === "tkdl" ? t("case_new.intake_tkdl") : activeTool === "regulatory" ? t("case_new.intake_regulatory") : t("case_new.intake_default")}</p>
            <h2 className="serif mt-0.5 sm:mt-1 text-xl sm:text-2xl text-forest">{activeTool === "ip-navigator" ? t("case_new.brief_navigator") : activeTool === "formulation-classifier" ? t("case_new.brief_classifier") : activeTool === "abs" ? t("case_new.brief_abs") : activeTool === "tkdl" ? t("case_new.brief_tkdl") : activeTool === "regulatory" ? t("case_new.brief_regulatory") : t("case_new.brief_default")}</h2>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4">
            <form onSubmit={submit} className="space-y-4 sm:space-y-6">
              {activeTool === "ip-navigator" ? (
                <>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold" htmlFor="novelty">{t("What's novel vs. new")}</label>
                      <Textarea id="novelty" required value={novelty} onChange={e => setNovelty(e.target.value)} placeholder={t("Describe the technical, formulation, process or commercial features you believe are new.")} />
                      <p className="mt-2 text-xs leading-5 text-ink/50">{t("Focus on the feature you believe is genuinely new, not the traditional ingredients or uses you inherited.")}</p>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold" htmlFor="traditional">{t("What's traditional knowledge")}</label>
                      <Textarea id="traditional" required value={traditional} onChange={e => setTraditional(e.target.value)} placeholder={t("Describe traditional ingredients, formulations, uses, source texts or community-held knowledge involved.")} />
                      <p className="mt-2 text-xs leading-5 text-ink/50">{t("Be explicit about known Ayurvedic texts, customary use or traditional formulation features.")}</p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-bold">{t("IP types of interest")}</p>
                    <div className="flex flex-wrap gap-2">
                      {ipTypes.map(type => {
                        const selected = selectedIpTypes.includes(type);
                        return <button key={type} type="button" aria-pressed={selected} onClick={() => toggleIpType(type)} className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition ${selected ? "border-forest bg-forest text-white" : "border-line bg-white text-navy hover:bg-mist"}`}><span className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? "border-white bg-white text-forest" : "border-navy/30"}`}>{selected && <Check size={11} strokeWidth={3} />}</span>{t(type)}</button>;
                      })}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-ink/50">{t("Only selected regimes are sent as the navigator's retrieval scope.")}</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold" htmlFor="stage">{t("Commercialization stage")}</label>
                    <select id="stage" value={stage} onChange={e => setStage(e.target.value as typeof stage)} className="h-11 w-full rounded-control border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10">
                      <option value="research">{t("Research")}</option>
                      <option value="pre-launch">{t("Pre-launch")}</option>
                      <option value="launched">{t("Launched")}</option>
                    </select>
                  </div>
                </>
              ) : activeTool === "formulation-classifier" ? (
                <>
                  <div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <label className="block text-sm font-bold">{t("Ingredients")}</label>
                        <p className="mt-1 text-xs leading-5 text-ink/50">{t("Add each ingredient separately and cite the source text you are relying on for that ingredient.")}</p>
                      </div>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setIngredients(items => [...items, { id: `ingredient-${Date.now()}`, name: "", source_text_reference: "" }])}><Plus size={14} /> {t("Add ingredient")}</Button>
                    </div>
                    <div className="mt-3 space-y-3">
                      {ingredients.map((ingredient, index) => (
                        <div key={ingredient.id} className="grid gap-3 rounded-lg border border-line bg-[#FBFCFD] p-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                          <div>
                            <label className="mb-1.5 block text-xs font-bold text-ink/65" htmlFor={`ingredient-${ingredient.id}`}>{t("Ingredient {index}", { index: index + 1 })}</label>
                            <Input id={`ingredient-${ingredient.id}`} value={ingredient.name} onChange={e => setIngredients(items => items.map(item => item.id === ingredient.id ? { ...item, name: e.target.value } : item))} placeholder={t("e.g. Ashwagandha root")} />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-bold text-ink/65" htmlFor={`source-${ingredient.id}`}>{t("Source text reference")}</label>
                            <Input id={`source-${ingredient.id}`} value={ingredient.source_text_reference} onChange={e => setIngredients(items => items.map(item => item.id === ingredient.id ? { ...item, source_text_reference: e.target.value } : item))} placeholder={t("e.g. Charaka Samhita, Sutra 1")} />
                          </div>
                          <button type="button" aria-label={`Remove ingredient ${index + 1}`} onClick={() => setIngredients(items => items.length === 1 ? items : items.filter(item => item.id !== ingredient.id))} className="flex h-10 w-10 items-center justify-center rounded-control border border-line text-ink/50 hover:bg-[#FFF4F2] hover:text-[#93000A]"><Trash2 size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 block text-sm font-bold">{t("Does it appear in a First-Schedule authoritative text?")}</p>
                    <div className="grid grid-cols-3 gap-2 rounded-control border border-line bg-white p-1">
                      {(["yes", "no", "unsure"] as const).map(option => (
                        <button key={option} type="button" aria-pressed={sourceTextMatch === option} onClick={() => setSourceTextMatch(option)} className={`rounded-[6px] px-3 py-2.5 text-xs font-bold capitalize transition ${sourceTextMatch === option ? "bg-forest text-white" : "text-navy hover:bg-mist"}`}>{option === "yes" ? t("Yes") : option === "no" ? t("No") : t("Unsure")}</button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold" htmlFor="processing-method">{t("Processing / manufacturing method")}</label>
                      <Textarea id="processing-method" required value={processingMethod} onChange={e => setProcessingMethod(e.target.value)} placeholder={t("Describe heating, extraction, purification, fermentation, dosage preparation or other manufacturing steps.")} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold" htmlFor="intended-use-claims">{t("Intended use + claims")}</label>
                      <Textarea id="intended-use-claims" required value={intendedUseAndClaims} onChange={e => setIntendedUseAndClaims(e.target.value)} placeholder={t("State the intended use and the exact therapeutic, wellness or other claims to be assessed.")} />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold" htmlFor="modifications">{t("Modifications from classical formulation")}</label>
                    <Textarea id="modifications" required value={modifications} onChange={e => setModifications(e.target.value)} placeholder={t("Describe any change to ingredients, proportions, dosage, processing or presentation compared with the classical formulation.")} />
                  </div>
                </>
              ) : activeTool === "abs" ? (
                <>
                  <div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <label className="block text-sm font-bold">{t("Biological resource(s) used")}</label>
                        <p className="mt-1 text-xs leading-5 text-ink/50">{t("List each biological resource separately so access and source facts remain checkable.")}</p>
                      </div>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setAbsResources(items => [...items, { id: `abs-resource-${Date.now()}`, name: "" }])}><Plus size={14} /> {t("Add resource")}</Button>
                    </div>
                    <div className="mt-3 space-y-3">
                      {absResources.map((resource, index) => (
                        <div key={resource.id} className="flex gap-3">
                          <div className="flex-1">
                            <label className="mb-1.5 block text-xs font-bold text-ink/65" htmlFor={resource.id}>{t("Resource {index}", { index: index + 1 })}</label>
                            <Input id={resource.id} value={resource.name} onChange={e => setAbsResources(items => items.map(item => item.id === resource.id ? { ...item, name: e.target.value } : item))} placeholder={t("e.g. Ashwagandha root")} />
                          </div>
                          <button type="button" aria-label={`Remove resource ${index + 1}`} onClick={() => setAbsResources(items => items.length === 1 ? items : items.filter(item => item.id !== resource.id))} className="mt-6 flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-line text-ink/50 hover:bg-[#FFF4F2] hover:text-[#93000A]"><Trash2 size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold" htmlFor="abs-origin">{t("Source / origin location")}</label>
                    <Input id="abs-origin" required value={absOrigin} onChange={e => setAbsOrigin(e.target.value)} placeholder={t("e.g. Uttar Pradesh, India — district / region if known")} />
                    <p className="mt-2 text-xs leading-5 text-ink/50">{t("Use the access location or provenance you know; geography can affect the backend ABS assessment.")}</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold" htmlFor="abs-access">{t("Access context")}</label>
                    <select id="abs-access" value={absAccessContext} onChange={e => setAbsAccessContext(e.target.value as typeof absAccessContext)} className="h-11 w-full rounded-control border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10">
                      <option value="wild-collected">{t("Wild-collected")}</option>
                      <option value="cultivated">{t("Cultivated")}</option>
                      <option value="community-sourced">{t("Community-sourced")}</option>
                      <option value="purchased-from-registered-supplier">{t("Purchased from registered supplier")}</option>
                    </select>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-bold">{t("Community / TK holder involvement")}</p>
                      <div className="grid grid-cols-2 gap-2 rounded-control border border-line bg-white p-1">
                        {(["yes", "no"] as const).map(option => <button key={option} type="button" aria-pressed={absCommunity === option} onClick={() => setAbsCommunity(option)} className={`rounded-[6px] px-3 py-2.5 text-xs font-bold capitalize transition ${absCommunity === option ? "bg-forest text-white" : "text-navy hover:bg-mist"}`}>{option === "yes" ? t("Yes") : t("No")}</button>)}
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold" htmlFor="abs-commercial">{t("Intended commercial use")}</label>
                      <select id="abs-commercial" value={absCommercialUse} onChange={e => setAbsCommercialUse(e.target.value as typeof absCommercialUse)} className="h-11 w-full rounded-control border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10">
                        <option value="domestic-sale">{t("Domestic sale")}</option>
                        <option value="export">{t("Export")}</option>
                        <option value="licensing">{t("Licensing")}</option>
                        <option value="research-only">{t("Research only")}</option>
                      </select>
                    </div>
                  </div>

                  {absCommunity === "yes" && <div>
                    <label className="mb-2 block text-sm font-bold" htmlFor="abs-community-description">{t("Community / TK holder description")}</label>
                    <Textarea id="abs-community-description" required value={absCommunityDescription} onChange={e => setAbsCommunityDescription(e.target.value)} placeholder={t("Describe the community or traditional-knowledge holder involvement, known consent/process context, or relevant knowledge contribution.")} />
                  </div>}
                </>
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-bold" htmlFor="title">{t("case_new.title")}</label>
                  <Input id="title" required value={title} onChange={e => setTitle(e.target.value)} placeholder={t("case_new.title_placeholder")} />
                </div>
              )}

              {activeTool !== "tkdl" && <div>
                <label className="mb-2 block text-sm font-bold">{t("case_new.source_document")}</label>
                <FileUploadDropzone fileName={uploadedFileName} isUploading={uploadMutation.isPending} error={uploadMutation.isError ? getApiErrorMessage(uploadMutation.error, t("case_new.document_failed")) : null} onClear={() => setUploadedFileName(null)} onUpload={async file => {
                  try {
                    const result = await uploadMutation.mutateAsync(file);
                    setUploadedFileName(result.filename);
                    setDescription(current => current ? `${current}\n\n${result.extracted_text}` : result.extracted_text);
                    toast.success(t("case_new.document_extracted"), { description: `${result.filename} was added to your research brief.` });
                  } catch (error) {
                    toast.error(t("case_new.document_failed"), { description: getApiErrorMessage(error, "We couldn't extract text from that document.") });
                  }
                }} />
              </div>}

              {activeTool === "tkdl" && (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold" htmlFor="tkdl-formulation">{t("Formulation / technique description")}</label>
                    <Textarea id="tkdl-formulation" required value={tkdlFormulation} onChange={e => setTkdlFormulation(e.target.value)} placeholder={t("Describe the formulation, preparation technique, traditional use, ingredients and process features relevant to the prior-art search.")} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold" htmlFor="tkdl-source-reference">{t("Source text or oral-tradition reference")} <span className="font-medium text-ink/45">({t("if known")})</span></label>
                    <Textarea id="tkdl-source-reference" value={tkdlSourceReference} onChange={e => setTkdlSourceReference(e.target.value)} placeholder={t("e.g. classical text, chapter/verse, practitioner record, community reference or oral-tradition note.")} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold" htmlFor="tkdl-novel">{t("What do you believe may be novel?")}</label>
                    <Textarea id="tkdl-novel" required value={tkdlNovelFeature} onChange={e => setTkdlNovelFeature(e.target.value)} placeholder={t("Be specific about the feature, method, combination or use you want the prior-art search to scope.")} />
                    <p className="mt-2 text-xs leading-5 text-ink/50">{t("This scopes retrieval; it is not a frontend determination of novelty.")}</p>
                  </div>
                </div>
              )}

              {activeTool === "regulatory" && (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold" htmlFor="reg-product-form">{t("Product form")}</label>
                    <select id="reg-product-form" value={regulatoryProductForm} onChange={e => setRegulatoryProductForm(e.target.value as RegulatoryPathwayInput["product_form"])} className="h-11 w-full rounded-control border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10">
                      <option value="tablet">{t("Tablet")}</option>
                      <option value="oil">{t("Oil")}</option>
                      <option value="powder">{t("Powder")}</option>
                      <option value="cosmetic">{t("Cosmetic")}</option>
                      <option value="food-supplement">{t("Food supplement")}</option>
                    </select>
                    <p className="mt-2 text-xs leading-5 text-ink/50">{t("Product form helps scope the backend route before claim and labelling checks.")}</p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div><label className="mb-2 block text-sm font-bold" htmlFor="reg-use">{t("Intended use")}</label><Textarea id="reg-use" required value={regulatoryIntendedUse} onChange={e => setRegulatoryIntendedUse(e.target.value)} placeholder={t("What is the product intended to do or support?")} /></div>
                    <div><label className="mb-2 block text-sm font-bold" htmlFor="reg-claims">{t("Claims made on label / marketing")}</label><Textarea id="reg-claims" required value={regulatoryClaims} onChange={e => setRegulatoryClaims(e.target.value)} placeholder={t("Enter the claims exactly or as closely as possible.")} /></div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div><label className="mb-2 block text-sm font-bold" htmlFor="reg-dosage">{t("Dosage / directions for use")}</label><Textarea id="reg-dosage" required value={regulatoryDosage} onChange={e => setRegulatoryDosage(e.target.value)} placeholder={t("Dosage, frequency, route and directions for use.")} /></div>
                    <div><label className="mb-2 block text-sm font-bold" htmlFor="reg-channel">{t("Marketing channel")}</label><select id="reg-channel" value={regulatoryChannel} onChange={e => setRegulatoryChannel(e.target.value as RegulatoryPathwayInput["marketing_channel"])} className="h-11 w-full rounded-control border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10"><option value="otc">{t("OTC")}</option><option value="prescription">{t("Prescription")}</option><option value="e-commerce">{t("E-commerce")}</option><option value="export">{t("Export")}</option></select></div>
                  </div>
                </div>
              )}

              {activeTool !== "tkdl" && <div>
                <label className="mb-2 block text-sm font-bold" htmlFor="description">{activeTool === "ask" ? t("case_new.your_question") : t("case_new.additional_context")}</label>
                <Textarea id="description" required={activeTool !== "ip-navigator" && activeTool !== "ask"} value={description} onChange={e => setDescription(e.target.value)} placeholder={config.prompt} />
              </div>}

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold" htmlFor="as-of">{t("case_new.law_evidence_as_of")}</label>
                  <div className="relative"><CalendarDays className="absolute left-3 top-3 text-ink/45" size={17} /><Input id="as-of" type="date" className="pl-10" value={date} onChange={e => setDate(e.target.value)} required /></div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold">{t("case_new.jurisdiction_label")}</label>
                  <JurisdictionToggle value={jurisdiction} onChange={value => { setJurisdiction(value); window.localStorage.setItem("ip-sakti-jurisdiction", value); }} />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
                <p className="text-xs text-ink/55">{activeTool === "ip-navigator" ? t("Your novelty/traditional split and selected IP regimes are carried into the backend case context.") : activeTool === "formulation-classifier" ? t("Your structured ingredient and formulation facts are carried into the backend classification pipeline.") : activeTool === "abs" ? t("Your resource, geography, access, community and use facts are carried into the backend ABS pathway assessment.") : activeTool === "tkdl" ? t("Your search scope is used to retrieve public TKDL and prior-art candidates; restricted TKDL content is never fabricated or displayed.") : activeTool === "regulatory" ? t("Your product form, use, claims, dosage and marketing channel are carried into the backend regulatory pathway assessment.") : t("You will review extracted facts before the backend analysis stage.")}</p>
                <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? t("case_new.creating_case") : <>{t("case_new.continue_fact_review")} <ArrowRight size={16} /></>}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Mobile Toggle for Guidance */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setGuidanceOpen(v => !v)}
            className="flex w-full items-center justify-between rounded-card border border-line bg-white p-3.5 text-xs font-bold text-forest shadow-sm active:bg-mist"
          >
            <span className="flex items-center gap-2">
              <Sparkles size={16} className="text-gold" /> {config.sidebarTitle}
            </span>
            {guidanceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div className={cn("space-y-4 sm:space-y-5", !guidanceOpen && "hidden lg:block")}>
          <Card className="p-4 sm:p-6">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-[#EAF3FF] text-navy"><Sparkles size={18} className="sm:size-[21px]" /></div>
            <h3 className="serif mt-3 sm:mt-4 text-xl sm:text-2xl text-forest">{config.sidebarTitle}</h3>
            <div className="mt-3 sm:mt-4 space-y-2.5 sm:space-y-3 text-xs sm:text-sm leading-5 sm:leading-6 text-ink/70">
              {sidebarItems.map(text => <div key={text} className="flex gap-2.5 sm:gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{text}</div>)}
            </div>
          </Card>
          <div className="rounded-card border border-[#D6E3FF] bg-[#EEF5FF] p-4 sm:p-6">
            <p className="eyebrow text-[10px] sm:text-[11px]">{t("case_new.jurisdiction_sidebar")}</p>
            <h3 className="serif mt-1 text-xl sm:text-2xl text-navy">{jurisdiction === "INDIA" ? t("case_new.india_research") : t("case_new.international_research")}</h3>
            <p className="mt-1.5 sm:mt-2 text-xs leading-5 text-navy/65">{t("case_new.jurisdiction_desc")}</p>
          </div>
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
