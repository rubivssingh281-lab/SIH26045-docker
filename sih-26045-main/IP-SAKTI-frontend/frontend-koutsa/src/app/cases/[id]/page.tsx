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

export default function AnalysisPage() {
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
      toast.success("Grounded answer generated", { description: "Sahayak returned a research response with cited evidence." });
    } catch (error) {
      toast.error("Sahayak could not answer", { description: getApiErrorMessage(error, "Please try the question again.") });
    }
  }

  if (isLoading || !caseItem) return <div className="space-y-5"><Skeleton className="h-8 w-40" /><Skeleton className="h-16 w-2/3" /><div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-64 lg:col-span-2" /><Skeleton className="h-64" /></div></div>;

  // Prefer the just-run analysis; fall back to the stored analysis so the full
  // result (evidence, prior art, tool assessments) survives a page reload.
  const result = analyze.data ?? caseItem.analysis ?? undefined;
  // Assessment-confidence UI removed from the frontend (a new interface will replace it).
  // Abstention is a result-level state, independent of the confidence score display.
  const insufficient = result?.result_type === "ABSTENTION";

  async function runAnalysis() {
    if (!caseItem) return;
    try {
      await analyze.mutateAsync({ jurisdiction, as_of_date: caseItem.as_of_date, tool: tool ?? undefined });
      toast.success("Analysis Updated", { description: "The latest evidence-grounded assessment is now available." });
    } catch (error) {
      toast.error("Analysis could not be completed", { description: getApiErrorMessage(error, "Please try the analysis again.") });
    }
  }

  async function downloadReport() {
    try {
      const blob = await caseApi.report(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${id}-case-report.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Case report downloaded");
    } catch (error) {
      toast.error("Report download failed", { description: getApiErrorMessage(error, "Please try again.") });
    }
  }

  return (
    <div>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: caseItem.title }]} />
      <PageHeader title={caseItem.title} description={isAsk ? "A grounded answer with supporting citations and an assessment-confidence indicator." : "Backend analysis is the source of truth. This screen only presents returned classification, evidence, confidence and next actions."} action={<div className="flex flex-wrap gap-2"><ShareCaseButton /><Button variant="secondary" onClick={() => router.push(`/cases/${id}/report`)}><Download size={16} /> Report</Button><Button variant="secondary" onClick={() => router.push(`/cases/${id}/history`)}><History size={16} /> History</Button></div>} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-white p-4">
        <div><p className="eyebrow">Research context</p><p className="mt-1 text-sm font-semibold">As of {caseItem.as_of_date}</p></div>
        <JurisdictionToggle value={jurisdiction} onChange={setJurisdiction} />
        {!isAsk && <Button onClick={runAnalysis} disabled={analyze.isPending}>{analyze.isPending ? "Running analysis…" : result ? "Re-run analysis" : "Run analysis"} <ArrowRight size={16} /></Button>}
      </div>

      {isAsk ? (
        <div className="space-y-6">
          <Card className="p-6 bg-[#EEF5FF] border-[#D6E3FF]">
            <p className="eyebrow">Your question</p>
            <p className="mt-2 text-base leading-7 text-navy">{caseItem.description.split("\n\n")[0].replace(/^Question:\s*/i, "")}</p>
          </Card>
          {assistant.data ? <GroundedAnswer result={assistant.data} /> : (
            <Card className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF5FF] text-navy"><FileCheck2 /></div>
              <h2 className="serif mt-4 text-3xl text-forest">Ready for a grounded answer</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink/65">Sahayak will retrieve supporting evidence, validate citations and return an assessment-confidence indicator.</p>
              <Button className="mt-5" onClick={runAskAnswer} disabled={assistant.isPending}>{assistant.isPending ? "Grounding answer…" : "Get grounded answer"} <ArrowRight size={16} /></Button>
            </Card>
          )}
          <div className="flex justify-end"><Button variant="secondary" onClick={runAskAnswer} disabled={assistant.isPending}>{assistant.isPending ? "Refreshing…" : "Refresh answer"}</Button></div>
          <Disclaimer />
        </div>
      ) : (
        <>
          {!result && !caseItem.confidence && <Card className="p-8 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF5FF] text-navy"><FileCheck2 /></div><h2 className="serif mt-4 text-3xl text-forest">Facts confirmed. Ready for analysis.</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink/65">Run the backend analysis to retrieve the classification, applicable rule, evidence and confidence breakdown.</p></Card>}
          {(result || caseItem.confidence) && isAbs && result?.abs_assessment && <div className="space-y-6">
            <AbsObligations assessment={result.abs_assessment} jurisdiction={jurisdiction} />
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => router.push(`/cases/${id}/explain?tool=abs`)}>View explainability <ExternalLink size={15} /></Button>
            </div>
            <Disclaimer />
          </div>}

          {(result || caseItem.confidence) && isTkdl && <div className="space-y-6">
            <PriorArtCandidates candidates={result?.prior_art ?? []} />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <Card className="p-6">
                <p className="eyebrow">Search scope</p>
                <h2 className="serif mt-1 text-2xl text-forest">What was searched</h2>
                <div className="mt-5 space-y-4 text-sm leading-6 text-ink/70">
                  <div><p className="text-xs font-bold uppercase tracking-wide text-ink/50">Formulation / technique</p><p className="mt-1">{caseItem.tool_input && typeof caseItem.tool_input["formulation_technique_description"] === "string" ? caseItem.tool_input["formulation_technique_description"] : caseItem.description.split("\n\n")[0]}</p></div>
                  <div><p className="text-xs font-bold uppercase tracking-wide text-ink/50">Believed novel feature</p><p className="mt-1">{caseItem.tool_input && typeof caseItem.tool_input["believed_novel_feature"] === "string" ? caseItem.tool_input["believed_novel_feature"] : "Search scope supplied by researcher."}</p></div>
                  <div><p className="text-xs font-bold uppercase tracking-wide text-ink/50">Source reference</p><p className="mt-1">{caseItem.tool_input && typeof caseItem.tool_input["source_text_or_oral_tradition_reference"] === "string" && caseItem.tool_input["source_text_or_oral_tradition_reference"] ? caseItem.tool_input["source_text_or_oral_tradition_reference"] : "No source reference supplied."}</p></div>
                </div>
              </Card>
              <div className="space-y-6">
                                <Card className="p-6"><p className="eyebrow">Access posture</p><p className="mt-2 text-sm leading-6 text-ink/70">Public TKDL information may be shown when returned by the backend. Restricted TKDL entry content is not displayed by this prototype.</p></Card>
                <Card className="p-6"><p className="eyebrow">Next action</p><p className="mt-2 text-sm leading-6 text-ink/75">{result?.next_action ?? "Review the candidate records and follow up through the appropriate source registry or human facilitator."}</p><div className="mt-5"><Button variant="secondary" onClick={() => router.push(`/cases/${id}/explain?tool=tkdl`)}>View explainability <ExternalLink size={15} /></Button></div></Card>
              </div>
            </div>
            <Disclaimer />
          </div>}

          {(result || caseItem.confidence) && isIpNavigator && result?.ip_routes && <div className="space-y-6">
            <IpRouteMatrix routes={result.ip_routes} />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)]">
              <div className="space-y-6">
                <Card className="p-6"><p className="eyebrow">Navigator scope</p><h2 className="serif mt-1 text-2xl text-forest">What the backend evaluated</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><div className="rounded-lg bg-[#F6F8FC] p-4"><p className="eyebrow">Jurisdiction</p><p className="mt-2 font-semibold">{caseItem.jurisdiction}</p></div><div className="rounded-lg bg-[#F6F8FC] p-4"><p className="eyebrow">As-of date</p><p className="mt-2 font-semibold">{caseItem.as_of_date}</p></div><div className="rounded-lg bg-[#F6F8FC] p-4"><p className="eyebrow">Routes selected</p><p className="mt-2 font-semibold">{result.ip_routes.length}</p></div></div></Card>
                <Card className="p-6"><div className="flex items-center gap-3"><Gavel className="text-navy" size={21} /><h2 className="serif text-2xl text-forest">Supporting evidence</h2></div><div className="mt-5 space-y-4">{result.evidence.map(e => <div key={e.id} className="rounded-lg border border-line p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">{e.title}</p><p className="mt-1 text-xs text-ink/55">{e.source_type} · {e.citation}</p></div><div className="flex items-center gap-2"><TextToSpeech text={e.excerpt} /><Badge tone={e.validated ? "success" : "gold"}>{e.validated ? "Validated" : "Review"}</Badge></div></div><p className="mt-3 text-sm leading-6 text-ink/70">{e.excerpt}</p></div>)}</div></Card>
              </div>
              <div className="space-y-6"><Card className="p-6"><p className="eyebrow">Next action</p><p className="mt-2 text-sm leading-6 text-ink/75">{result.next_action}</p><div className="mt-5 flex flex-col gap-2"><Button variant="secondary" onClick={() => router.push(`/cases/${id}/explain?tool=ip-navigator`)}>View explainability <ExternalLink size={15} /></Button></div></Card><Disclaimer /></div>
            </div>
          </div>}

          {(result || caseItem.confidence) && isRegulatory && result?.regulatory_assessment && <div className="space-y-6">
            <RegulatoryPathway assessment={result.regulatory_assessment} />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <Card className="p-6"><p className="eyebrow">Research context</p><h2 className="serif mt-1 text-2xl text-forest">Regulatory inputs considered</h2><div className="mt-5 grid gap-3 md:grid-cols-2 text-sm">{[["Product form","product_form"],["Intended use","intended_use"],["Claims","claims"],["Dosage / directions","dosage_directions"],["Marketing channel","marketing_channel"]].map(([label,key]) => <div key={key} className="rounded-lg bg-[#F6F8FC] p-4"><p className="eyebrow">{label}</p><p className="mt-2 leading-6 text-ink/75">{caseItem.tool_input && typeof caseItem.tool_input[key] === "string" ? caseItem.tool_input[key] as string : "Backend input not supplied"}</p></div>)}</div></Card>
              <div className="space-y-6"><Card className="p-6"><p className="eyebrow">Next action</p><p className="mt-2 text-sm leading-6 text-ink/75">{result.next_action}</p><div className="mt-5"><Button variant="secondary" onClick={() => router.push(`/cases/${id}/explain?tool=regulatory`)}>View explainability <ExternalLink size={15} /></Button></div></Card><Disclaimer /></div>
            </div>
          </div>}

          {(result || caseItem.confidence) && !isIpNavigator && !isAbs && !isTkdl && !isRegulatory && <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)]">
            <div className="space-y-6">
              {isClassifier && <Card className="border-[#D6E3FF] bg-[#EEF5FF] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">Regulatory classification pipeline</p>
                    <h2 className="serif mt-1 text-2xl text-navy">Structured formulation assessment</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-navy/70">The classification below is the backend assessment for the structured ingredient, source-text, processing, claims and modification facts you supplied.</p>
                  </div>
                  <Badge tone="navy">Backend result</Badge>
                </div>
              </Card>}
              <Card className={`p-7 ${insufficient ? "border-[#E8C5C0]" : "botanical"}`}>
                <div className="relative z-10"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Classification</p><h2 className={`serif mt-2 text-5xl ${insufficient ? "text-[#8B2C25]" : "text-forest"}`}>{result?.classification ?? caseItem.classification}</h2></div></div>
                {insufficient ? <div className="mt-7 rounded-lg bg-[#FFF1EF] p-5"><div className="flex gap-3"><AlertTriangle className="shrink-0 text-[#BA1A1A]" /><div><p className="font-bold text-[#93000A]">Insufficient Grounded Evidence</p><p className="mt-1 text-sm leading-6 text-[#93000A]/75">The available evidence is not sufficient to support a reliable assessment.</p></div></div></div> : <div className="mt-7 grid gap-4 md:grid-cols-2"><div className="rounded-lg border border-line bg-white p-4"><div className="flex items-start justify-between gap-2"><div><p className="eyebrow">Triggered rule</p><p className="mt-2 font-bold">{result?.applicable_rule?.id ?? "Backend pending"}</p><p className="mt-1 text-sm text-ink/65">{result?.applicable_rule?.title ?? "No rule supplied"}</p></div>{result?.applicable_rule?.title && <TextToSpeech text={result.applicable_rule.title} />}</div></div><div className="rounded-lg border border-line bg-white p-4"><div className="flex items-start justify-between gap-2"><div><p className="eyebrow">Citation</p><p className="mt-2 font-bold">{result?.applicable_rule?.citation ?? "Backend citation pending"}</p></div>{result?.applicable_rule?.citation && <TextToSpeech text={result.applicable_rule.citation} />}</div></div></div>}</div>
              </Card>
              {result && <><Card className="p-6"><div className="flex items-center gap-3"><Gavel className="text-navy" size={21} /><h2 className="serif text-2xl text-forest">Evidence</h2></div><div className="mt-5 space-y-4">{result.evidence?.map(e => <div key={e.id} className="rounded-lg border border-line p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">{e.title}</p><p className="mt-1 text-xs text-ink/55">{e.source_type} · {e.citation}</p></div><div className="flex items-center gap-2"><TextToSpeech text={e.excerpt} /><Badge tone={e.validated ? "success" : "gold"}>{e.validated ? "Validated" : "Review"}</Badge></div></div><p className="mt-3 text-sm leading-6 text-ink/70">{e.excerpt}</p></div>)}</div></Card><Card className="p-6"><div className="flex items-center gap-3"><ShieldCheck className="text-navy" size={21} /><h2 className="serif text-2xl text-forest">ABS & TKDL posture</h2></div><div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-lg bg-[#F6F8FC] p-4"><p className="eyebrow">ABS indication</p><p className="mt-2 text-sm leading-6">{result.abs_indication}</p></div><div className="rounded-lg bg-[#F6F8FC] p-4"><p className="eyebrow">TKDL indication</p><p className="mt-2 text-sm leading-6">{result.tkdl_indication}</p></div></div></Card></>}
            </div>
            <div className="space-y-6"><Card className="p-6"><div className="flex items-start justify-between gap-2"><div><p className="eyebrow">Next action</p><p className="mt-2 text-sm leading-6 text-ink/75">{result?.next_action ?? "Analysis has not yet returned a next action."}</p></div>{result?.next_action && <TextToSpeech text={result.next_action} />}</div><div className="mt-5 flex flex-col gap-2"><Button variant="secondary" onClick={() => router.push(`/cases/${id}/explain`)} disabled={!result}>View explainability <ExternalLink size={15} /></Button><Button variant="gold" onClick={async () => { try { await escalate.mutateAsync("Human IP facilitator review requested."); toast.success("Review Requested", { description: "The case has been queued for human review." }); } catch (error) { toast.error("Review request failed", { description: getApiErrorMessage(error, "Please try again.") }); } }} disabled={escalate.isPending}>{escalate.isPending ? "Requesting review…" : "Request human review"}</Button></div></Card>{result?.limitations?.length ? <Card className="p-6"><div className="flex items-start justify-between gap-2"><div><p className="eyebrow">Limitations</p><ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">{result.limitations.map(item => <li key={item}>• {item}</li>)}</ul></div><TextToSpeech text={result.limitations.join('. ')} /></div></Card> : null}<Disclaimer /></div>
          </div>}
        </>
      )}
    </div>
  );
}
