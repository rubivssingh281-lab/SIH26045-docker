"use client";

import { useState } from "react";
import { AlertTriangle, BookOpen, ChevronDown, Globe2, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/domain/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TextToSpeech } from "@/components/ui/text-to-speech";
import { useLanguage } from "@/components/providers/language-provider";
import { jurisdictionDiffApi, getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { JurisdictionConcern, JurisdictionDiff, JurisdictionEvidence, JurisdictionOfficialSource } from "@/types";

type View = "diff" | "india" | "international";

function concernTone(concern: JurisdictionConcern): "success" | "gold" | "danger" | "default" {
  return concern === "LOW" ? "success" : concern === "MODERATE" ? "gold" : concern === "HIGH" ? "danger" : "default";
}

function EvidenceList({ items, emptyLabel, sourceUnavailable, whyLabel, t }: { items: JurisdictionEvidence[]; emptyLabel: string; sourceUnavailable: string; whyLabel: string; t: (k: string, f?: string) => string }) {
  if (!items.length) return <p className="text-sm text-ink/55">{emptyLabel}</p>;
  return (
    <div className="space-y-4">
      {items.map((ev, i) => {
        const hasUrl = ev.source_url.startsWith("http");
        return (
          <div key={`${ev.source_title}-${i}`} className="border-b border-line pb-3 last:border-0 last:pb-0">
            <p className="text-sm font-bold text-navy">[{i + 1}] {t(ev.source_title)}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-ink/45">{t(ev.source_type)} · {ev.jurisdiction === "INDIA" ? t("common.india", "India") : t("common.international", "International")}</p>
            <p className="mt-1.5 text-sm leading-6 text-ink/70"><span className="font-semibold text-ink">{whyLabel}:</span> {t(ev.relevance)}</p>
            {hasUrl ? (
              <a href={ev.source_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-bold text-gold hover:underline">{ev.source_url}</a>
            ) : (
              <p className="mt-1 text-xs text-ink/45">{sourceUnavailable}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SourceLinks({ sources }: { sources: JurisdictionOfficialSource[] }) {
  return (
    <ul className="space-y-2">
      {sources.map((s, i) => (
        <li key={`${s.source_title}-${i}`} className="text-sm">
          <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest hover:underline">{s.source_title}</a>
          <span className="ml-2 text-xs text-ink/45">{s.jurisdiction}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ComparePage() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [formulation, setFormulation] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [view, setView] = useState<View>("diff");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JurisdictionDiff | null>(null);

  const run = async () => {
    if (!query.trim() && !formulation.trim()) {
      toast.error(t("compare.empty_input"));
      return;
    }
    setLoading(true);
    try {
      const data = await jurisdictionDiffApi.run({
        query: query.trim(),
        formulation: formulation.trim(),
        ingredients: ingredients.split(",").map(s => s.trim()).filter(Boolean),
        jurisdiction: "diff",
      });
      setResult(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("compare.error")));
    } finally {
      setLoading(false);
    }
  };

  const showIndia = view !== "international";
  const showIntl = view !== "india";

  return (
    <div>
      <PageHeader eyebrow={t("compare.eyebrow")} title={t("compare.title")} description={t("compare.description")} />

      {/* Input */}
      <Card className="p-4 sm:p-6">
        <label className="text-xs sm:text-sm font-bold text-navy" htmlFor="jd-query">{t("compare.query_label")}</label>
        <Input id="jd-query" className="mt-1.5 sm:mt-2 text-xs sm:text-sm h-10 sm:h-11" value={query} onChange={e => setQuery(e.target.value)} placeholder={t("compare.query_placeholder")} />
        
        <label className="mt-3.5 sm:mt-5 block text-xs sm:text-sm font-bold text-navy" htmlFor="jd-formulation">{t("compare.formulation_label")}</label>
        <Textarea id="jd-formulation" rows={3} className="mt-1.5 sm:mt-2 text-xs sm:text-sm" value={formulation} onChange={e => setFormulation(e.target.value)} placeholder={t("compare.formulation_placeholder")} />
        
        <label className="mt-3.5 sm:mt-5 block text-xs sm:text-sm font-bold text-navy" htmlFor="jd-ingredients">{t("compare.ingredients_label")}</label>
        <Input id="jd-ingredients" className="mt-1.5 sm:mt-2 text-xs sm:text-sm h-10 sm:h-11" value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder={t("compare.ingredients_placeholder")} />
        
        <div className="mt-4 sm:mt-6">
          <Button onClick={run} disabled={loading} size="sm" className="sm:h-11 sm:px-5">
            {loading ? <><Loader2 size={15} className="animate-spin" /> {t("compare.running")}</> : <><Globe2 size={15} /> {t("compare.run")}</>}
          </Button>
        </div>
      </Card>

      {result && (
        <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          {/* Jurisdiction selector */}
          <div className="flex w-full sm:inline-flex rounded-control border border-line bg-white p-1" role="group" aria-label="Jurisdiction view">
            {([["india", t("compare.view_india")], ["international", t("compare.view_international")], ["diff", t("compare.view_diff")]] as [View, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn(
                  "flex-1 sm:flex-none rounded-lg px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition text-center",
                  view === key ? "bg-forest text-white shadow-sm font-bold" : "text-ink/60 hover:bg-mist"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {result.ai_unavailable && (
            <div className="flex items-center gap-2 rounded-control border border-gold/40 bg-[#FFF8EC] p-3 text-xs sm:text-sm font-semibold text-[#624000]">
              <AlertTriangle size={15} className="shrink-0" /> {t("compare.ai_unavailable")}
            </div>
          )}

          {/* Overall result */}
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-[#F3F7FC] px-4 sm:px-6 py-3 sm:py-4">
              <h2 className="serif text-lg sm:text-xl text-forest">{t("compare.overall_result")}</h2>
            </div>
            <div className="grid gap-3 sm:gap-4 p-4 sm:p-6 md:grid-cols-2">
              {showIndia && (
                <div className="rounded-card border border-line p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink/45">{t("compare.in_india")}</p>
                  <div className="mt-2"><Badge tone={concernTone(result.india.risk_category)}>{t(result.india.risk_category)} {result.india.risk_category === "INSUFFICIENT" ? "" : t("CONCERN")}</Badge></div>
                </div>
              )}
              {showIntl && (
                <div className="rounded-card border border-line p-5">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/45"><Globe2 size={13} /> {t("compare.international")}</p>
                  <div className="mt-2"><Badge tone="navy">{t("compare.country_dependent")}</Badge></div>
                </div>
              )}
            </div>
          </Card>

          {/* Key differences */}
          {view === "diff" && (
            <Card className="overflow-hidden">
              <div className="border-b border-line bg-[#F3F7FC] px-6 py-4"><h2 className="serif text-xl text-forest">{t("compare.key_differences")}</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-ink/45">
                      <th className="px-6 py-3">{t("compare.area")}</th>
                      <th className="px-6 py-3">{t("compare.in_india")}</th>
                      <th className="px-6 py-3">{t("compare.international")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.differences.map((d, i) => (
                      <tr key={`${d.area}-${i}`} className="border-b border-line last:border-0 align-top">
                        <td className="px-6 py-4 font-bold text-navy">{t(d.area)}</td>
                        <td className="px-6 py-4 leading-6 text-ink/75">{t(d.india)}</td>
                        <td className="px-6 py-4 leading-6 text-ink/75">{t(d.international)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* What changes? */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-[#F3F7FC] px-6 py-4">
              <h2 className="serif text-xl text-forest">{t("compare.what_changes")}</h2>
              <TextToSpeech text={`${result.what_changes.india} ${result.what_changes.international} ${result.what_changes.main_difference}`} />
            </div>
            <div className="space-y-5 p-6">
              {showIndia && (
                <div>
                  <p className="text-sm font-bold text-navy">{t("compare.in_india")}</p>
                  <p className="mt-1 text-sm leading-7 text-ink/75">{t(result.what_changes.india)}</p>
                </div>
              )}
              {showIntl && (
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-bold text-navy"><Globe2 size={14} /> {t("compare.international")}</p>
                  <p className="mt-1 text-sm leading-7 text-ink/75">{t(result.what_changes.international)}</p>
                </div>
              )}
              {view === "diff" && (
                <div className="rounded-card border border-forest/20 bg-[#F0F6F3] p-4">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-forest"><Sparkles size={14} /> {t("compare.main_difference")}</p>
                  <p className="mt-1 text-sm leading-7 text-ink/80">{t(result.what_changes.main_difference)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Evidence + Risk */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line bg-[#F3F7FC] px-6 py-4"><BookOpen size={17} className="text-navy" /><h2 className="serif text-xl text-forest">{t("compare.evidence")}</h2></div>
              <div className="p-6">
                <EvidenceList items={result.evidence} emptyLabel={t("compare.source_unavailable")} sourceUnavailable={t("compare.source_unavailable")} whyLabel={t("compare.why_it_matters")} t={t} />
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line bg-[#F3F7FC] px-6 py-4"><ShieldCheck size={17} className="text-navy" /><h2 className="serif text-xl text-forest">{t("compare.risk_interpretation")}</h2></div>
              <div className="space-y-3 p-6 text-sm">
                <div className="flex items-center justify-between"><span className="text-ink/60">{t("compare.ml_risk")}</span><Badge tone={concernTone(result.india.risk_category)}>{t(result.india.risk_category)}</Badge></div>
                <div className="flex items-center justify-between"><span className="text-ink/60">{t("compare.ml_score")}</span><span className="font-bold text-ink/50">N/A</span></div>
                <div className="flex items-center justify-between"><span className="text-ink/60">{t("compare.evidence_strength")}</span><span className="font-bold text-navy">{t(result.india.evidence_strength)}</span></div>
                <div className="flex items-center justify-between"><span className="text-ink/60">{t("compare.confidence")}</span><span className="font-bold text-navy">{t(result.india.confidence)}</span></div>
                <p className="rounded-control border border-line bg-[#FFF8EC] px-3 py-2 text-xs leading-5 text-[#624000]">{t("compare.not_legal_advice")}</p>
                {showIntl && <p className="rounded-control border border-line bg-[#F3F7FC] px-3 py-2 text-xs leading-5 text-ink/60">{t(result.international.ml_score_note)}</p>}

                <details className="rounded-control border border-line bg-[#FAFBFD] px-3 py-2">
                  <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-navy"><ChevronDown size={13} /> {t("compare.advanced_ml")}</summary>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink/60">
                    {Object.entries({ fact_conf: result.india.confidence_detail.fact_conf, rule_fit_conf: result.india.confidence_detail.rule_fit_conf, evidence_conf: result.india.confidence_detail.evidence_conf, citation_conf: result.india.confidence_detail.citation_conf, overall_conf: result.india.confidence_detail.overall_conf }).map(([k, v]) => (
                      <div key={k} className="flex justify-between"><dt>{t(k)}</dt><dd className="font-mono">{Number(v).toFixed(2)}</dd></div>
                    ))}
                  </dl>
                </details>
              </div>
            </Card>
          </div>

          {showIntl && (
            <div className="flex items-start gap-2 rounded-control border border-navy/20 bg-[#F3F7FC] px-4 py-3 text-xs leading-5 text-ink/65">
              <Globe2 size={15} className="mt-0.5 shrink-0" /> {t("compare.intl_note")}
            </div>
          )}

          {/* Common considerations + Limitations */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="serif text-lg text-forest">{t("compare.common_considerations")}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                {result.common_considerations.map((c, i) => <li key={i} className="flex gap-2"><span className="text-forest">•</span> {t(c)}</li>)}
              </ul>
            </Card>
            <Card className="p-6">
              <h2 className="serif text-lg text-forest">{t("compare.limitations")}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                {result.limitations.map((c, i) => <li key={i} className="flex gap-2"><span className="text-gold">•</span> {t(c)}</li>)}
              </ul>
            </Card>
          </div>

          {/* Official sources */}
          <div className="grid gap-6 lg:grid-cols-2">
            {showIndia && <Card className="p-6"><h2 className="serif text-lg text-forest">{t("compare.official_sources")} — {t("compare.in_india")}</h2><div className="mt-3"><SourceLinks sources={result.india.official_sources} /></div></Card>}
            {showIntl && <Card className="p-6"><h2 className="serif text-lg text-forest">{t("compare.official_sources")} — {t("compare.international")}</h2><div className="mt-3"><SourceLinks sources={result.international.official_sources} /></div></Card>}
          </div>

          {result.last_verified && <p className="text-center text-xs text-ink/45">{t("compare.last_verified")}: {result.last_verified}</p>}
        </div>
      )}
    </div>
  );
}
