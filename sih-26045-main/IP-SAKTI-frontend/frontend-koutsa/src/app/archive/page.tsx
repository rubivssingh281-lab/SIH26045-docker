"use client";

import Link from "next/link";
import { ArrowDownUp, ChevronLeft, ChevronRight, Download, Filter, RotateCcw, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useCases } from "@/hooks/queries/use-cases";
import { PageHeader } from "@/components/domain/page-header";
import { StatusBadge } from "@/components/domain/status-badge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { caseApi, getApiErrorMessage } from "@/lib/api";
import { useLanguage } from "@/components/providers/language-provider";
import type { Case, CaseStatus, Jurisdiction, ResearchTool } from "@/types";
import { toast } from "sonner";

function pending(status: CaseStatus) { return ["DRAFT", "PENDING", "VERIFYING", "ANALYZING"].includes(status); }

export default function ArchivePage() {
  const { t } = useLanguage();
  const { data: cases, isLoading } = useCases();
  const [query, setQuery] = useState("");
  const [tool, setTool] = useState<ResearchTool | "ALL">("ALL");
  const [status, setStatus] = useState<"ALL" | "PENDING" | "COMPLETE" | "ESCALATED">("ALL");
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | "ALL">("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"updated" | "title">("updated");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const tools: Array<{ value: ResearchTool; label: string }> = [
    { value: "ask", label: t("nav.ask_sahayak", "Ask Sahayak") },
    { value: "ip-navigator", label: t("nav.ip_navigator", "IP Navigator") },
    { value: "formulation-classifier", label: t("nav.formulation_classifier", "Formulation Classifier") },
    { value: "abs", label: t("nav.abs_compliance", "ABS Compliance") },
    { value: "tkdl", label: t("nav.tkdl_prior_art", "TKDL / Prior Art") },
    { value: "regulatory", label: t("nav.regulatory_pathway", "Regulatory Pathway") }
  ];

  function toolLabel(toolKey?: ResearchTool) {
    return tools.find(item => item.value === toolKey)?.label ?? t("dashboard.research", "Research");
  }

  const filtered = useMemo(() => {
    return [...(cases ?? [])].filter(item => {
      const haystack = [item.title, item.description, item.classification, item.tool, item.jurisdiction].filter(Boolean).join(" ").toLowerCase();
      if (query && !haystack.includes(query.toLowerCase())) return false;
      if (tool !== "ALL" && item.tool !== tool) return false;
      if (status === "PENDING" && !pending(item.status)) return false;
      if (status === "COMPLETE" && item.status !== "COMPLETE") return false;
      if (status === "ESCALATED" && item.status !== "ESCALATED") return false;
      if (jurisdiction !== "ALL" && item.jurisdiction !== jurisdiction) return false;
      if (from && (item.updated_at || item.as_of_date || "").slice(0, 10) < from) return false;
      if (to && (item.updated_at || item.as_of_date || "").slice(0, 10) > to) return false;
      return true;
    }).sort((a, b) => sort === "title" ? (a.title || "").localeCompare(b.title || "") : (b.updated_at || b.as_of_date || "").localeCompare(a.updated_at || a.as_of_date || ""));
  }, [cases, query, tool, status, jurisdiction, from, to, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function clearFilters() { setQuery(""); setTool("ALL"); setStatus("ALL"); setJurisdiction("ALL"); setFrom(""); setTo(""); setPage(1); }
  async function exportPdf() {
    if (!filtered.length) { toast.info(t("archive.export_empty", "No cases match the current filters.")); return; }
    try {
      const rows = filtered.map(c => ({
        title: c.title || "",
        tool: toolLabel(c.tool),
        jurisdiction: c.jurisdiction,
        classification: c.classification ?? "",
        status: c.status,
        updated_at: c.updated_at || c.as_of_date || ""
      }));
      const blob = await caseApi.exportArchivePdf(rows);
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "ip-sakti-case-archive.pdf"; a.click(); URL.revokeObjectURL(url);
      toast.success(t("archive.export_success", "Case archive exported as PDF"));
    } catch (error) {
      toast.error(t("archive.export_failed", "Export failed"), { description: getApiErrorMessage(error, t("dashboard.error_load_desc", "Please try again.")) });
    }
  }

  return <div>
    <PageHeader eyebrow={t("archive.eyebrow", "Records")} title={t("archive.title", "Case archive")} description={t("archive.description", "Browse, filter and reopen past evidence-grounded research cases. This view is designed for retrieval, not dashboard monitoring.")} action={<Button variant="secondary" onClick={exportPdf}><Download size={16} /> {t("archive.export_pdf", "Export filtered PDF")}</Button>} />
    <Card className="p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[250px] flex-1"><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.search", "Search")}</label><div className="relative"><Search className="absolute left-3 top-3 text-ink/40" size={17}/><Input className="pl-10" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder={t("archive.search_placeholder", "Search cases, tools or results…")} /></div></div>
        <div><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.tool", "Tool")}</label><select value={tool} onChange={e => { setTool(e.target.value as typeof tool); setPage(1); }} className="h-11 rounded-control border border-line bg-white px-3 text-sm"><option value="ALL">{t("archive.all_tools", "All tools")}</option>{tools.map(tOption => <option key={tOption.value} value={tOption.value}>{tOption.label}</option>)}</select></div>
        <div><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.status", "Status")}</label><select value={status} onChange={e => { setStatus(e.target.value as typeof status); setPage(1); }} className="h-11 rounded-control border border-line bg-white px-3 text-sm"><option value="ALL">{t("archive.all_statuses", "All statuses")}</option><option value="PENDING">{t("archive.pending", "Pending")}</option><option value="COMPLETE">{t("archive.complete", "Complete")}</option><option value="ESCALATED">{t("archive.escalated", "Escalated")}</option></select></div>
        <div><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.jurisdiction", "Jurisdiction")}</label><select value={jurisdiction} onChange={e => { setJurisdiction(e.target.value as typeof jurisdiction); setPage(1); }} className="h-11 rounded-control border border-line bg-white px-3 text-sm"><option value="ALL">{t("archive.all", "All")}</option><option value="INDIA">{t("archive.india", "India")}</option></select></div>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4"><div><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.updated_from", "Updated from")}</label><Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></div><div><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.updated_to", "Updated to")}</label><Input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></div><div><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.sort", "Sort")}</label><button type="button" onClick={() => setSort(v => v === "updated" ? "title" : "updated")} className="flex h-11 items-center gap-2 rounded-control border border-line bg-white px-3 text-sm font-semibold"><ArrowDownUp size={15}/>{sort === "updated" ? t("archive.last_updated", "Last updated") : t("archive.title_sort", "Title")}</button></div><Button variant="ghost" onClick={clearFilters}><X size={15}/> {t("archive.clear_filters", "Clear filters")}</Button></div>
    </Card>

    <Card className="mt-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-[#F8FAFD] px-5 py-4"><div className="flex items-center gap-2"><Filter size={15} className="text-navy"/><span className="text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.records_count", { count: filtered.length })}</span></div><span className="text-xs text-ink/45">{t("archive.reopen_hint", "Click a row to reopen the case")}</span></div>
      <div className="hidden grid-cols-[1.5fr_.85fr_.65fr_.65fr_.7fr_.8fr_32px] border-b border-line px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-ink/45 md:grid"><span>{t("archive.col_case", "Case")}</span><span>{t("archive.col_tool", "Tool")}</span><span>{t("archive.col_jurisdiction", "Jurisdiction")}</span><span>{t("archive.col_result", "Result")}</span><span>{t("archive.col_status", "Status")}</span><span>{t("archive.col_updated", "Updated")}</span><span /></div>
      <div className="divide-y divide-line">
        {isLoading && [1,2,3,4].map(i => <div key={i} className="grid gap-3 p-5 md:grid-cols-7"><Skeleton className="h-5"/><Skeleton className="h-5"/><Skeleton className="h-5"/><Skeleton className="h-5"/><Skeleton className="h-6"/><Skeleton className="h-5"/><Skeleton className="h-5"/></div>)}
        {!isLoading && visible.length === 0 && <div className="p-12 text-center"><p className="serif text-2xl text-forest">{t("archive.no_records", "No archive records match")}</p><p className="mt-1 text-sm text-ink/55">{t("archive.no_records_desc", "Adjust your filters or clear the search.")}</p></div>}
        {!isLoading && visible.map(item => <Link key={item.id} href={`/cases/${item.id}?tool=${item.tool ?? "ask"}`} className="block p-5 hover:bg-[#FAFBFD]"><div className="grid gap-2 md:grid-cols-[1.5fr_.85fr_.65fr_.65fr_.7fr_.8fr_32px] md:items-center"><div><p className="font-semibold">{item.title}</p><p className="mt-1 line-clamp-1 text-xs text-ink/50">{item.description}</p></div><div><Badge tone="navy">{toolLabel(item.tool)}</Badge></div><div className="text-sm">{t(item.jurisdiction)}</div><div className="text-sm text-ink/70">{item.classification ? t(item.classification) : t("dashboard.awaiting_assessment", "Pending")}</div><div><StatusBadge status={item.status}/></div><div className="text-sm text-ink/60">{formatDate(item.updated_at)}</div><ChevronRight className="text-ink/30" size={18}/></div></Link>)}
      </div>
      {pageCount > 1 && <div className="flex items-center justify-between border-t border-line px-5 py-4"><p className="text-xs text-ink/55">{t("archive.page_of", { page: safePage, total: pageCount })}</p><div className="flex items-center gap-2"><Button variant="secondary" size="sm" disabled={safePage === 1} onClick={() => setPage(v => Math.max(1, v - 1))}><ChevronLeft size={15}/> {t("archive.previous", "Previous")}</Button><Button variant="secondary" size="sm" disabled={safePage === pageCount} onClick={() => setPage(v => Math.min(pageCount, v + 1))}>{t("archive.next", "Next")} <ChevronRight size={15}/></Button></div></div>}
    </Card>
    <div className="mt-5 rounded-control border border-line bg-white px-4 py-3 text-xs text-ink/55"><RotateCcw size={14} className="mr-2 inline"/> {t("archive.note", "Re-running a case should create a new backend analysis version rather than overwrite historical results. The archive currently provides retrieval and export; versioned re-analysis remains backend-driven.")}</div>
  </div>;
}
