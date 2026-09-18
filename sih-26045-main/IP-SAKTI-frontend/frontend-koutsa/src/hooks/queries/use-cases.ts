"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assistantApi, caseApi } from "@/lib/api";
import type { Fact, Jurisdiction, ResearchTool } from "@/types";

export function useCases() {
  return useQuery({ queryKey: ["cases"], queryFn: caseApi.list });
}

export function useCase(id: string) {
  return useQuery({ queryKey: ["case", id], queryFn: () => caseApi.get(id), enabled: Boolean(id) });
}

export function useFacts(id: string) {
  return useQuery({ queryKey: ["facts", id], queryFn: () => caseApi.facts(id), enabled: Boolean(id) });
}

export function useExplanation(id: string) {
  return useQuery({ queryKey: ["explanation", id], queryFn: () => caseApi.explain(id), enabled: Boolean(id) });
}

export function useCaseHistory(id: string) {
  return useQuery({ queryKey: ["case-history", id], queryFn: () => caseApi.history(id), enabled: Boolean(id) });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; description: string; as_of_date: string; jurisdiction: Jurisdiction; tool?: ResearchTool; tool_input?: Record<string, unknown> }) => caseApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] })
  });
}

export function useConfirmFacts(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (facts: Fact[]) => caseApi.confirmFacts(id, facts),
    onSuccess: data => {
      qc.setQueryData(["facts", id], data);
      qc.invalidateQueries({ queryKey: ["case", id] });
    }
  });
}

export function useAnalyzeCase(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { jurisdiction: Jurisdiction; as_of_date: string; tool?: string }) => caseApi.analyze(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case", id] });
      qc.invalidateQueries({ queryKey: ["cases"] });
    }
  });
}

export function useEscalate(id: string) {
  return useMutation({ mutationFn: (reason: string) => caseApi.escalate(id, reason) });
}
export function useUploadCaseDocument() {
  return useMutation({ mutationFn: (file: File) => caseApi.uploadDocument(file) });
}

export function useAssistantChat() {
  return useMutation({ mutationFn: (message: string) => assistantApi.ask(message) });
}
