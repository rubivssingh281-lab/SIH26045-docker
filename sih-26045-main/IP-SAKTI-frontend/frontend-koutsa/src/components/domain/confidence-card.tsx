import type { ConfidenceScore } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const labels: Array<[keyof ConfidenceScore, string]> = [
  ["fact_conf", "Fact confidence"],
  ["rule_fit_conf", "Rule-fit confidence"],
  ["evidence_conf", "Evidence confidence"],
  ["citation_conf", "Citation confidence"],
  ["overall_conf", "Overall assessment"]
];

export function ConfidenceCard({ confidence }: { confidence: ConfidenceScore }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Confidence</p>
          <h3 className="serif mt-1 text-2xl">Assessment confidence</h3>
        </div>
        <Badge tone={confidence.band === "HIGH" ? "success" : confidence.band === "INSUFFICIENT" ? "danger" : "gold"}>{confidence.band}</Badge>
      </div>
      <div className="mt-5 space-y-3">
        {labels.map(([key, label]) => {
          const value = confidence[key] as number;
          return (
            <div key={key}>
              <div className="mb-1 flex justify-between text-xs font-semibold">
                <span>{label}</span><span>{Math.round(value * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#E5EDF8]">
                <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}