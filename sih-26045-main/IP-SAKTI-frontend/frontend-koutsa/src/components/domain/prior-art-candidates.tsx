"use client";

import { FileSearch, LockKeyhole, SearchCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PriorArtCandidate } from "@/types";
import { useLanguage } from "@/components/providers/language-provider";

export function PriorArtCandidates({ candidates }: { candidates: PriorArtCandidate[] }) {
  const { t } = useLanguage();
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-line bg-[#F8FAFD] p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF3FF] text-navy"><SearchCheck size={21} /></div>
          <div>
            <p className="eyebrow">{t("case_view.prior_art_signals", "TKDL / prior-art signals")}</p>
            <h2 className="serif mt-1 text-2xl text-forest">{t("case_view.potentially_relevant", "Potentially relevant records")}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/65">{t("case_view.prior_art_desc", "These are source candidates returned by the backend. They are not a legal novelty or patentability determination.")}</p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-line">
        {candidates.length ? candidates.map(candidate => {
          const restricted = candidate.access_status === "RESTRICTED";
          return (
            <div key={candidate.id} className="p-5 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-forest">{t(candidate.title)}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink/50">{t(candidate.source)}</p>
                </div>
                <Badge tone={restricted ? "gold" : "success"}>{restricted ? t("sources.restricted", "Restricted") : t("sources.public", "Public")}</Badge>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                <div className="rounded-lg bg-[#F6F8FC] p-4">
                  <p className="eyebrow">{t("case_view.relevance_note", "Relevance note")}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{t(candidate.relevance)}</p>
                </div>
                <div className="flex min-w-[190px] items-start gap-2 rounded-lg border border-line p-4 text-xs leading-5 text-ink/60">
                  {restricted ? <LockKeyhole size={16} className="mt-0.5 shrink-0 text-gold" /> : <FileSearch size={16} className="mt-0.5 shrink-0 text-emerald" />}
                  <span>{candidate.access_note ? t(candidate.access_note) : (restricted ? t("Access-restricted source. No entry content is shown in this prototype.") : t("Publicly viewable source candidate returned by the backend."))}</span>
                </div>
              </div>
            </div>
          );
        }) : <div className="p-8 text-center text-sm text-ink/60">{t("case_view.no_candidates", "No prior-art candidates were returned for this search scope.")}</div>}
      </div>
    </Card>
  );
}
