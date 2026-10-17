"use client";

import { CheckCircle2, CircleDot, FileCheck2, FilePenLine, Flag, Plus, ShieldAlert, UserRound } from "lucide-react";
import type { CaseHistoryEvent, CaseHistoryEventType } from "@/types";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";

const iconMap: Record<CaseHistoryEventType, typeof Plus> = {
  CREATED: Plus,
  FACTS_MODIFIED: FilePenLine,
  FACTS_CONFIRMED: CheckCircle2,
  ANALYZED: FileCheck2,
  REPORT_GENERATED: FileCheck2,
  ESCALATED: ShieldAlert,
  NOTE: CircleDot
};

export function CaseHistoryTimeline({ events }: { events: CaseHistoryEvent[] }) {
  const { t } = useLanguage();
  const sorted = [...events].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  return (
    <Card className="p-6 md:p-8">
      <div className="mb-7">
        <p className="eyebrow">{t("history.audit_trail", "Audit trail")}</p>
        <h2 className="serif mt-1 text-3xl text-forest">{t("history.history_heading", "Case history")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">{t("history.history_desc", "A chronological record of case creation, fact changes, confirmation, analysis and other backend-reported actions.")}</p>
      </div>
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-[#FAFBFD] p-7 text-center text-sm text-ink/60">{t("history.no_history", "No case history is available for this record.")}</div>
      ) : (
        <ol className="space-y-0">
          {sorted.map((event, index) => {
            const Icon = iconMap[event.type];
            return (
              <li key={event.id} className="relative flex gap-4 pb-8 last:pb-0">
                {index < sorted.length - 1 && <div className="absolute left-[17px] top-9 h-[calc(100%-4px)] w-px bg-line" aria-hidden="true" />}
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C9D4E0] bg-white text-navy shadow-sm">
                  <Icon size={16} strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-line bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-ink">{t(event.title)}</p>
                      <p className="mt-1 text-xs text-ink/50">{formatDate(event.occurred_at)} · {new Date(event.occurred_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    {event.version ? <span className="rounded-full bg-mist px-2.5 py-1 text-[11px] font-bold text-navy">{t("explain.version_n", { version: event.version })}</span> : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink/70">{t(event.description)}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink/55"><UserRound size={13} /> {t(event.actor)}</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
