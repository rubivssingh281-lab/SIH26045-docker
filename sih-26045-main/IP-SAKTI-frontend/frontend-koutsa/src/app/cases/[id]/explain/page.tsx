"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { useCase, useExplanation } from "@/hooks/queries/use-cases";
import { Breadcrumb, PageHeader } from "@/components/domain/page-header";
import { ExplainabilityStepper } from "@/components/domain/explainability-stepper";
import { Disclaimer } from "@/components/domain/disclaimer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useEffect } from "react";
import { useLanguage } from "@/components/providers/language-provider";

export default function ExplainPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { data: caseItem } = useCase(id);
  const { data: trace, isLoading, isError } = useExplanation(id);

  useEffect(() => {
    if (isError) toast.error(t("explain.error_trace", "Explainability trace could not be loaded"), { 
      description: t("explain.error_trace_desc", "Please return to the case and try again.") 
    });
  }, [isError, t]);

  return (
    <div>
      <Breadcrumb items={[
        { label: t("nav.dashboard", "Dashboard"), href: "/dashboard" }, 
        { label: caseItem?.title ?? t("explain.case", "Case"), href: `/cases/${id}` }, 
        { label: t("explain.title", "Explainability") }
      ]} />
      <PageHeader 
        title={t("explain.title", "Explainability")} 
        description={t("explain.description", "A traceable view of the backend workflow from facts through rules, evidence, citation validation and confidence.")} 
        action={
          <Link href={`/cases/${id}`}>
            <Button variant="secondary"><ArrowLeft size={16} /> {t("explain.back_to_result", "Back to result")}</Button>
          </Link>
        } 
      />
      {isLoading ? <Skeleton className="h-[600px]" /> : isError || !trace ? (
        <Card className="p-8 text-center">
          <p className="font-bold">{t("explain.error_trace", "We couldn't load the analysis trace.")}</p>
          <p className="mt-1 text-sm text-ink/60">{t("explain.error_trace_desc", "Please return to the result and try again.")}</p>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <ExplainabilityStepper trace={trace} />
          <div className="space-y-5">
            <Card className="p-6">
              <p className="eyebrow">{t("explain.case", "Case")}</p>
              <h2 className="serif mt-1 text-2xl text-forest">{caseItem?.title}</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-ink/50">{t("explain.jurisdiction", "Jurisdiction")}</dt>
                  <dd className="mt-1 font-semibold">{caseItem?.jurisdiction === "INDIA" ? t("common.india", "India") : t("common.international", "International")}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-ink/50">{t("explain.as_of_date", "As-of date")}</dt>
                  <dd className="mt-1 font-semibold">{caseItem?.as_of_date}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-ink/50">{t("explain.analysis_version", "Analysis version")}</dt>
                  <dd className="mt-1 font-semibold">{t("explain.version_n", "Version {version}").replace("{version}", String(caseItem?.version ?? 1))}</dd>
                </div>
              </dl>
            </Card>
            <Card className="p-6">
              <p className="eyebrow">{t("explain.versioning", "Versioning")}</p>
              <p className="mt-2 text-sm leading-6 text-ink/70">{t("explain.versioning_desc", "Older analysis versions remain distinct. The backend should supply changed facts, changed rules and confidence delta when versions are compared.")}</p>
              {caseItem?.changed_facts?.length ? (
                <div className="mt-4 rounded-lg bg-[#F7F9FC] p-4 text-sm">
                  <p className="font-bold">{t("explain.changed_since", "Changed since previous analysis")}</p>
                  <p className="mt-1">{caseItem.changed_facts.map(f => t(f)).join(", ")}</p>
                  <p className="mt-2 text-xs text-ink/55">
                    {t("explain.rule_changes", "Rule changes")}: {caseItem.changed_rules?.join(", ") ?? "—"} · {t("explain.confidence_delta", "Confidence delta")}: {caseItem.confidence_delta != null ? `${Math.round(caseItem.confidence_delta * 100)} pts` : "—"}
                  </p>
                </div>
              ) : null}
            </Card>
            <Disclaimer />
            <Button variant="secondary" className="w-full" onClick={() => window.print()}>
              <Download size={16} /> {t("explain.print_save_trace", "Print / save trace")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}