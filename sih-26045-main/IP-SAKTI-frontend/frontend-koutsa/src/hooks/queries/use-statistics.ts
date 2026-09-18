"use client";

import { useMemo } from "react";
import { useCases } from "@/hooks/queries/use-cases";
import type { Case } from "@/types";

export interface ClassificationStatistic {
  name: string;
  value: number;
}

export interface CaseStatistics {
  totalCases: number;
  totalCasesAnalyzed: number;
  pending: number;
  complete: number;
  escalated: number;
  classification: ClassificationStatistic[];
}

function normalizeClassification(value?: string) {
  if (!value) return "Unclassified";
  return value.trim() || "Unclassified";
}

export function buildCaseStatistics(cases: Case[]): CaseStatistics {
  const classificationCounts = new Map<string, number>();

  for (const item of cases) {
    const name = normalizeClassification(item.classification);
    classificationCounts.set(name, (classificationCounts.get(name) ?? 0) + 1);
  }

  const classification = Array.from(classificationCounts, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  return {
    totalCases: cases.length,
    totalCasesAnalyzed: cases.filter(item => Boolean(item.classification || item.confidence)).length,
    pending: cases.filter(item => ["DRAFT", "PENDING", "VERIFYING", "ANALYZING"].includes(item.status)).length,
    complete: cases.filter(item => item.status === "COMPLETE").length,
    escalated: cases.filter(item => item.status === "ESCALATED").length,
    classification
  };
}

export function useCaseStatistics() {
  const query = useCases();
  const statistics = useMemo(() => buildCaseStatistics(query.data ?? []), [query.data]);

  return {
    ...query,
    statistics
  };
}
