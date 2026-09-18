import { Badge } from "@/components/ui/badge";
import type { CaseStatus } from "@/types";

export function StatusBadge({ status }: { status: CaseStatus }) {
  const map: Record<CaseStatus, { label: string; tone: "default" | "success" | "gold" | "danger" | "navy" }> = {
    DRAFT: { label: "Draft", tone: "default" },
    PENDING: { label: "Pending", tone: "navy" },
    VERIFYING: { label: "Verifying", tone: "gold" },
    ANALYZING: { label: "In progress", tone: "navy" },
    COMPLETE: { label: "Complete", tone: "success" },
    ABSTAINED: { label: "Abstained", tone: "danger" },
    ESCALATED: { label: "Escalated", tone: "gold" }
  };
  const config = map[status] || { label: status || "Unknown", tone: "default" };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}