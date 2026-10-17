"use client";

import { useLanguage } from "@/components/providers/language-provider";

export function Disclaimer() {
  const { t } = useLanguage();
  return (
    <div className="rounded-control border border-[#E7DCC2] bg-[#FFF9EA] px-4 py-3 text-xs leading-5 text-[#624000]">
      {t("common.disclaimer", "This is an AI-assisted research assessment and does not constitute legal advice.")}
    </div>
  );
}