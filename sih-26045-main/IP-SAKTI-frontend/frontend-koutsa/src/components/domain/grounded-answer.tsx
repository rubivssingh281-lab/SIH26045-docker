"use client";

import type { GroundedAnswer } from "@/types";
import { Bot, CheckCircle2, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/components/providers/language-provider";
import { translateApi } from "@/lib/api";

// Inline renderer: handles **bold** and [n] citation markers within a line.
function renderInline(text: string, citations: GroundedAnswer["citations"], keyPrefix: string) {
  const safeCitations = citations || [];
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, index) => {
    if (!part) return null;
    const key = `${keyPrefix}-${index}`;
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={key} className="font-semibold text-forest">{bold[1]}</strong>;
    const cite = part.match(/^\[(\d+)\]$/);
    if (cite) {
      const citation = safeCitations[Number(cite[1]) - 1];
      return citation && citation.source_url
        ? <a key={key} href={citation.source_url} target="_blank" rel="noreferrer" className="mx-0.5 font-bold text-emerald underline decoration-emerald/30 underline-offset-2 hover:decoration-emerald" aria-label={`Source ${cite[1]}: ${citation.title}`}>[{cite[1]}]</a>
        : <sup key={key} className="mx-0.5 font-bold text-emerald" title={citation?.title ?? "Citation"}>[{cite[1]}]</sup>;
    }
    return <span key={key}>{part}</span>;
  });
}

type Block = { type: "p" | "ul" | "ol"; items: string[] };

// Parse a plain-text answer into paragraphs and bullet/numbered lists so a
// run-on model response renders with real structure and spacing.
function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let list: Block | null = null;
  const flush = () => { if (list) { blocks.push(list); list = null; } };
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const bullet = line.match(/^[-*•]\s+(.*)/);
    const numbered = line.match(/^\d+[.)]\s+(.*)/);
    if (bullet) {
      if (!list || list.type !== "ul") { flush(); list = { type: "ul", items: [] }; }
      list.items.push(bullet[1]);
    } else if (numbered) {
      if (!list || list.type !== "ol") { flush(); list = { type: "ol", items: [] }; }
      list.items.push(numbered[1]);
    } else {
      flush();
      blocks.push({ type: "p", items: [line] });
    }
  }
  flush();
  return blocks;
}

function renderAnswer(text: string, citations: GroundedAnswer["citations"]) {
  if (!text) return null;
  return parseBlocks(text).map((block, i) => {
    if (block.type === "ul") {
      return <ul key={i} className="my-3 ml-1 space-y-1.5">{block.items.map((item, j) => (
        <li key={j} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald/70" /><span>{renderInline(item, citations, `${i}-${j}`)}</span></li>
      ))}</ul>;
    }
    if (block.type === "ol") {
      return <ol key={i} className="my-3 ml-1 space-y-1.5">{block.items.map((item, j) => (
        <li key={j} className="flex gap-2"><span className="shrink-0 font-semibold text-emerald">{j + 1}.</span><span>{renderInline(item, citations, `${i}-${j}`)}</span></li>
      ))}</ol>;
    }
    return <p key={i} className="mb-3 last:mb-0">{renderInline(block.items[0], citations, `${i}`)}</p>;
  });
}

export function GroundedAnswer({ result, compact = false }: { result: GroundedAnswer; compact?: boolean }) {
  const { language } = useLanguage();
  const [answer, setAnswer] = useState(result.answer);
  useEffect(() => {
    let active = true;
    if (language === "English" || !result.answer) { setAnswer(result.answer); return; }
    translateApi.text(result.answer, language).then(t => { if (active) setAnswer(t); });
    return () => { active = false; };
  }, [result.answer, language]);
  return (
    <div className={compact ? "space-y-3" : "space-y-6"}>
      <Card className={compact ? "p-4" : "botanical p-7"}>
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest/10 text-forest"><Bot size={18} /></div>
              <div><p className="eyebrow">Sahayak answer</p><p className="text-xs text-ink/55">Grounded research response</p></div>
            </div>
          </div>
          <div className="mt-5 text-[15px] leading-7 text-ink/80">{renderAnswer(answer, result.citations)}</div>
        </div>
      </Card>

      {result.citations && result.citations.length > 0 && (
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Sources</p><h3 className="serif mt-1 text-2xl text-forest">Evidence cited in this answer</h3></div><CheckCircle2 className="text-emerald" size={20} /></div>
        <div className="mt-5 space-y-3">
          {result.citations.map((citation, index) => (
            <div key={`${citation.title}-${index}`} className="rounded-lg border border-line p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">[{index + 1}] {citation.title}</p><p className="mt-1 text-xs text-ink/55">{citation.citation}</p></div>{citation.validated && <Badge tone="success">Validated</Badge>}</div>
              <p className="mt-2 text-sm leading-6 text-ink/70">{citation.excerpt}</p>
              {citation.source_url && <a href={citation.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald hover:underline">Open source <ExternalLink size={12} /></a>}
            </div>
          ))}
        </div>
      </Card>
      )}

    </div>
  );
}
