"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { useCase, useCaseHistory } from "@/hooks/queries/use-cases";
import { Breadcrumb, PageHeader } from "@/components/domain/page-header";
import { CaseHistoryTimeline } from "@/components/domain/case-history-timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useEffect } from "react";
import { Disclaimer } from "@/components/domain/disclaimer";

export default function CaseHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { data: caseItem, isLoading: caseLoading } = useCase(id);
  const { data: history, isLoading: historyLoading, isError } = useCaseHistory(id);

  useEffect(() => {
    if (isError) toast.error("Case history could not be loaded", { description: "Please return to the case and try again." });
  }, [isError]);

  if (caseLoading) return <div className="space-y-5"><Skeleton className="h-6 w-40"/><Skeleton className="h-16 w-2/3"/><Skeleton className="h-[520px]"/></div>;
  if (!caseItem) return <Card className="p-8">This case could not be found.</Card>;

  return (
    <div>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: caseItem.title, href: `/cases/${id}` }, { label: "History" }]} />
      <PageHeader title="Case history" description="Review the audit trail of this research case, including when facts changed, who made the change, and when analyses were run." action={<div className="flex flex-wrap gap-2"><Link href={`/cases/${id}`}><Button variant="secondary"><ArrowLeft size={16}/> Back to analysis</Button></Link><Link href={`/cases/${id}/report`}><Button variant="secondary"><FileText size={16}/> Case report</Button></Link></div>} />
      {historyLoading ? <Skeleton className="h-[560px]" /> : isError ? <Card className="p-8 text-center"><p className="font-bold">We couldn't load the case history.</p><p className="mt-1 text-sm text-ink/60">Please try again from the case report.</p></Card> : <CaseHistoryTimeline events={history ?? []} />}
      <div className="mt-5"><Disclaimer /></div>
    </div>
  );
}
