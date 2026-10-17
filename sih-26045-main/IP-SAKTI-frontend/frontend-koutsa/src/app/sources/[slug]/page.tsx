"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, FileText } from "lucide-react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";

const catalog: Record<string, { title: string; description: string; records: Array<{ name: string; type: string; version: string; updated: string; access: "PUBLIC" | "RESTRICTED" }> }> = {
  "indian-ip-law": { title: "Indian IP law", description: "Version-tracked catalog surface for core Indian intellectual-property sources.", records: [
    { name: "Patents Act", type: "Statute", version: "Backend version", updated: "Backend sync", access: "PUBLIC" },
    { name: "Geographical Indications framework", type: "Statute / rules", version: "Backend version", updated: "Backend sync", access: "PUBLIC" },
    { name: "Trade Marks framework", type: "Statute / rules", version: "Backend version", updated: "Backend sync", access: "PUBLIC" },
    { name: "Designs framework", type: "Statute / rules", version: "Backend version", updated: "Backend sync", access: "PUBLIC" },
    { name: "Copyright framework", type: "Statute / rules", version: "Backend version", updated: "Backend sync", access: "PUBLIC" }
  ]},
  "biodiversity-abs": { title: "Biodiversity & ABS", description: "Catalog surface for biodiversity legislation, rules and ABS source material.", records: [
    { name: "Biological-diversity legislation", type: "Statute", version: "Backend version", updated: "Backend sync", access: "PUBLIC" },
    { name: "ABS rules / procedures", type: "Rules", version: "Backend version", updated: "Backend sync", access: "PUBLIC" },
    { name: "International ABS framework pointers", type: "Treaty / framework", version: "Backend version", updated: "Backend sync", access: "PUBLIC" }
  ]},
  "traditional-knowledge": { title: "Traditional knowledge", description: "Public-source and access-controlled traditional-knowledge catalog entries.", records: [
    { name: "Public traditional-knowledge references", type: "Reference", version: "Backend version", updated: "Backend sync", access: "PUBLIC" },
    { name: "TKDL access-controlled pointer", type: "Restricted database", version: "Backend version", updated: "Backend sync", access: "RESTRICTED" }
  ]},
  "ayush-regulation": { title: "AYUSH regulation", description: "Drug, advertising, food and cosmetic regulatory source families relevant to Ayurvedic products.", records: [
    { name: "Drugs and Cosmetics framework", type: "Regulatory", version: "Backend version", updated: "Backend sync", access: "PUBLIC" },
    { name: "Drugs and Magic Remedies framework", type: "Regulatory", version: "Backend version", updated: "Backend sync", access: "PUBLIC" },
    { name: "FSSAI Ayurveda-Aahar material", type: "Food regulation", version: "Backend version", updated: "Backend sync", access: "PUBLIC" }
  ]},
  "international-frameworks": { title: "International frameworks", description: "Treaties and international filing or access systems used by the research workflow.", records: [
    { name: "TRIPS", type: "Treaty", version: "Backend version", updated: "Backend sync", access: "PUBLIC" },
    { name: "Convention on Biological Diversity", type: "Treaty", version: "Backend version", updated: "Backend sync", access: "PUBLIC" },
    { name: "Nagoya Protocol", type: "Treaty", version: "Backend version", updated: "Backend sync", access: "PUBLIC" },
    { name: "WIPO GRATK", type: "Treaty", version: "Backend version", updated: "Backend sync", access: "PUBLIC" },
    { name: "PCT / Madrid / Hague / Budapest systems", type: "International system", version: "Backend version", updated: "Backend sync", access: "PUBLIC" }
  ]},
  "prior-art-records": { title: "Prior art records", description: "Public registry and publication candidates returned by the evidence retrieval layer.", records: [
    { name: "Patent publication candidates", type: "Prior art", version: "Query-dependent", updated: "Query-dependent", access: "PUBLIC" },
    { name: "Public registry candidates", type: "Prior art", version: "Query-dependent", updated: "Query-dependent", access: "PUBLIC" }
  ]}
};

export default function SourceCategoryPage() {
  const { t } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const category = catalog[slug];
  
  if (!category) {
    return (
      <div className="rounded-card border border-line bg-white p-8">
        <h1 className="serif text-3xl text-forest">{t("sources.category_not_found", "Source category not found")}</h1>
        <Link href="/sources" className="mt-4 inline-block text-sm font-bold text-gold">
          {t("sources.back_to_sources", "Back to source library")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <Link href="/sources" className="inline-flex items-center gap-2 text-xs font-bold text-ink/55 hover:text-forest">
          <ArrowLeft size={14}/> {t("sources.back_to_library", "Source library")}
        </Link>
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">{t("sources.category_eyebrow", "Source category")}</p>
          <h1 className="serif mt-1 text-4xl text-forest md:text-5xl">{t(category.title)}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">{t(category.description)}</p>
        </div>
        <Button variant="secondary">
          <FileText size={16}/> {t("sources.request_record", "Request current source record")}
        </Button>
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="hidden grid-cols-[1.5fr_.8fr_.8fr_.8fr_.7fr] border-b border-line bg-[#F8FAFD] px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-ink/45 md:grid">
          <span>{t("sources.col_source", "Source")}</span>
          <span>{t("sources.col_type", "Type")}</span>
          <span>{t("sources.col_version", "Version")}</span>
          <span>{t("sources.col_updated", "Last updated")}</span>
          <span>{t("sources.col_access", "Access")}</span>
        </div>
        <div className="divide-y divide-line">
          {category.records.map(record => (
            <div key={record.name} className="grid gap-3 p-5 md:grid-cols-[1.5fr_.8fr_.8fr_.8fr_.7fr] md:items-center">
              <div>
                <p className="font-semibold">{t(record.name)}</p>
                <p className="mt-1 text-xs text-ink/45 md:hidden">{t(record.type)} · {t(record.version)}</p>
              </div>
              <div className="text-sm text-ink/60">{t(record.type)}</div>
              <div className="text-sm text-ink/60">{t(record.version)}</div>
              <div className="flex items-center gap-1 text-sm text-ink/60">
                <CalendarDays size={14}/>{t(record.updated)}
              </div>
              <div>
                <Badge tone={record.access === "PUBLIC" ? "success" : "gold"}>
                  {record.access === "PUBLIC" ? t("sources.public", "Public") : t("sources.restricted", "Restricted")}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-5 flex items-center gap-2 rounded-control border border-line bg-white px-4 py-3 text-xs leading-5 text-ink/55">
        <ExternalLink size={14}/> {t("sources.detail_note", "Current source text, version metadata and citation validity must be supplied by the backend corpus service before being treated as authoritative.")}
      </div>
    </div>
  );
}
