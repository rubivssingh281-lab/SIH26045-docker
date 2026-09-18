"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Database, LockKeyhole, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/domain/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const categories = [
  { slug: "indian-ip-law", title: "Indian IP law", text: "Patents, geographical indications, trade marks, designs and copyright sources.", type: "Primary legal sources", count: 18 },
  { slug: "biodiversity-abs", title: "Biodiversity & ABS", text: "Biological-diversity legislation, rules and access-and-benefit-sharing material.", type: "India + international", count: 12 },
  { slug: "traditional-knowledge", title: "Traditional knowledge", text: "Public traditional-knowledge references and restricted TKDL access pointers.", type: "Access controlled", count: 9 },
  { slug: "ayush-regulation", title: "AYUSH regulation", text: "Drug, advertising, food and cosmetic classification material relevant to Ayurvedic products.", type: "Regulatory sources", count: 15 },
  { slug: "international-frameworks", title: "International frameworks", text: "TRIPS, CBD, Nagoya, WIPO GRATK, PCT and related international systems.", type: "Treaties + systems", count: 14 },
  { slug: "prior-art-records", title: "Prior art records", text: "Patent and public-registry records returned by the evidence layer.", type: "Registry evidence", count: 20 }
];

export default function SourcesPage() {
  return <div>
    <PageHeader eyebrow="Corpus" title="Source library" description="Browse the source categories the research service can use to ground an assessment. Each category exposes a versioned catalog surface; restricted databases remain access-controlled." />
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-[#D7E6FF] bg-[#EEF5FF] p-5 md:col-span-2"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-navy"><RefreshCw size={19}/></div><div><p className="eyebrow">Corpus freshness</p><h2 className="serif mt-1 text-2xl text-forest">Prototype corpus snapshot</h2><p className="mt-1 text-sm leading-6 text-ink/60">Last synchronized: 27 Aug 2026 · Backend sync status: demonstration data. Production deployments should expose the authoritative sync timestamp from the corpus service.</p></div></div></Card>
      <Card className="p-5"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF0D3] text-[#624000]"><LockKeyhole size={18}/></div><p className="mt-3 text-sm font-bold">Paid source access</p><p className="mt-1 text-xs leading-5 text-ink/60">Connect a user-provided subscription only after explicit consent is recorded.</p><Button variant="secondary" size="sm" className="mt-4">Review consent</Button></Card>
    </div>
    <section className="mt-7"><div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Source categories</p><h2 className="serif mt-1 text-3xl text-forest">Browse the grounding corpus</h2></div><Database className="text-navy" size={22}/></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{categories.map(category => <Link href={`/sources/${category.slug}`} key={category.slug} className="group"><Card className="h-full p-5 transition group-hover:-translate-y-0.5 group-hover:border-[#C9D8D2]"><div className="flex items-start justify-between gap-3"><Badge tone="navy">{category.type}</Badge><span className="text-xs font-bold text-ink/45">{category.count} indexed</span></div><h3 className="serif mt-5 text-2xl text-forest">{category.title}</h3><p className="mt-2 text-sm leading-6 text-ink/60">{category.text}</p><span className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-gold">Open category <ArrowRight size={14}/></span></Card></Link>)}</div></section>
    <div className="mt-6 flex items-center gap-2 rounded-control border border-line bg-white px-4 py-3 text-xs leading-5 text-ink/55"><BookOpen size={15}/> Source records shown here are a frontend catalog surface. The backend must remain the authority for current versions, access permissions, citations and actual retrieval results.</div>
  </div>;
}
