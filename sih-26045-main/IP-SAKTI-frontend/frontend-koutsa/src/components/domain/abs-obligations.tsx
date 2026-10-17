"use client";

import { AlertCircle, CheckCircle2, CircleDashed, Landmark, ShieldCheck } from "lucide-react";
import type { AbsAssessment, AbsObligationItem } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";

function statusTone(status: AbsObligationItem["status"]): "success" | "gold" | "danger" | "navy" {
  if (status === "REQUIRED") return "success";
  if (status === "CONDITIONAL" || status === "REVIEW") return "gold";
  return "navy";
}

function StatusIcon({ status }: { status: AbsObligationItem["status"] }) {
  if (status === "REQUIRED") return <CheckCircle2 size={18} />;
  if (status === "NOT_REQUIRED") return <CircleDashed size={18} />;
  return <AlertCircle size={18} />;
}

function ObligationRow({ item }: { item: AbsObligationItem }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-navy"><StatusIcon status={item.status} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-bold">{t(item.title)}</p>
            <Badge tone={statusTone(item.status)}>{t(item.status.replace("_", " "))}</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink/70">{t(item.details)}</p>
          {item.authority && <p className="mt-2 text-xs font-semibold text-navy">{t("case_view.authority_to_approach", "Authority")}: {t(item.authority)}</p>}
          {item.citation && <p className="mt-1 text-xs text-ink/50">{t("case_view.citation", "Citation")}: {item.citation}</p>}
        </div>
      </div>
    </div>
  );
}

export function AbsObligations({ assessment, jurisdiction }: { assessment: AbsAssessment; jurisdiction: "INDIA" | "INTERNATIONAL" }) {
  const { t } = useLanguage();
  const insufficient = assessment.pathway_status === "INSUFFICIENT";
  const pathwayLabel = assessment.pathway_status === "PATHWAY_REQUIRED"
    ? t("case_view.abs_pathway_required", "ABS pathway required")
    : assessment.pathway_status === "PATHWAY_NOT_REQUIRED"
      ? t("case_view.abs_pathway_not_indicated", "ABS pathway not indicated")
      : assessment.pathway_status === "INSUFFICIENT"
        ? t("case_view.abs_insufficient", "Insufficient grounded evidence")
        : t("case_view.abs_conditional", "Conditional ABS review");

  return (
    <div className="space-y-6">
      <Card className={`p-7 ${insufficient ? "border-[#E8C5C0]" : "botanical"}`}>
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{t("case_view.abs_pathway_title", "ABS pathway")}</p>
              <h2 className={`serif mt-2 text-4xl ${insufficient ? "text-[#8B2C25]" : "text-forest"}`}>{pathwayLabel}</h2>
            </div>
            <Badge tone={insufficient ? "danger" : assessment.pathway_status === "PATHWAY_NOT_REQUIRED" ? "navy" : "gold"}>{t(assessment.pathway_status.replaceAll("_", " "))}</Badge>
          </div>
          <p className="mt-5 max-w-4xl text-base leading-7 text-ink/75">{t(assessment.summary)}</p>
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-line bg-white p-4">
            <Landmark className="mt-0.5 shrink-0 text-navy" size={21} />
            <div><p className="text-xs font-bold uppercase tracking-wide text-ink/50">{t("case_view.authority_to_approach", "Authority to approach")}</p><p className="mt-1 font-semibold text-navy">{t(assessment.authority)}</p></div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3"><ShieldCheck className="text-navy" size={21} /><h2 className="serif text-2xl text-forest">{t("case_view.obligations_checklist", "Obligations checklist")}</h2></div>
        <div className="mt-5 space-y-3">{assessment.obligations.length ? assessment.obligations.map(item => <ObligationRow key={`${item.title}-${item.status}`} item={item} />) : <p className="text-sm text-ink/60">{t("case_view.no_obligations", "No obligation items were returned by the backend.")}</p>}</div>
      </Card>

      {jurisdiction === "INTERNATIONAL" && (
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Landmark className="text-navy" size={21} /><h2 className="serif text-2xl text-forest">{t("case_view.intl_disclosure", "International disclosure")}</h2></div><Badge tone="navy">{t("common.international", "International")}</Badge></div>
          <p className="mt-2 text-sm leading-6 text-ink/65">{t("case_view.intl_disclosure_desc", "This section appears only for international cases. The backend must determine whether a cross-border Nagoya Protocol or WIPO GRATK disclosure requirement actually applies.")}</p>
          <div className="mt-5 space-y-3">{assessment.disclosure_obligations.length ? assessment.disclosure_obligations.map(item => <ObligationRow key={`${item.title}-${item.status}`} item={item} />) : <p className="text-sm text-ink/60">{t("case_view.no_intl_disclosure", "No international disclosure obligation was returned.")}</p>}</div>
        </Card>
      )}
    </div>
  );
}
