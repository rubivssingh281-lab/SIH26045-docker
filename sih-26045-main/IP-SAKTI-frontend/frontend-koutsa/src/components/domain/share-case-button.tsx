"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ShareCaseButton({ label = "Share" }: { label?: string }) {
  const [copied, setCopied] = useState(false);

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
    <Button variant="secondary" onClick={handleShare} title="Copy or share this case link">
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "Link copied" : label}
    </Button>
  );
}
