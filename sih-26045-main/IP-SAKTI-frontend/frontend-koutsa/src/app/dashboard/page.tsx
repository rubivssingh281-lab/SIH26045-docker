"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, ChevronRight, Database, FileCheck2, FileSearch, Gavel, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useEffect } from "react";
import { useCaseStatistics } from "@/hooks/queries/use-statistics";
import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/domain/page-header";
import { StatusBadge } from "@/components/domain/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { CaseStatisticsCards, ClassificationPieChart } from "@/components/domain/case-statistics";

const shortcuts = [
  { tool: "formulation-classifier", titleKey: "dashboard.shortcut_classifier_title", textKey: "dashboard.shortcut_classifier_desc", icon: FileCheck2 },
  { tool: "abs", titleKey: "dashboard.shortcut_abs_title", textKey: "dashboard.shortcut_abs_desc", icon: ShieldCheck },
  { tool: "tkdl", titleKey: "dashboard.shortcut_tkdl_title", textKey: "dashboard.shortcut_tkdl_desc", icon: FileSearch },
  { tool: "ip-navigator", titleKey: "dashboard.shortcut_navigator_title", textKey: "dashboard.shortcut_navigator_desc", icon: Gavel }
];

export default function DashboardPage() {
  const { t } = useLanguage();
  const { data: cases, isLoading, isError, statistics } = useCaseStatistics();
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const filteredCases = useMemo(() => {
    const list = cases ?? [];
    if (!q) return list;
    return list.filter(item => [item.title, item.description, item.classification, item.jurisdiction, item.status, item.tool].filter(Boolean).some(value => String(value).toLowerCase().includes(q)));
  }, [cases, q]);
  useEffect(() => {
    if (isError) toast.error(t("dashboard.error_load"), { description: t("dashboard.error_load_desc") });
  }, [isError, t]);

  return (
    <div>
      <PageHeader eyebrow={t("dashboard.case_manager")} title={t("dashboard.research_dashboard")} description={t("dashboard.desc_research_dashboard")} action={<Link href="/cases/new?tool=ask"><Button><Plus size={17} /> {t("dashboard.start_new_research")}</Button></Link>} />
      <section aria-label="Case analytics" className="space-y-4">
        <CaseStatisticsCards statistics={statistics} isLoading={isLoading} />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,.75fr)]">
          <ClassificationPieChart statistics={statistics} isLoading={isLoading} />
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{t("dashboard.case_activity")}</p><h2 className="serif mt-1 text-2xl text-forest">{t("dashboard.research_pipeline")}</h2><p className="mt-1 text-sm leading-6 text-ink/55">{t("dashboard.research_pipeline_desc")}</p></div><BarChart3 className="text-navy" size={22} /></div>
            <div className="mt-6 space-y-4">{[[t("dashboard.pending"), statistics.pending, "bg-navy"],[t("dashboard.complete"), statistics.complete, "bg-emerald"],[t("dashboard.escalated"), statistics.escalated, "bg-gold"]].map(([label,value,tone]) => <div key={String(label)}><div className="mb-1.5 flex items-center justify-between text-xs font-bold"><span>{String(label)}</span><span>{Number(value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#E8EDF3]"><div className={`h-full rounded-full ${String(tone)}`} style={{ width: `${statistics.totalCases ? Math.max(4, (Number(value) / statistics.totalCases) * 100) : 0}%` }} /></div></div>)}</div>
            <div className="mt-6 rounded-lg border border-line bg-[#F8FAFD] p-3 text-xs leading-5 text-ink/55">{t("dashboard.pending_desc")}</div>
          </Card>
        </div>
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <Card className="botanical p-7 md:p-8"><div className="relative z-10"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">{t("dashboard.primary_workflow")}</p><h2 className="serif mt-2 max-w-2xl text-3xl leading-tight text-forest">{t("dashboard.workflow_title")}</h2></div><Badge tone="navy">{t("dashboard.evidence_grounded")}</Badge></div><p className="mt-4 max-w-3xl text-sm leading-7 text-ink/70">{t("dashboard.workflow_desc")}</p><div className="mt-6 grid gap-2 sm:grid-cols-4">{[t("dashboard.step_1"),t("dashboard.step_2"),t("dashboard.step_3"),t("dashboard.step_4")].map((step,index)=><div key={step} className="rounded-lg border border-line bg-white/85 px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45">0{index+1}</p><p className="mt-1 text-xs font-bold leading-5">{step}</p></div>)}</div></div></Card>
        <Card className="p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">{t("dashboard.research_shortcuts")}</p><h2 className="serif mt-1 text-2xl text-forest">{t("dashboard.shortcuts_title")}</h2></div><Sparkles className="text-navy" size={21}/></div><div className="mt-5 space-y-2">{shortcuts.map(item=>{const Icon=item.icon; return <Link key={item.tool} href={`/cases/new?tool=${item.tool}`} className="flex gap-3 rounded-lg border border-line p-3 hover:bg-[#FAFBFD]"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mist text-navy"><Icon size={17}/></div><div><p className="text-sm font-bold">{t(item.titleKey)}</p><p className="mt-1 text-xs leading-5 text-ink/60">{t(item.textKey)}</p></div></Link>})}</div></Card>
      </div>
      <Card className="mt-6 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-6"><div><p className="eyebrow">{t("dashboard.case_records")}</p><h2 className="serif mt-1 text-2xl text-forest">{q ? t("dashboard.results_for").replace("{q}", q) : t("dashboard.recent_cases")}</h2></div><Link href="/archive" className="text-sm font-bold text-gold">{t("dashboard.open_archive")} <ArrowRight size={14} className="inline" /></Link></div><div className="divide-y divide-line">{isLoading ? [1,2,3].map(index=><div key={index} className="grid gap-3 p-5 md:grid-cols-[1.4fr_.7fr_.6fr_.5fr] md:items-center"><Skeleton className="h-5"/><Skeleton className="h-5"/><Skeleton className="h-6 w-20"/><Skeleton className="h-9 w-9"/></div>) : null}{!isLoading&&filteredCases.length===0&&<div className="p-10 text-center"><Database size={20} className="mx-auto text-navy"/><h3 className="serif mt-4 text-2xl text-forest">{t("dashboard.no_matching_cases")}</h3><p className="mt-1 text-sm text-ink/55">{t("dashboard.no_matching_desc")}</p></div>}{!isLoading&&filteredCases.slice(0,8).map(item=><Link key={item.id} href={`/cases/${item.id}?tool=${item.tool ?? "ask"}`} className="grid gap-3 p-5 md:grid-cols-[1.4fr_.7fr_.6fr_.5fr] md:items-center hover:bg-[#FAFBFD]"><div className="min-w-0"><p className="font-semibold">{item.title}</p><p className="mt-1 line-clamp-1 text-xs text-ink/55">{item.tool ? t(item.tool) : t("dashboard.research")} · {item.jurisdiction === "INDIA" ? t("common.india", "India") : t("common.international", "International")} · {t("dashboard.updated")} {formatDate(item.updated_at)}</p></div><div className="text-sm text-ink/70">{item.classification ? t(item.classification) : t("dashboard.awaiting_assessment")}</div><div>{item.status&&<StatusBadge status={item.status}/>}</div><ChevronRight className="hidden text-ink/35 md:block" size={18}/></Link>)}</div></Card>
      <div className="mt-6 flex items-center gap-2 rounded-control border border-line bg-white px-4 py-3 text-xs text-ink/60"><Database size={15}/> {t("dashboard.backend_truth")}</div>
    </div>
  );
}
