"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Download, ExternalLink, FileCheck2, Gavel, History, ShieldCheck } from "lucide-react";
import { useAnalyzeCase, useAssistantChat, useCase, useEscalate } from "@/hooks/queries/use-cases";
import { caseApi, getApiErrorMessage } from "@/lib/api";
import { Breadcrumb, PageHeader } from "@/components/domain/page-header";
import { JurisdictionToggle } from "@/components/domain/jurisdiction-toggle";
import { ShareCaseButton } from "@/components/domain/share-case-button";
import { GroundedAnswer } from "@/components/domain/grounded-answer";
import { IpRouteMatrix } from "@/components/domain/ip-route-matrix";
import { AbsObligations } from "@/components/domain/abs-obligations";
import { PriorArtCandidates } from "@/components/domain/prior-art-candidates";
import { RegulatoryPathway } from "@/components/domain/regulatory-pathway";
import { Disclaimer } from "@/components/domain/disclaimer";
import { Button } from "@/components/ui/button";
import { TextToSpeech } from "@/components/ui/text-to-speech";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Jurisdiction } from "@/types";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/language-provider";

export default function AnalysisPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tool, setTool] = useState<string | null>(searchParams.get("tool"));
  const isAsk = tool === "ask";
  const isIpNavigator = tool === "ip-navigator";
  const isClassifier = tool === "formulation-classifier";
  const isAbs = tool === "abs";
  const isTkdl = tool === "tkdl";
  const isRegulatory = tool === "regulatory";
  const { data: caseItem, isLoading } = useCase(id);
  const analyze = useAnalyzeCase(id);
  const assistant = useAssistantChat();
  const escalate = useEscalate(id);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("INDIA");

  useEffect(() => {
    const urlTool = searchParams.get("tool");
    if (urlTool) { setTool(urlTool); return; }
    const storedTool = window.localStorage.getItem(`ip-sakti-case-tool:${id}`);
    if (storedTool) setTool(storedTool);
  }, [id, searchParams]);

  useEffect(() => {
    if (caseItem?.jurisdiction) setJurisdiction(caseItem.jurisdiction);
  }, [caseItem?.jurisdiction]);

  async function runAskAnswer() {
    if (!caseItem?.description.trim() || assistant.isPending) return;
    try {
      const answer = await assistant.mutateAsync(caseItem.description);
      // Persist the grounded answer to the case so it appears in the downloadable report.
      caseApi.saveAskResult(id, answer).catch(() => {});
      toast.success(t("case_view.ready_answer_title", "Grounded answer generated"), { 
        description: t("case_view.desc_ask", "Sahayak returned a research response with cited evidence.") 
      });
    } catch (error) {
      toast.error(t("common.error", "Sahayak could not answer"), { 
        description: getApiErrorMessage(error, t("common.error_desc", "Please try the question again.")) 
      });
    }
  }

  if (isLoading || !caseItem) return <div className="space-y-5"><Skeleton className="h-8 w-40" /><Skeleton className="h-16 w-2/3" /><div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-64 lg:col-span-2" /><Skeleton className="h-64" /></div></div>;

  const result = analyze.data ?? caseItem.analysis ?? undefined;
  const insufficient = result?.result_type === "ABSTENTION";

  async function runAnalysis() {
    if (!caseItem) return;
    try {
      await analyze.mutateAsync({ jurisdiction, as_of_date: caseItem.as_of_date, tool: tool ?? undefined });
      toast.success(t("verify.facts_updated", "Analysis Updated"), { 
        description: t("verify.facts_updated_desc", "The latest evidence-grounded assessment is now available.") 
      });
    } catch (error) {
      toast.error(t("common.error", "Analysis could not be completed"), { 
        description: getApiErrorMessage(error, t("common.error_desc", "Please try the analysis again.")) 
      });
    }
  }

  return (
    <div>
      <Breadcrumb items={[{ label: t("nav.dashboard", "Dashboard"), href: "/dashboard" }, { label: caseItem.title }]} />
      <PageHeader 
        title={caseItem.title} 
        description={isAsk ? t("case_view.desc_ask", "A grounded answer with supporting citations and an assessment-confidence indicator.") : t("case_view.desc_default", "Backend analysis is the source of truth. This screen only presents returned classification, evidence, confidence and next actions.")} 
        action={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <ShareCaseButton />
            <Button variant="secondary" size="sm" onClick={() => router.push(`/cases/${id}/report`)}>
              <Download size={14} className="sm:size-4" /> {t("case_view.report", "Report")}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => router.push(`/cases/${id}/history`)}>
              <History size={14} className="sm:size-4" /> {t("case_view.history", "History")}
            </Button>
          </div>
        } 
      />

      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-card border border-line bg-white p-3 sm:p-4">
        <div>
          <p className="eyebrow text-[10px] sm:text-[11px]">{t("case_view.research_context", "Research context")}</p>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-semibold">{t("case_view.as_of", "As of")} {caseItem.as_of_date}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <JurisdictionToggle value={jurisdiction} onChange={setJurisdiction} />
          {!isAsk && (
            <Button size="sm" onClick={runAnalysis} disabled={analyze.isPending} className="sm:h-10 sm:px-4">
              {analyze.isPending ? t("case_view.running_analysis", "Running analysis…") : result ? t("case_view.rerun_analysis", "Re-run analysis") : t("case_view.run_analysis", "Run analysis")} <ArrowRight size={15} />
            </Button>
          )}
        </div>
      </div>

      {isAsk ? (
        <div className="space-y-4 sm:space-y-6">
          <Card className="p-4 sm:p-6 bg-[#EEF5FF] border-[#D6E3FF]">
            <p className="eyebrow text-[10px] sm:text-[11px]">{t("case_view.your_question", "Your question")}</p>
            <p className="mt-1.5 sm:mt-2 text-sm sm:text-base leading-6 sm:leading-7 text-navy">{caseItem.description.split("\n\n")[0].replace(/^Question:\s*/i, "")}</p>
          </Card>
          {assistant.data ? <GroundedAnswer result={assistant.data} /> : (
            <Card className="p-5 sm:p-8 text-center">
              <div className="mx-auto flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#EEF5FF] text-navy"><FileCheck2 size={20} className="sm:size-6" /></div>
              <h2 className="serif mt-3 sm:mt-4 text-2xl sm:text-3xl text-forest">{t("case_view.ready_answer_title", "Ready for a grounded answer")}</h2>
              <p className="mx-auto mt-1.5 sm:mt-2 max-w-xl text-xs sm:text-sm leading-5 sm:leading-6 text-ink/65">{t("case_view.ready_answer_desc", "Sahayak will retrieve supporting evidence, validate citations and return an assessment-confidence indicator.")}</p>
              <Button size="sm" className="mt-4 sm:mt-5 sm:h-11 sm:px-5" onClick={runAskAnswer} disabled={assistant.isPending}>
                {assistant.isPending ? t("case_view.grounding_answer", "Grounding answer…") : t("case_view.get_grounded_answer", "Get grounded answer")} <ArrowRight size={15} />
              </Button>
            </Card>
          )}
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={runAskAnswer} disabled={assistant.isPending}>
              {assistant.isPending ? t("case_view.refreshing", "Refreshing…") : t("case_view.refresh_answer", "Refresh answer")}
            </Button>
          </div>
          <Disclaimer />
        </div>
      ) : (
        <>
          {!result && !caseItem.confidence && (
            <Card className="p-5 sm:p-8 text-center">
              <div className="mx-auto flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#EEF5FF] text-navy"><FileCheck2 size={20} className="sm:size-6" /></div>
              <h2 className="serif mt-3 sm:mt-4 text-2xl sm:text-3xl text-forest">{t("case_view.facts_ready_title", "Facts confirmed. Ready for analysis.")}</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink/65">{t("case_view.facts_ready_desc", "Run the backend analysis to retrieve the classification, applicable rule, evidence and confidence breakdown.")}</p>
            </Card>
          )}
          {(result || caseItem.confidence) && isAbs && result?.abs_assessment && (
            <div className="space-y-6">
              <AbsObligations assessment={result.abs_assessment} jurisdiction={jurisdiction} />
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => router.push(`/cases/${id}/explain?tool=abs`)}>
                  {t("case_view.explainability", "View explainability")} <ExternalLink size={15} />
                </Button>
              </div>
              <Disclaimer />
            </div>
          )}

          {(result || caseItem.confidence) && isTkdl && (
            <div className="space-y-6">
              <PriorArtCandidates candidates={result?.prior_art ?? []} />
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <Card className="p-6">
                  <p className="eyebrow">{t("case_view.search_scope", "Search scope")}</p>
                  <h2 className="serif mt-1 text-2xl text-forest">{t("case_view.what_searched", "What was searched")}</h2>
                  <div className="mt-5 space-y-4 text-sm leading-6 text-ink/70">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{t("case_view.formulation_technique", "Formulation / technique")}</p>
                      <p className="mt-1">{caseItem.tool_input && typeof caseItem.tool_input["formulation_technique_description"] === "string" ? t(caseItem.tool_input["formulation_technique_description"]) : t(caseItem.description.split("\n\n")[0])}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{t("case_view.believed_novel", "Believed novel feature")}</p>
                      <p className="mt-1">{caseItem.tool_input && typeof caseItem.tool_input["believed_novel_feature"] === "string" ? t(caseItem.tool_input["believed_novel_feature"]) : t("case_view.search_scope", "Search scope supplied by researcher.")}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{t("case_view.source_ref", "Source reference")}</p>
                      <p className="mt-1">{caseItem.tool_input && typeof caseItem.tool_input["source_text_or_oral_tradition_reference"] === "string" && caseItem.tool_input["source_text_or_oral_tradition_reference"] ? t(caseItem.tool_input["source_text_or_oral_tradition_reference"]) : t("case_view.no_source_ref", "No source reference supplied.")}</p>
                    </div>
                  </div>
                </Card>
                <div className="space-y-6">
                  <Card className="p-6">
                    <p className="eyebrow">{t("case_view.access_posture", "Access posture")}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/70">{t("case_view.access_posture_desc", "Public TKDL information may be shown when returned by the backend. Restricted TKDL entry content is not displayed by this prototype.")}</p>
                  </Card>
                  <Card className="p-6">
                    <p className="eyebrow">{t("case_view.next_action", "Next action")}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/75">{result?.next_action ? t(result.next_action) : t("case_view.default_next_action", "Review the candidate records and follow up through the appropriate source registry or human facilitator.")}</p>
                    <div className="mt-5">
                      <Button variant="secondary" onClick={() => router.push(`/cases/${id}/explain?tool=tkdl`)}>
                        {t("case_view.explainability", "View explainability")} <ExternalLink size={15} />
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
              <Disclaimer />
            </div>
          )}

          {(result || caseItem.confidence) && isIpNavigator && result?.ip_routes && (
            <div className="space-y-6">
              <IpRouteMatrix routes={result.ip_routes} />
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)]">
                <div className="space-y-6">
                  <Card className="p-6">
                    <p className="eyebrow">{t("case_view.navigator_scope", "Navigator scope")}</p>
                    <h2 className="serif mt-1 text-2xl text-forest">{t("case_view.what_evaluated", "What the backend evaluated")}</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="rounded-lg bg-[#F6F8FC] p-4">
                        <p className="eyebrow">{t("explain.jurisdiction", "Jurisdiction")}</p>
                        <p className="mt-2 font-semibold">{caseItem.jurisdiction === "INDIA" ? t("common.india", "India") : t("common.international", "International")}</p>
                      </div>
                      <div className="rounded-lg bg-[#F6F8FC] p-4">
                        <p className="eyebrow">{t("explain.as_of_date", "As-of date")}</p>
                        <p className="mt-2 font-semibold">{caseItem.as_of_date}</p>
                      </div>
                      <div className="rounded-lg bg-[#F6F8FC] p-4">
                        <p className="eyebrow">{t("case_view.routes_selected", "Routes selected")}</p>
                        <p className="mt-2 font-semibold">{result.ip_routes.length}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="flex items-center gap-3">
                      <Gavel className="text-navy" size={21} />
                      <h2 className="serif text-2xl text-forest">{t("case_view.supporting_evidence", "Supporting evidence")}</h2>
                    </div>
                    <div className="mt-5 space-y-4">
                      {result.evidence.map(e => (
                        <div key={e.id} className="rounded-lg border border-line p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-bold">{t(e.title)}</p>
                              <p className="mt-1 text-xs text-ink/55">{t(e.source_type)} · {e.citation}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <TextToSpeech text={e.excerpt} />
                              <Badge tone={e.validated ? "success" : "gold"}>
                                {e.validated ? t("case_view.validated", "Validated") : t("case_view.review", "Review")}
                              </Badge>
                            </div>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-ink/70">{t(e.excerpt)}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
                <div className="space-y-6">
                  <Card className="p-6">
                    <p className="eyebrow">{t("case_view.next_action", "Next action")}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/75">{result.next_action ? t(result.next_action) : ""}</p>
                    <div className="mt-5 flex flex-col gap-2">
                      <Button variant="secondary" onClick={() => router.push(`/cases/${id}/explain?tool=ip-navigator`)}>
                        {t("case_view.explainability", "View explainability")} <ExternalLink size={15} />
                      </Button>
                    </div>
                  </Card>
                  <Disclaimer />
                </div>
              </div>
            </div>
          )}

          {(result || caseItem.confidence) && isRegulatory && result?.regulatory_assessment && (
            <div className="space-y-6">
              <RegulatoryPathway assessment={result.regulatory_assessment} />
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <Card className="p-6">
                  <p className="eyebrow">{t("case_view.research_context", "Research context")}</p>
                  <h2 className="serif mt-1 text-2xl text-forest">{t("case_view.reg_inputs_considered", "Regulatory inputs considered")}</h2>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 text-sm">
                    {[
                      [t("case_view.product_form", "Product form"), "product_form"],
                      [t("case_view.intended_use", "Intended use"), "intended_use"],
                      [t("case_view.claims", "Claims"), "claims"],
                      [t("case_view.dosage_directions", "Dosage / directions"), "dosage_directions"],
                      [t("case_view.marketing_channel", "Marketing channel"), "marketing_channel"]
                    ].map(([label, key]) => (
                      <div key={key} className="rounded-lg bg-[#F6F8FC] p-4">
                        <p className="eyebrow">{label}</p>
                        <p className="mt-2 leading-6 text-ink/75">{caseItem.tool_input && typeof caseItem.tool_input[key] === "string" ? t(caseItem.tool_input[key] as string) : t("case_view.input_not_supplied", "Backend input not supplied")}</p>
                      </div>
                    ))}
                  </div>
                </Card>
                <div className="space-y-6">
                  <Card className="p-6">
                    <p className="eyebrow">{t("case_view.next_action", "Next action")}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/75">{result.next_action ? t(result.next_action) : ""}</p>
                    <div className="mt-5">
                      <Button variant="secondary" onClick={() => router.push(`/cases/${id}/explain?tool=regulatory`)}>
                        {t("case_view.explainability", "View explainability")} <ExternalLink size={15} />
                      </Button>
                    </div>
                  </Card>
                  <Disclaimer />
                </div>
              </div>
            </div>
          )}

          {(result || caseItem.confidence) && !isIpNavigator && !isAbs && !isTkdl && !isRegulatory && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)]">
              <div className="space-y-6">
                {isClassifier && (
                  <Card className="border-[#D6E3FF] bg-[#EEF5FF] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="eyebrow">{t("case_view.reg_pipeline_eyebrow", "Regulatory classification pipeline")}</p>
                        <h2 className="serif mt-1 text-2xl text-navy">{t("case_view.reg_pipeline_title", "Structured formulation assessment")}</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-navy/70">{t("case_view.reg_pipeline_desc", "The classification below is the backend assessment for the structured ingredient, source-text, processing, claims and modification facts you supplied.")}</p>
                      </div>
                      <Badge tone="navy">{t("case_view.backend_result", "Backend result")}</Badge>
                    </div>
                  </Card>
                )}
                <Card className={`p-7 ${insufficient ? "border-[#E8C5C0]" : "botanical"}`}>
                  <div className="relative z-10">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="eyebrow">{t("case_view.classification", "Classification")}</p>
                        <h2 className={`serif mt-2 text-5xl ${insufficient ? "text-[#8B2C25]" : "text-forest"}`}>{t(result?.classification ?? caseItem.classification ?? "")}</h2>
                      </div>
                    </div>
                    {insufficient ? (
                      <div className="mt-7 rounded-lg bg-[#FFF1EF] p-5">
                        <div className="flex gap-3">
                          <AlertTriangle className="shrink-0 text-[#BA1A1A]" />
                          <div>
                            <p className="font-bold text-[#93000A]">{t("case_view.insufficient_evidence_title", "Insufficient Grounded Evidence")}</p>
                            <p className="mt-1 text-sm leading-6 text-[#93000A]/75">{t("case_view.insufficient_evidence_desc", "The available evidence is not sufficient to support a reliable assessment.")}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-7 grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border border-line bg-white p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="eyebrow">{t("case_view.triggered_rule", "Triggered rule")}</p>
                              <p className="mt-2 font-bold">{result?.applicable_rule?.id ? t(result.applicable_rule.id) : t("case_view.backend_pending", "Backend pending")}</p>
                              <p className="mt-1 text-sm text-ink/65">{result?.applicable_rule?.title ? t(result.applicable_rule.title) : t("case_view.no_rule_supplied", "No rule supplied")}</p>
                            </div>
                            {result?.applicable_rule?.title && <TextToSpeech text={result.applicable_rule.title} />}
                          </div>
                        </div>
                        <div className="rounded-lg border border-line bg-white p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="eyebrow">{t("case_view.citation", "Citation")}</p>
                              <p className="mt-2 font-bold">{result?.applicable_rule?.citation ? t(result.applicable_rule.citation) : t("case_view.backend_citation_pending", "Backend citation pending")}</p>
                            </div>
                            {result?.applicable_rule?.citation && <TextToSpeech text={result.applicable_rule.citation} />}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
                {result && (
                  <>
                    <Card className="p-6">
                      <div className="flex items-center gap-3">
                        <Gavel className="text-navy" size={21} />
                        <h2 className="serif text-2xl text-forest">{t("case_view.evidence", "Evidence")}</h2>
                      </div>
                      <div className="mt-5 space-y-4">
                        {result.evidence?.map(e => (
                          <div key={e.id} className="rounded-lg border border-line p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-bold">{t(e.title)}</p>
                                <p className="mt-1 text-xs text-ink/55">{t(e.source_type)} · {e.citation}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <TextToSpeech text={e.excerpt} />
                                <Badge tone={e.validated ? "success" : "gold"}>
                                  {e.validated ? t("case_view.validated", "Validated") : t("case_view.review", "Review")}
                                </Badge>
                              </div>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-ink/70">{t(e.excerpt)}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                    <Card className="p-6">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="text-navy" size={21} />
                        <h2 className="serif text-2xl text-forest">{t("case_view.abs_tkdl_posture", "ABS & TKDL posture")}</h2>
                      </div>
                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg bg-[#F6F8FC] p-4">
                          <p className="eyebrow">{t("case_view.abs_indication", "ABS indication")}</p>
                          <p className="mt-2 text-sm leading-6">{result.abs_indication ? t(result.abs_indication) : ""}</p>
                        </div>
                        <div className="rounded-lg bg-[#F6F8FC] p-4">
                          <p className="eyebrow">{t("case_view.tkdl_indication", "TKDL indication")}</p>
                          <p className="mt-2 text-sm leading-6">{result.tkdl_indication ? t(result.tkdl_indication) : ""}</p>
                        </div>
                      </div>
                    </Card>
                  </>
                )}
              </div>
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="eyebrow">{t("case_view.next_action", "Next action")}</p>
                      <p className="mt-2 text-sm leading-6 text-ink/75">{result?.next_action ? t(result.next_action) : t("case_view.no_next_action", "Analysis has not yet returned a next action.")}</p>
                    </div>
                    {result?.next_action && <TextToSpeech text={result.next_action} />}
                  </div>
                  <div className="mt-5 flex flex-col gap-2">
                    <Button variant="secondary" onClick={() => router.push(`/cases/${id}/explain`)} disabled={!result}>
                      {t("case_view.explainability", "View explainability")} <ExternalLink size={15} />
                    </Button>
                    <Button 
                      variant="gold" 
                      onClick={async () => { 
                        try { 
                          await escalate.mutateAsync("Human IP facilitator review requested."); 
                          toast.success(t("case_view.review_requested", "Review Requested"), { 
                            description: t("case_view.review_requested_desc", "The case has been queued for human review.") 
                          }); 
                        } catch (error) { 
                          toast.error(t("common.error", "Review request failed"), { 
                            description: getApiErrorMessage(error, t("common.error_desc", "Please try again.")) 
                          }); 
                        } 
                      }} 
                      disabled={escalate.isPending}
                    >
                      {escalate.isPending ? t("case_view.requesting_review", "Requesting review…") : t("case_view.request_human_review", "Request human review")}
                    </Button>
                  </div>
                </Card>
                {result?.limitations?.length ? (
                  <Card className="p-6">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="eyebrow">{t("case_view.limitations", "Limitations")}</p>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                          {result.limitations.map(item => <li key={item}>• {t(item)}</li>)}
                        </ul>
                      </div>
                      <TextToSpeech text={result.limitations.join('. ')} />
                    </div>
                  </Card>
                ) : null}
                <Disclaimer />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
