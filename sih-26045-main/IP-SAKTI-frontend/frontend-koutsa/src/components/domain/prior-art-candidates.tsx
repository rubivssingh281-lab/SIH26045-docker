import { FileSearch, LockKeyhole, SearchCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PriorArtCandidate } from "@/types";

export function PriorArtCandidates({ candidates }: { candidates: PriorArtCandidate[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-line bg-[#F8FAFD] p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF3FF] text-navy"><SearchCheck size={21} /></div>
          <div>
            <p className="eyebrow">TKDL / prior-art signals</p>
            <h2 className="serif mt-1 text-2xl text-forest">Potentially relevant records</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/65">These are source candidates returned by the backend. They are not a legal novelty or patentability determination.</p>
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
                  <p className="font-bold text-forest">{candidate.title}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink/50">{candidate.source}</p>
                </div>
                <Badge tone={restricted ? "gold" : "success"}>{restricted ? "Restricted" : "Public"}</Badge>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                <div className="rounded-lg bg-[#F6F8FC] p-4">
                  <p className="eyebrow">Relevance note</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{candidate.relevance}</p>
                </div>
                <div className="flex min-w-[190px] items-start gap-2 rounded-lg border border-line p-4 text-xs leading-5 text-ink/60">
                  {restricted ? <LockKeyhole size={16} className="mt-0.5 shrink-0 text-gold" /> : <FileSearch size={16} className="mt-0.5 shrink-0 text-emerald" />}
                  <span>{candidate.access_note ?? (restricted ? "Access-restricted source. No entry content is shown in this prototype." : "Publicly viewable source candidate returned by the backend.")}</span>
                </div>
              </div>
            </div>
          );
        }) : <div className="p-8 text-center text-sm text-ink/60">No prior-art candidates were returned for this search scope.</div>}
      </div>
    </Card>
  );
}
