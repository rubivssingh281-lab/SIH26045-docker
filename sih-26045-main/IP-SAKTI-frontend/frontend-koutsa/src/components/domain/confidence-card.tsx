"use client";

import type { ConfidenceScore } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";

const labels: Array<[keyof ConfidenceScore, string, string]> = [
  ["fact_conf", "confidence_card.fact_conf", "Fact confidence"],
  ["rule_fit_conf", "confidence_card.rule_fit_conf", "Rule-fit confidence"],
  ["evidence_conf", "confidence_card.evidence_conf", "Evidence confidence"],
  ["citation_conf", "confidence_card.citation_conf", "Citation confidence"],
  ["overall_conf", "confidence_card.overall_conf", "Overall assessment"]
];

export function ConfidenceCard({ confidence }: { confidence: ConfidenceScore }) {
  const { t } = useLanguage();

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{t("confidence_card.confidence", "Confidence")}</p>
          <h3 className="serif mt-1 text-2xl">{t("confidence_card.assessment_confidence", "Assessment confidence")}</h3>
        </div>
        <Badge tone={confidence.band === "HIGH" ? "success" : confidence.band === "INSUFFICIENT" ? "danger" : "gold"}>{t(confidence.band)}</Badge>
      </div>
      <div className="mt-5 space-y-3">
        {labels.map(([key, keyName, fallback]) => {
          const value = confidence[key] as number;
          return (
            <div key={key}>
              <div className="mb-1 flex justify-between text-xs font-semibold">
                <span>{t(keyName, fallback)}</span><span>{Math.round(value * 100)}%</span>
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