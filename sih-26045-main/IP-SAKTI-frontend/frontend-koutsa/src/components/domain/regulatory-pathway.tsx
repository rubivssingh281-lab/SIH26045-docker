"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RegulatoryAssessment, RegulatoryRouteItem } from "@/types";
import { useLanguage } from "@/components/providers/language-provider";

function tone(status: RegulatoryRouteItem["status"]): "success" | "gold" | "danger" | "navy" {
  if (status === "APPLICABLE") return "success";
  if (status === "CONDITIONAL" || status === "REVIEW") return "gold";
  return "navy";
}

function RouteRow({ item }: { item: RegulatoryRouteItem }) {
  const { t } = useLanguage();
  return <div className="rounded-lg border border-line bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <p className="font-bold">{t(item.title)}</p><Badge tone={tone(item.status)}>{t(item.status.replace("_", " "))}</Badge>
    </div>
    <p className="mt-2 text-sm leading-6 text-ink/70">{t(item.details)}</p>
    {item.authority && <p className="mt-2 text-xs font-semibold text-navy">{t("case_view.authority_to_approach", "Authority")}: {t(item.authority)}</p>}
    {item.citation && <p className="mt-1 text-xs text-ink/50">{t("case_view.citation", "Citation")}: {item.citation}</p>}
  </div>;
}

export function RegulatoryPathway({ assessment }: { assessment: RegulatoryAssessment }) {
  const { t } = useLanguage();
  return <div className="space-y-6">
    <Card className="botanical p-7"><div className="relative z-10">
      <p className="eyebrow">{t("case_view.reg_route_title", "Regulatory route")}</p>
      <h2 className="serif mt-2 text-4xl text-forest">{t("case_view.reg_route_heading", "Applicable regulatory pathway")}</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-4"><p className="eyebrow">{t("case_view.applicable_act", "Applicable Act")}</p><p className="mt-2 text-lg font-bold text-navy">{t(assessment.applicable_act)}</p></div>
        <div className="rounded-lg border border-line bg-white p-4"><p className="eyebrow">{t("case_view.licensing_market_route", "Licensing / market route")}</p><p className="mt-2 text-lg font-bold text-navy">{t(assessment.licensing_route)}</p></div>
      </div>
    </div></Card>
    <Card className="p-6"><p className="eyebrow">{t("case_view.route_obligations", "Route obligations")}</p><h3 className="serif mt-1 text-2xl text-forest">{t("case_view.which_route_applies", "Which route applies")}</h3><div className="mt-5 space-y-3">{assessment.route_items.length ? assessment.route_items.map((x,i)=><RouteRow item={x} key={`${x.title}-${i}`} />) : <p className="text-sm text-ink/60">{t("case_view.no_route_items", "No route items were returned by the backend.")}</p>}</div></Card>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6"><p className="eyebrow">{t("case_view.advertising_claims", "Advertising & claims")}</p><h3 className="serif mt-1 text-2xl text-forest">{t("case_view.claim_restrictions", "Claim restrictions")}</h3><div className="mt-5 space-y-3">{assessment.claim_restrictions.map((x,i)=><RouteRow item={x} key={`${x.title}-${i}`} />)}</div></Card>
      <Card className="p-6"><p className="eyebrow">{t("case_view.labelling", "Labelling")}</p><h3 className="serif mt-1 text-2xl text-forest">{t("case_view.label_requirements", "Label requirements")}</h3><div className="mt-5 space-y-3">{assessment.labelling_requirements.map((x,i)=><RouteRow item={x} key={`${x.title}-${i}`} />)}</div></Card>
    </div>
  </div>;
}
