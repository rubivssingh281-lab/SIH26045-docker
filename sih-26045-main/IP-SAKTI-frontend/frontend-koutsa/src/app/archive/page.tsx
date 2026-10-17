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

  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [tool !== "ALL", status !== "ALL", jurisdiction !== "ALL", Boolean(from), Boolean(to)].filter(Boolean).length;

  return <div>
    <PageHeader
      eyebrow={t("archive.eyebrow", "Records")}
      title={t("archive.title", "Case archive")}
      description={t("archive.description", "Browse, filter and reopen past evidence-grounded research cases. This view is designed for retrieval, not dashboard monitoring.")}
      action={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportPdf}>
            <Download size={15} /> <span className="hidden xs:inline">{t("archive.export_pdf", "Export PDF")}</span><span className="xs:hidden">PDF</span>
          </Button>
        </div>
      }
    />

    {/* Quick Status Chips for Mobile & Desktop */}
    <div className="no-scrollbar mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
      {(["ALL", "PENDING", "COMPLETE", "ESCALATED"] as const).map(s => (
        <button
          key={s}
          type="button"
          onClick={() => { setStatus(s); setPage(1); }}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
            status === s
              ? "bg-forest font-bold text-white shadow-sm"
              : "border border-line bg-white text-ink/70 hover:bg-mist"
          }`}
        >
          {s === "ALL" ? t("archive.all_statuses", "All Statuses") : s === "PENDING" ? t("archive.pending", "Pending") : s === "COMPLETE" ? t("archive.complete", "Complete") : t("archive.escalated", "Escalated")}
        </button>
      ))}

      <button
        type="button"
        onClick={() => setFiltersOpen(v => !v)}
        className={`ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          filtersOpen || activeFilterCount > 0
            ? "border-forest bg-forest/10 font-bold text-forest"
            : "border-line bg-white text-ink/70 hover:bg-mist"
        }`}
      >
        <Filter size={13} />
        <span>{t("archive.filters", "Filters")}</span>
        {activeFilterCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-forest text-[9px] text-white">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>

    {/* Filter Card */}
    <Card className={`p-3.5 sm:p-5 transition-all ${filtersOpen ? "block" : "hidden sm:block"}`}>
      <div className="flex flex-wrap items-end gap-2.5 sm:gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 sm:mb-2 block text-[11px] sm:text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.search", "Search")}</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-ink/40" size={16}/>
            <Input className="h-10 sm:h-11 pl-9 sm:pl-10 text-xs sm:text-sm" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder={t("archive.search_placeholder", "Search cases, tools or results…")} />
          </div>
        </div>
        <div className="w-[calc(50%-5px)] sm:w-auto">
          <label className="mb-1 sm:mb-2 block text-[11px] sm:text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.tool", "Tool")}</label>
          <select value={tool} onChange={e => { setTool(e.target.value as typeof tool); setPage(1); }} className="h-10 sm:h-11 w-full rounded-control border border-line bg-white px-2.5 sm:px-3 text-xs sm:text-sm">
            <option value="ALL">{t("archive.all_tools", "All tools")}</option>
            {tools.map(tOption => <option key={tOption.value} value={tOption.value}>{tOption.label}</option>)}
          </select>
        </div>
        <div className="w-[calc(50%-5px)] sm:w-auto">
          <label className="mb-1 sm:mb-2 block text-[11px] sm:text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.jurisdiction", "Jurisdiction")}</label>
          <select value={jurisdiction} onChange={e => { setJurisdiction(e.target.value as typeof jurisdiction); setPage(1); }} className="h-10 sm:h-11 w-full rounded-control border border-line bg-white px-2.5 sm:px-3 text-xs sm:text-sm">
            <option value="ALL">{t("archive.all", "All")}</option>
            <option value="INDIA">{t("archive.india", "India")}</option>
          </select>
        </div>
      </div>

      <div className="mt-3 sm:mt-4 flex flex-wrap items-end gap-2.5 sm:gap-3 border-t border-line pt-3 sm:pt-4">
        <div className="w-[calc(50%-5px)] sm:w-auto">
          <label className="mb-1 sm:mb-2 block text-[11px] sm:text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.updated_from", "Updated from")}</label>
          <Input type="date" className="h-10 sm:h-11 text-xs sm:text-sm" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div className="w-[calc(50%-5px)] sm:w-auto">
          <label className="mb-1 sm:mb-2 block text-[11px] sm:text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.updated_to", "Updated to")}</label>
          <Input type="date" className="h-10 sm:h-11 text-xs sm:text-sm" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="mb-1 sm:mb-2 block text-[11px] sm:text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.sort", "Sort")}</label>
          <button type="button" onClick={() => setSort(v => v === "updated" ? "title" : "updated")} className="flex h-10 sm:h-11 items-center gap-1.5 sm:gap-2 rounded-control border border-line bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-semibold">
            <ArrowDownUp size={14}/>{sort === "updated" ? t("archive.last_updated", "Last updated") : t("archive.title_sort", "Title")}
          </button>
        </div>
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
          <X size={14}/> {t("archive.clear_filters", "Clear")}
        </Button>
      </div>
    </Card>

    <Card className="mt-3 sm:mt-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-[#F8FAFD] px-3.5 sm:px-5 py-3 sm:py-4">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-navy"/>
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-ink/55">{t("archive.records_count", { count: filtered.length })}</span>
        </div>
        <span className="text-[11px] sm:text-xs text-ink/45">{t("archive.reopen_hint", "Tap row to reopen")}</span>
      </div>

      <div className="hidden grid-cols-[1.5fr_.85fr_.65fr_.65fr_.7fr_.8fr_32px] border-b border-line px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-ink/45 md:grid">
        <span>{t("archive.col_case", "Case")}</span>
        <span>{t("archive.col_tool", "Tool")}</span>
        <span>{t("archive.col_jurisdiction", "Jurisdiction")}</span>
        <span>{t("archive.col_result", "Result")}</span>
        <span>{t("archive.col_status", "Status")}</span>
        <span>{t("archive.col_updated", "Updated")}</span>
        <span />
      </div>

      <div className="divide-y divide-line">
        {isLoading && [1,2,3,4].map(i => (
          <div key={i} className="grid gap-2 p-3.5 sm:p-5 md:grid-cols-7">
            <Skeleton className="h-5"/><Skeleton className="h-5"/><Skeleton className="h-5"/><Skeleton className="h-5"/><Skeleton className="h-6"/><Skeleton className="h-5"/><Skeleton className="h-5"/>
          </div>
        ))}
        {!isLoading && visible.length === 0 && (
          <div className="p-8 sm:p-12 text-center">
            <p className="serif text-xl sm:text-2xl text-forest">{t("archive.no_records", "No archive records match")}</p>
            <p className="mt-1 text-xs sm:text-sm text-ink/55">{t("archive.no_records_desc", "Adjust your filters or clear the search.")}</p>
          </div>
        )}
        {!isLoading && visible.map(item => (
          <Link key={item.id} href={`/cases/${item.id}?tool=${item.tool ?? "ask"}`} className="block p-3.5 sm:p-5 hover:bg-[#FAFBFD] transition-colors">
            <div className="flex flex-col gap-1.5 md:grid md:grid-cols-[1.5fr_.85fr_.65fr_.65fr_.7fr_.8fr_32px] md:items-center">
              <div>
                <p className="font-semibold text-sm sm:text-base">{item.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-ink/50">{item.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 md:block">
                <Badge tone="navy" className="text-[10px] sm:text-xs">{toolLabel(item.tool)}</Badge>
                <span className="text-xs text-ink/60 md:hidden">• {t(item.jurisdiction)}</span>
              </div>
              <div className="hidden text-sm md:block">{t(item.jurisdiction)}</div>
              <div className="text-xs sm:text-sm text-ink/70">
                {item.classification ? t(item.classification) : t("dashboard.awaiting_assessment", "Pending")}
              </div>
              <div className="flex items-center justify-between md:block">
                <div><StatusBadge status={item.status}/></div>
                <div className="text-xs text-ink/50 md:hidden">{formatDate(item.updated_at)}</div>
              </div>
              <div className="hidden text-sm text-ink/60 md:block">{formatDate(item.updated_at)}</div>
              <ChevronRight className="hidden md:block text-ink/30" size={18}/>
            </div>
          </Link>
        ))}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-line px-3.5 sm:px-5 py-3 sm:py-4">
          <p className="text-[11px] sm:text-xs text-ink/55">{t("archive.page_of", { page: safePage, total: pageCount })}</p>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="secondary" size="sm" className="h-8 px-2.5 text-xs" disabled={safePage === 1} onClick={() => setPage(v => Math.max(1, v - 1))}>
              <ChevronLeft size={14}/> <span className="hidden xs:inline">{t("archive.previous", "Previous")}</span>
            </Button>
            <Button variant="secondary" size="sm" className="h-8 px-2.5 text-xs" disabled={safePage === pageCount} onClick={() => setPage(v => Math.min(pageCount, v + 1))}>
              <span className="hidden xs:inline">{t("archive.next", "Next")}</span> <ChevronRight size={14}/>
            </Button>
          </div>
        </div>
      )}
    </Card>

    <div className="mt-3 sm:mt-5 rounded-control border border-line bg-white p-3 text-[11px] sm:text-xs text-ink/55">
      <RotateCcw size={13} className="mr-1.5 inline"/> {t("archive.note", "Re-running a case should create a new backend analysis version rather than overwrite historical results. The archive currently provides retrieval and export; versioned re-analysis remains backend-driven.")}
    </div>
  </div>;
}
