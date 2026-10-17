"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, Edit3, Loader2, Plus, Sparkles } from "lucide-react";
import { useCase, useConfirmFacts, useFacts } from "@/hooks/queries/use-cases";
import { Breadcrumb, PageHeader } from "@/components/domain/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Fact } from "@/types";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api";
import { useLanguage } from "@/components/providers/language-provider";

export default function VerifyPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tool, setTool] = useState<string | null>(searchParams.get("tool"));
  useEffect(() => {
    const urlTool = searchParams.get("tool");
    if (urlTool) { setTool(urlTool); return; }
    const storedTool = window.localStorage.getItem(`ip-sakti-case-tool:${id}`);
    if (storedTool) setTool(storedTool);
  }, [id, searchParams]);
  const { data: caseItem } = useCase(id);
  const { data: facts, isLoading } = useFacts(id);
  const confirm = useConfirmFacts(id);
  const [localFacts, setLocalFacts] = useState<Fact[]>([]);

  useEffect(() => { if (facts) setLocalFacts(facts); }, [facts]);

  function updateFact(factId: string, value: string) {
    setLocalFacts(items => items.map(f => f.id === factId ? { ...f, value, status: "USER_CORRECTED" } : f));
  }

  async function confirmAll() {
    try {
      await confirm.mutateAsync(localFacts);
      toast.success(t("verify.facts_updated", "Facts Updated"), { 
        description: t("verify.facts_updated_desc", "The verified facts are ready for analysis.") 
      });
      router.push(`/cases/${id}${tool ? `?tool=${encodeURIComponent(tool)}` : ""}`);
    } catch (error) {
      toast.error(t("common.error", "We couldn't update the facts"), { 
        description: getApiErrorMessage(error, t("common.error_desc", "Please review the facts and try again.")) 
      });
    }
  }

  return (
    <div>
      <Breadcrumb items={[
        { label: t("nav.dashboard", "Dashboard"), href: "/dashboard" }, 
        { label: caseItem?.title ?? t("explain.case", "Case"), href: `/cases/${id}` }, 
        { label: t("verify.fact_verification", "Fact Verification") }
      ]} />
      <PageHeader 
        title={tool === "abs" ? t("verify.title_abs", "Review ABS access facts") : tool === "tkdl" ? t("verify.title_tkdl", "Review prior-art search facts") : t("verify.title_default", "Review extracted facts")} 
        description={tool === "abs" ? t("verify.desc_abs", "Confirm the resource, geography, access, community/TK and intended-use facts before the ABS pathway assessment.") : tool === "tkdl" ? t("verify.desc_tkdl", "Confirm the search description, source reference and novelty focus before prior-art retrieval.") : t("verify.desc_default", "Confirm the structured facts before analysis. Extraction and normalization are shown separately from user corrections.")} 
      />
      <div className="mb-5 flex items-center gap-2 rounded-control border border-[#D8E6F7] bg-[#EEF5FF] px-4 py-3 text-sm text-navy">
        <Sparkles size={16} /> {tool === "abs" ? t("verify.banner_abs", "No final ABS pathway or obligation assessment is displayed until the access facts are confirmed.") : tool === "tkdl" ? t("verify.banner_tkdl", "No prior-art candidates are displayed until the search scope facts are confirmed.") : t("verify.banner_default", "No final legal or regulatory assessment is displayed until facts are confirmed.")}
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.15fr_1.3fr_1fr_.7fr] border-b border-line bg-[#F8FAFD] px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-ink/55 max-md:hidden">
          <span>{t("verify.col_fact", "Fact")}</span>
          <span>{t("verify.col_value", "Value")}</span>
          <span>{t("verify.col_normalized", "Normalized")}</span>
          <span>{t("verify.col_status", "Status")}</span>
        </div>
        <div className="divide-y divide-line">
          {isLoading ? [1,2,3,4].map(i => (
            <div key={i} className="grid gap-3 p-5 md:grid-cols-4">
              <Skeleton className="h-5" /><Skeleton className="h-10" /><Skeleton className="h-5" /><Skeleton className="h-6 w-24" />
            </div>
          )) : localFacts.map((fact, index) => (
            <div key={fact.id || index} className="grid gap-4 p-5 md:grid-cols-[1.15fr_1.3fr_1fr_.7fr] md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink/55 md:hidden">{t("verify.col_fact", "Fact")}</p>
                <p className="font-semibold">{t(fact.field)}</p>
                <p className="mt-1 text-xs text-ink/50">{t("verify.source", "Source")}: {fact.source_span ? t(fact.source_span) : t("verify.backend_span_not_supplied", "Backend span not supplied")}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink/55 md:hidden">{t("verify.col_value", "Value")}</p>
                <div className="relative">
                  <Input value={fact.value} disabled={!fact.user_editable} onChange={e => updateFact(fact.id, e.target.value)} />
                  <Edit3 size={15} className="pointer-events-none absolute right-3 top-3 text-ink/35" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink/55 md:hidden">{t("verify.col_normalized", "Normalized")}</p>
                <p className="text-sm text-ink/70">{fact.normalized_value ? t(fact.normalized_value) : t("verify.pending_normalization", "Pending normalization")}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink/55 md:hidden">{t("verify.col_status", "Status")}</p>
                <Badge tone={(fact.status || "PENDING") === "CONFIRMED" ? "success" : (fact.status || "PENDING") === "USER_CORRECTED" ? "gold" : "navy"}>
                  {t((fact.status || "PENDING").replace("_", " "))}
                </Badge>
                <p className="mt-2 text-xs text-ink/50">{Math.round((fact.confidence || 0) * 100)}% {t("verify.extraction_confidence", "extraction confidence")}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 flex flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
        <Button variant="secondary" type="button"><Plus size={16} /> {t("verify.add_missing_fact", "Add missing fact")}</Button>
        <Button onClick={confirmAll} disabled={confirm.isPending || isLoading}>
          {confirm.isPending ? (
            <><Loader2 className="animate-spin" size={16} /> {t("verify.confirming", "Confirming…")}</>
          ) : (
            <><Check size={16} /> {t("verify.confirm_facts", "Confirm facts & continue")}</>
          )}
        </Button>
      </div>
    </div>
  );
}