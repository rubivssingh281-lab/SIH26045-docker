"use client";

import { Check, CircleAlert, CircleDot, Clock3 } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import type { ExplainabilityTrace } from "@/types";
import { Card } from "@/components/ui/card";
import { TextToSpeech } from "@/components/ui/text-to-speech";
import { useLanguage } from "@/components/providers/language-provider";

// Inline **bold** rendering.
function inline(text: string, key: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const b = part.match(/^\*\*([^*]+)\*\*$/);
    return b
      ? <strong key={`${key}-${i}`} className="font-semibold text-forest">{b[1]}</strong>
      : <Fragment key={`${key}-${i}`}>{part}</Fragment>;
  });
}

// Markdown-lite renderer for step details: paragraphs, "- " bullets and **bold**.
function renderDetails(text: string) {
  if (!text) return null;
  if (!text.includes("\n") && !text.includes("**") && !/^[-*•]\s/.test(text)) {
    return <p className="mt-1 text-sm leading-6 text-ink/65">{text}</p>;
  }
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="mt-1 ml-1 space-y-1">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm leading-6 text-ink/70">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald/70" />
              <span>{inline(b, `li-${blocks.length}-${i}`)}</span>
            </li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };
  text.replace(/\r/g, "").split("\n").forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) { flush(); return; }
    const m = line.match(/^[-*•]\s+(.*)/);
    if (m) { bullets.push(m[1]); return; }
    flush();
    blocks.push(<p key={`p-${idx}`} className="mt-2 text-sm leading-6 text-ink/70">{inline(line, `p-${idx}`)}</p>);
  });
  flush();
  return <div className="mt-1">{blocks}</div>;
}

export function ExplainabilityStepper({ trace }: { trace: ExplainabilityTrace }) {
  const { t } = useLanguage();
  return (
    <Card className="p-6">
      <div className="mb-7">
        <p className="eyebrow">{t("explain.trace_title", "Trace")}</p>
        <h2 className="serif mt-1 text-3xl">{t("explain.trace_heading", "How the assessment was formed")}</h2>
      </div>
      <div className="space-y-0">
        {trace.steps.map((step, index) => {
          const Icon = step.status === "success" ? Check : step.status === "warning" ? CircleAlert : step.status === "pending" ? Clock3 : CircleDot;
          return (
            <div key={`${step.title}-${index}`} className="relative flex gap-4 pb-7 last:pb-0">
              {index < trace.steps.length - 1 && <div className="absolute left-[15px] top-8 h-[calc(100%-12px)] w-px bg-line" />}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-white text-navy">
                <Icon size={15} strokeWidth={1.7} />
              </div>
              <div className="w-full pr-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold">{step.title}</p>
                    {renderDetails(step.details)}
                  </div>
                  <TextToSpeech text={step.details} />
                </div>
                {step.items && step.items.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {step.items.map((item, i) => {
                      const shortValue = item.value && item.value.length <= 24;
                      return (
                        <div key={`${item.label}-${i}`} className="rounded-lg border border-line bg-[#FAFBFD] p-3">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-xs font-bold text-navy">{item.label}</span>
                            {shortValue && <span className="shrink-0 text-xs font-semibold text-ink/80">{item.value}</span>}
                          </div>
                          {item.value && !shortValue && <p className="mt-1 text-xs leading-5 text-ink/75">{item.value}</p>}
                          {item.meta && <p className="mt-1 text-[11px] leading-4 text-ink/50">{item.meta}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}