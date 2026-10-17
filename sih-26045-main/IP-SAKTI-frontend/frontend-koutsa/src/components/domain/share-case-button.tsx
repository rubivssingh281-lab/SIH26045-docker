"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";

export function ShareCaseButton({ label }: { label?: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const displayLabel = label ?? t("case_view.share", "Share");

  async function handleShare() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be unavailable on insecure/local browser contexts.
    }
  }

  return (
    <Button variant="secondary" onClick={handleShare} title={t("case_view.share", "Share")}>
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? t("case_view.link_copied", "Link copied") : displayLabel}
    </Button>
  );
}
