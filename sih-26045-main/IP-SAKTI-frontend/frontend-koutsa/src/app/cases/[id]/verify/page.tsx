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

export default function VerifyPage() {
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
      toast.success("Facts Updated", { description: "The verified facts are ready for analysis." });
      router.push(`/cases/${id}${tool ? `?tool=${encodeURIComponent(tool)}` : ""}`);
    } catch (error) {
      toast.error("We couldn't update the facts", { description: getApiErrorMessage(error, "Please review the facts and try again.") });
    }
  }

  const toolLabel = caseItem?.tool === "regulatory" ? "Regulatory pathway" : caseItem?.tool === "formulation-classifier" ? "Formulation classification" : caseItem?.tool === "abs" ? "ABS access review" : caseItem?.tool === "tkdl" ? "TKDL / prior art" : caseItem?.tool === "ip-navigator" ? "IP Navigator" : "Research";

  return (
    <div>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: caseItem?.title ?? "Case", href: `/cases/${id}` }, { label: "Fact Verification" }]} />
      <PageHeader title={tool === "abs" ? "Review ABS access facts" : tool === "tkdl" ? "Review prior-art search facts" : "Review extracted facts"} description={tool === "abs" ? "Confirm the resource, geography, access, community/TK and intended-use facts before the ABS pathway assessment." : tool === "tkdl" ? "Confirm the search description, source reference and novelty focus before prior-art retrieval." : "Confirm the structured facts before analysis. Extraction and normalization are shown separately from user corrections."} />
      <div className="mb-5 flex items-center gap-2 rounded-control border border-[#D8E6F7] bg-[#EEF5FF] px-4 py-3 text-sm text-navy">
        <Sparkles size={16} /> {tool === "abs" ? "No final ABS pathway or obligation assessment is displayed until the access facts are confirmed." : tool === "tkdl" ? "No prior-art candidates are displayed until the search scope facts are confirmed." : "No final legal or regulatory assessment is displayed until facts are confirmed."}
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.15fr_1.3fr_1fr_.7fr] border-b border-line bg-[#F8FAFD] px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-ink/55 max-md:hidden">
          <span>Fact</span><span>Value</span><span>Normalized</span><span>Status</span>
        </div>
        <div className="divide-y divide-line">
          {isLoading ? [1,2,3,4].map(i => <div key={i} className="grid gap-3 p-5 md:grid-cols-4"><Skeleton className="h-5" /><Skeleton className="h-10" /><Skeleton className="h-5" /><Skeleton className="h-6 w-24" /></div>) : localFacts.map((fact, index) => (
            <div key={fact.id || index} className="grid gap-4 p-5 md:grid-cols-[1.15fr_1.3fr_1fr_.7fr] md:items-center">
              <div><p className="text-xs font-bold uppercase tracking-wide text-ink/55 md:hidden">Fact</p><p className="font-semibold">{fact.field}</p><p className="mt-1 text-xs text-ink/50">Source: {fact.source_span ?? "Backend span not supplied"}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wide text-ink/55 md:hidden">Value</p><div className="relative"><Input value={fact.value} disabled={!fact.user_editable} onChange={e => updateFact(fact.id, e.target.value)} /><Edit3 size={15} className="pointer-events-none absolute right-3 top-3 text-ink/35" /></div></div>
              <div><p className="text-xs font-bold uppercase tracking-wide text-ink/55 md:hidden">Normalized</p><p className="text-sm text-ink/70">{fact.normalized_value ?? "Pending normalization"}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wide text-ink/55 md:hidden">Status</p><Badge tone={(fact.status || "PENDING") === "CONFIRMED" ? "success" : (fact.status || "PENDING") === "USER_CORRECTED" ? "gold" : "navy"}>{(fact.status || "PENDING").replace("_", " ")}</Badge><p className="mt-2 text-xs text-ink/50">{Math.round((fact.confidence || 0) * 100)}% extraction confidence</p></div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 flex flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
        <Button variant="secondary" type="button"><Plus size={16} /> Add missing fact</Button>
        <Button onClick={confirmAll} disabled={confirm.isPending || isLoading}>{confirm.isPending ? <><Loader2 className="animate-spin" size={16} /> Confirming…</> : <><Check size={16} /> Confirm facts & continue</>}</Button>
      </div>
    </div>
  );
}