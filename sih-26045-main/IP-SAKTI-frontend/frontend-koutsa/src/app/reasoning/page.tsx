"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Brain, CheckCircle2, ChevronRight, CircleDashed, Loader2, Network, Plus, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/domain/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TextToSpeech } from "@/components/ui/text-to-speech";
import { KnowledgeGraphView } from "@/components/domain/knowledge-graph-view";
import { RadarChart } from "@/components/domain/radar-chart";
import { useLanguage } from "@/components/providers/language-provider";
import { agentApi, graphApi, getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AgentResult, ConfidenceBand, GraphData } from "@/types";

const COLORS = ["#2563EB", "#F97316", "#16A34A", "#DC2626", "#7C3AED"];
const MAX_ASPECTS = 5;

const bandTone: Record<ConfidenceBand, "success" | "gold" | "danger" | "default"> = {
  HIGH: "success", MEDIUM: "gold", LOW: "danger", INSUFFICIENT: "default",
};

const stepIcon = (status: string) =>
  status === "success" ? <CheckCircle2 size={15} className="text-forest" />
    : status === "warning" ? <TriangleAlert size={15} className="text-gold" />
    : status === "error" ? <AlertTriangle size={15} className="text-[#93000A]" />
    : <CircleDashed size={15} className="text-ink/40" />;

interface Aspect { id: string; label: string; query: string; formulation: string; jurisdiction: "India" | "International"; }
interface RunResult { label: string; color: string; result: AgentResult; }

let _seq = 0;
const newAspect = (label: string): Aspect => { _seq += 1; return { id: `a${_seq}-${Date.now()}`, label, query: "", formulation: "", jurisdiction: "India" }; };

