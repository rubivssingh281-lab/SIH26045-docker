"use client";

import { Badge } from "@/components/ui/badge";
import type { CaseStatus } from "@/types";
import { useLanguage } from "@/components/providers/language-provider";

export function StatusBadge({ status }: { status: CaseStatus }) {
  const { t } = useLanguage();
  const map: Record<CaseStatus, { key: string; label: string; tone: "default" | "success" | "gold" | "danger" | "navy" }> = {
    DRAFT: { key: "common.status_draft", label: "Draft", tone: "default" },
    PENDING: { key: "common.status_pending", label: "Pending", tone: "navy" },
    VERIFYING: { key: "common.status_verifying", label: "Verifying", tone: "gold" },
    ANALYZING: { key: "common.status_analyzing", label: "In progress", tone: "navy" },
    COMPLETE: { key: "common.status_complete", label: "Complete", tone: "success" },
    ABSTAINED: { key: "common.status_abstained", label: "Abstained", tone: "danger" },
    ESCALATED: { key: "common.status_escalated", label: "Escalated", tone: "gold" }
  };
  const config = map[status];
  const label = config ? t(config.key, config.label) : t(status || "Unknown");
  const tone = config?.tone || "default";
  return <Badge tone={tone}>{label}</Badge>;
}