"use client";

import { CheckCircle2, CircleDashed, CircleOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { IpRouteAssessment } from "@/types";
import { useLanguage } from "@/components/providers/language-provider";

export function IpRouteMatrix({ routes }: { routes: IpRouteAssessment[] }) {
  const { t } = useLanguage();

  function statusMeta(status: IpRouteAssessment["status"]) {
    if (status === "APPLICABLE") return { label: t("case_view.status_applicable", "Applicable"), tone: "success" as const, icon: CheckCircle2 };
    if (status === "CONDITIONAL") return { label: t("case_view.status_conditional", "Conditional"), tone: "gold" as const, icon: CircleDashed };
    return { label: t("case_view.status_not_applicable", "Not applicable"), tone: "navy" as const, icon: CircleOff };
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-6 py-5">
        <p className="eyebrow">{t("case_view.route_matrix_title", "Protection route matrix")}</p>
        <h2 className="serif mt-1 text-2xl text-forest">{t("case_view.ip_options_scope", "IP options in scope")}</h2>
        <p className="mt-1 text-sm text-ink/60">{t("case_view.route_matrix_desc", "Each row reflects a backend assessment for an IP regime selected during intake.")}</p>
      </div>
      <div className="hidden grid-cols-[1.05fr_.75fr_1.4fr] border-b border-line bg-[#F8FAFD] px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-ink/55 md:grid">
        <span>{t("case_view.col_ip_type", "IP type")}</span><span>{t("archive.col_status", "Status")}</span><span>{t("case_view.col_rationale", "Backend rationale & citation")}</span>
      </div>
      <div className="divide-y divide-line">
        {routes.map(route => {
          const meta = statusMeta(route.status);
          const Icon = meta.icon;
          return (
            <div key={route.ip_type} className="grid gap-4 px-6 py-5 md:grid-cols-[1.05fr_.75fr_1.4fr] md:items-start">
              <div><p className="font-bold">{t(route.ip_type)}</p><p className="mt-1 text-xs text-ink/50 md:hidden">{t("case_view.col_ip_type", "IP route")}</p></div>
              <div><Badge tone={meta.tone}><Icon size={12} className="mr-1" />{meta.label}</Badge></div>
              <div><p className="text-sm leading-6 text-ink/70">{t(route.rationale)}</p><p className="mt-2 text-xs font-semibold text-navy">{route.citation}</p></div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