function mergeGraphs(results: RunResult[]): GraphData {
  const nodes = new Map<string, GraphData["nodes"][number]>();
  const edges = new Map<string, GraphData["edges"][number]>();
  for (const r of results) {
    for (const n of r.result.subgraph.nodes) nodes.set(n.id, n);
    for (const e of r.result.subgraph.edges) edges.set(`${e.source}->${e.target}:${e.relation}`, e);
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

export default function ReasoningPage() {
  const { t } = useLanguage();
  const [aspects, setAspects] = useState<Aspect[]>(() => [newAspect("Aspect 1")]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ i: number; total: number } | null>(null);
  const [results, setResults] = useState<RunResult[] | null>(null);
  const [fullGraph, setFullGraph] = useState<GraphData | null>(null);
  const [showFull, setShowFull] = useState(false);

  const update = (id: string, patch: Partial<Aspect>) => setAspects(a => a.map(x => x.id === id ? { ...x, ...patch } : x));
  const addAspect = () => setAspects(a => a.length < MAX_ASPECTS ? [...a, newAspect(`Aspect ${a.length + 1}`)] : a);
  const removeAspect = (id: string) => setAspects(a => a.length > 1 ? a.filter(x => x.id !== id) : a);

  const runAll = async () => {
    const active = aspects.filter(a => a.query.trim());
    if (!active.length) { toast.error(t("reasoning.empty")); return; }
    setLoading(true); setResults(null); setShowFull(false);
    const out: RunResult[] = [];
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      setProgress({ i: i + 1, total: active.length });
      try {
        const result = await agentApi.query({ query: a.query.trim(), jurisdiction: a.jurisdiction, formulation: a.formulation.trim() });
        out.push({ label: a.label.trim() || `Aspect ${i + 1}`, color: COLORS[i % COLORS.length], result });
      } catch (err) {
        toast.error(`${a.label}: ${getApiErrorMessage(err, t("reasoning.error"))}`);
      }
    }
    setProgress(null);
    setResults(out.length ? out : null);
    setLoading(false);
  };

  const toggleFull = async () => {
    if (!showFull && !fullGraph) {
      try { setFullGraph(await graphApi.full()); } catch { toast.error(t("reasoning.error")); return; }
    }
    setShowFull(v => !v);
  };

  const radar = useMemo(() => {
    if (!results?.length) return null;
    const axes = results[0].result.radar.map(a => a.label);
    const series = results.map(r => ({ label: r.label, color: r.color, values: r.result.radar.map(a => a.score) }));
    return { axes, series };
  }, [results]);

  const graphToShow = showFull ? fullGraph : (results ? mergeGraphs(results) : null);

  return (
    <div>
      <PageHeader eyebrow={t("reasoning.eyebrow")} title={t("reasoning.title")} description={t("reasoning.description")} />

      {/* Multi-aspect input */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="serif text-lg text-forest">{t("reasoning.aspects_title")}</h2>
          <span className="text-xs text-ink/50">{aspects.length}/{MAX_ASPECTS}</span>
        </div>
        <p className="mt-1 text-sm text-ink/60">{t("reasoning.aspects_hint")}</p>

        <div className="mt-4 space-y-4">
          {aspects.map((a, i) => (
            <div key={a.id} className="rounded-card border border-line bg-[#FBFCFE] p-4">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                <Input value={a.label} onChange={e => update(a.id, { label: e.target.value })} className="h-9 max-w-[220px] text-sm font-semibold" placeholder={t("reasoning.label_placeholder")} />
                <div className="ml-auto inline-flex rounded-control border border-line bg-white p-0.5">
                  {(["India", "International"] as const).map(j => (
                    <button key={j} onClick={() => update(a.id, { jurisdiction: j })} className={cn("rounded-md px-2.5 py-1 text-xs font-semibold transition", a.jurisdiction === j ? "bg-forest text-white" : "text-ink/55 hover:bg-mist")}>{j === "India" ? t("common.india", "India") : t("common.international", "International")}</button>
                  ))}
                </div>
                {aspects.length > 1 && <button onClick={() => removeAspect(a.id)} className="rounded-lg p-1.5 text-ink/40 hover:bg-mist hover:text-[#93000A]" aria-label={t("reasoning.remove_aspect", "Remove aspect")}><X size={16} /></button>}
              </div>
              <Input value={a.query} onChange={e => update(a.id, { query: e.target.value })} className="mt-3" placeholder={t("reasoning.query_placeholder")} />
              <Textarea value={a.formulation} onChange={e => update(a.id, { formulation: e.target.value })} className="mt-2 min-h-16" placeholder={t("reasoning.formulation_placeholder")} />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={addAspect} disabled={aspects.length >= MAX_ASPECTS}><Plus size={16} /> {t("reasoning.add_aspect")}</Button>
          <Button onClick={runAll} disabled={loading}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> {progress ? `${t("reasoning.running")} ${progress.i}/${progress.total}` : t("reasoning.running")}</> : <><Brain size={16} /> {t("reasoning.run")}</>}
          </Button>
        </div>
      </Card>

      {results && radar && (
        <div className="mt-6 space-y-6">
          {/* Radar coverage */}
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-[#F3F7FC] px-6 py-4"><h2 className="serif text-xl text-forest">{t("reasoning.coverage")}</h2><p className="mt-0.5 text-xs text-ink/55">{t("reasoning.coverage_hint")}</p></div>
            <div className="p-6"><RadarChart axes={radar.axes} series={radar.series} /></div>
          </Card>

          {/* Merged knowledge graph */}
          {graphToShow && graphToShow.nodes.length > 0 && (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-[#F3F7FC] px-6 py-4">
                <div className="flex items-center gap-2"><Network size={17} className="text-navy" /><h2 className="serif text-xl text-forest">{t("reasoning.graph")}</h2></div>
                <button onClick={toggleFull} className="flex items-center gap-1 text-sm font-bold text-gold hover:underline">{showFull ? t("reasoning.show_relevant") : t("reasoning.show_full")} <ChevronRight size={14} /></button>
              </div>
              <div className="p-6"><KnowledgeGraphView data={graphToShow} /></div>
            </Card>
          )}

          {/* Per-aspect answers */}
          {results.map((r, idx) => (
            <Card key={idx} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4" style={{ background: `${r.color}0D` }}>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: r.color }} />
                  <h2 className="serif text-lg text-forest">{r.label}</h2>
                  {r.result.classification.matched && r.result.classification.label && <Badge tone="navy">{t(r.result.classification.label)}</Badge>}
                  <Badge tone={bandTone[r.result.confidence.band]}>{t(r.result.confidence.band)}</Badge>
                  <Badge tone="default">{r.result.jurisdiction === "India" ? t("common.india", "India") : t("common.international", "International")}</Badge>
                </div>
                <TextToSpeech text={r.result.answer} />
              </div>
              <div className="p-6">
                {r.result.abstained && <div className="mb-3 flex items-center gap-2 rounded-control border border-line bg-mist px-3 py-2 text-sm font-semibold text-navy"><TriangleAlert size={15} /> {t("reasoning.abstained")}</div>}
                {r.result.ai_unavailable && !r.result.abstained && <div className="mb-3 flex items-center gap-2 rounded-control border border-gold/40 bg-[#FFF8EC] px-3 py-2 text-xs font-semibold text-[#624000]"><AlertTriangle size={14} /> {t("reasoning.ai_unavailable")}</div>}
                <div className="whitespace-pre-wrap text-sm leading-7 text-ink/80">{r.result.answer}</div>
                <div className="mt-3 rounded-control border border-line bg-[#FFF8EC] px-3 py-2 text-xs leading-5 text-[#624000]">{t(r.result.disclaimer)} {t(r.result.escalation)}</div>

                <details className="mt-4 rounded-control border border-line bg-[#FAFBFD] p-3">
                  <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-bold text-navy"><Network size={14} /> {t("reasoning.trace")}</summary>
                  <ol className="mt-2 space-y-2">
                    {r.result.trace.steps.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <div className="mt-0.5">{stepIcon(s.status)}</div>
                        <div><p className="text-sm font-semibold text-navy">{t(s.title)}</p><p className="text-xs text-ink/60">{t(s.details)}</p></div>
                      </li>
                    ))}
                  </ol>
                </details>

                <details className="mt-2 rounded-control border border-line bg-[#FAFBFD] p-3">
                  <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-bold text-navy"><BookOpen size={14} /> {t("reasoning.citations")} ({r.result.citations.length})</summary>
                  <ul className="mt-2 space-y-2">
                    {r.result.citations.map((c, i) => (
                      <li key={i} className="text-sm">
                        <span className="rounded bg-navy/10 px-1.5 py-0.5 text-[10px] font-bold text-navy">{c.ref}</span>
                        <span className="ml-2 font-semibold text-ink/85">{t(c.source_title)}</span>
                        <span className="ml-1 text-xs text-ink/55">— {t(c.citation)}</span>
                        {c.source_url?.startsWith("http") && <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs font-bold text-gold hover:underline">{t("reasoning.source_link", "source")}</a>}
                      </li>
                    ))}
                    {r.result.citations.length === 0 && <li className="text-sm text-ink/50">{t("reasoning.no_citations")}</li>}
                  </ul>
                </details>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
