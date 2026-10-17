"use client";

import { useParams } from "next/navigation";
import { Download, History, Printer, Share2 } from "lucide-react";
import Link from "next/link";
import { useCase } from "@/hooks/queries/use-cases";
import { caseApi, getApiErrorMessage } from "@/lib/api";
import { Breadcrumb, PageHeader } from "@/components/domain/page-header";
import { ShareCaseButton } from "@/components/domain/share-case-button";
import { Disclaimer } from "@/components/domain/disclaimer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/language-provider";

export default function CaseReportPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { data: caseItem, isLoading } = useCase(id);
  const [downloading, setDownloading] = useState(false);

  async function downloadReport() {
    setDownloading(true);
    try {
      const blob = await caseApi.report(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${id}-case-report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t("report.title", "Case report ready"), { 
        description: t("archive.export_success", "The case report was downloaded successfully.") 
      });
    } catch (err) {
      toast.error(t("archive.export_failed", "Report download failed"), { 
        description: getApiErrorMessage(err, t("common.error_desc", "We couldn't generate the case report right now.")) 
      });
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading) return <div className="space-y-5"><Skeleton className="h-6 w-40" /><Skeleton className="h-16 w-2/3" /><Skeleton className="h-[480px]" /></div>;
  if (!caseItem) return <Card className="p-8">{t("explain.error_trace", "This case could not be found.")}</Card>;

  return (
    <div>
      <Breadcrumb items={[
        { label: t("nav.dashboard", "Dashboard"), href: "/dashboard" }, 
        { label: caseItem.title, href: `/cases/${id}` }, 
        { label: t("case_view.report", "Report") }
      ]} />
      <PageHeader
        title={t("report.title", "Case report")}
        description={t("report.description", "A printable, shareable view of the current evidence-grounded assessment. The report is informational and remains subject to backend evidence and versioning.")}
        action={
          <div className="flex flex-wrap gap-2">
            <ShareCaseButton />
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} /> {t("report.print", "Print")}
            </Button>
            <Button onClick={downloadReport} disabled={downloading}>
              <Download size={16} /> {downloading ? t("report.preparing_pdf", "Preparing PDF…") : t("report.download_pdf", "Download PDF")}
            </Button>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-7 md:p-9">
          <div className="border-b border-line pb-6">
            <p className="eyebrow">IP-SAKTI Sahayak</p>
            <h2 className="serif mt-2 text-4xl text-forest">{caseItem.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/65">{caseItem.description}</p>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <Info label={t("explain.jurisdiction", "Jurisdiction")} value={caseItem.jurisdiction === "INDIA" ? t("common.india", "India") : t("common.international", "International")} />
            <Info label={t("explain.as_of_date", "As-of date")} value={caseItem.as_of_date} />
            <Info label={t("explain.analysis_version", "Analysis version")} value={t("explain.version_n", "Version {version}").replace("{version}", String(caseItem.version))} />
          </div>
          <div className="mt-7 rounded-lg bg-[#F7F9FC] p-5">
            <p className="eyebrow">{t("report.report_contents", "Report contents")}</p>
            <p className="mt-2 text-sm leading-6 text-ink/70">{t("report.report_contents_desc", "The generated backend report may contain classification, confidence, rules, evidence, citations, limitations, ABS/TKDL indicators and other case-specific research outputs.")}</p>
          </div>
          <div className="mt-7"><Disclaimer /></div>
        </Card>
        <div className="space-y-5">
          <Card className="p-6">
            <p className="eyebrow">{t("report.case_controls", "Case controls")}</p>
            <div className="mt-4 space-y-2">
              <Link href={`/cases/${id}`} className="block">
                <Button variant="secondary" className="w-full">{t("report.view_analysis", "View analysis")}</Button>
              </Link>
              <Link href={`/cases/${id}/history`} className="block">
                <Button variant="secondary" className="w-full">
                  <History size={16}/> {t("report.view_case_history", "View case history")}
                </Button>
              </Link>
            </div>
          </Card>
          <Card className="p-6 bg-[#EEF5FF] border-[#D6E3FF]">
            <Share2 className="text-navy" size={20}/>
            <p className="mt-3 font-bold text-navy">{t("report.readonly_sharing", "Read-only sharing")}</p>
            <p className="mt-1 text-xs leading-5 text-navy/65">{t("report.readonly_sharing_desc", "This prototype copies the current case URL. A tokenized public link can be enabled later if the backend adds one.")}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-line p-4"><p className="eyebrow">{label}</p><p className="mt-2 font-semibold">{value}</p></div>; }

