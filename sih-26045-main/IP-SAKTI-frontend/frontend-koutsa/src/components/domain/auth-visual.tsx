"use client";

import { CheckCircle2, Leaf, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

export function AuthVisual({ mode }: { mode: "login" | "register" }) {
  const { t } = useLanguage();
  const login = mode === "login";

  const title = login 
    ? t("auth.visual_login_title", "Research Ayurvedic IP with confidence.") 
    : t("auth.visual_register_title", "Start your Ayurvedic IP research journey.");

  const intro = login
    ? t("auth.visual_login_intro", "Access your IP-SAKTI Sahayak workspace to manage Ayurvedic intellectual property, traditional knowledge, ABS and regulatory research.")
    : t("auth.visual_register_intro", "Create your IP-SAKTI Sahayak account and get access to a dedicated workspace for Ayurvedic intellectual property, traditional knowledge, ABS and regulatory research.");

  const points = login
    ? [
        t("auth.visual_pt_classification", "Formulation classification"),
        t("auth.visual_pt_tkdl", "TKDL and prior-art research"),
        t("auth.visual_pt_abs", "ABS compliance analysis"),
        t("auth.visual_pt_regulatory", "Regulatory pathway research")
      ]
    : [
        t("auth.visual_pt_organize", "Organize your research cases"),
        t("auth.visual_pt_classify", "Classify Ayurvedic formulations"),
        t("auth.visual_pt_explore", "Explore TKDL and prior art"),
        t("auth.visual_pt_analyze", "Analyze ABS compliance")
      ];

  return (
    <section className="relative hidden min-h-[100dvh] overflow-hidden bg-forest px-10 py-10 text-white lg:flex lg:flex-col lg:px-14 xl:px-16">
      <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-emerald/55" />
      <div className="pointer-events-none absolute -bottom-8 -left-20 h-72 w-72 rounded-full border border-emerald/45" />
      <div className="pointer-events-none absolute bottom-14 right-10 h-36 w-36 rounded-full bg-white/5" />

      <div className="relative z-10 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-forest shadow-sm"><Leaf size={28} strokeWidth={1.8} /></div>
        <div>
          <div className="serif text-3xl leading-none">IP-SAKTI</div>
          <div className="mt-1 text-sm font-semibold tracking-wide text-white/70">Sahayak AI</div>
        </div>
      </div>

      <div className="relative z-10 mt-12 max-w-[560px]">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald/60 bg-emerald/20 px-4 py-2 text-xs font-bold text-white/90">
          <ShieldCheck size={15} /> {t("auth.visual_evidence", "Evidence-grounded research")}
        </div>
        <h2 className="serif mt-7 text-5xl leading-[1.05] xl:text-[58px]">{title}</h2>
        <p className="mt-7 max-w-[500px] text-base leading-8 text-white/72">{intro}</p>

        <div className="mt-10 space-y-4">
          {points.map((point, idx) => (
            <div key={idx} className="flex items-center gap-3 text-[15px] text-white/88">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald/50 bg-emerald/15 text-emerald"><CheckCircle2 size={17} /></span>
              {point}
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-auto pt-10 text-xs text-white/45">© {new Date().getFullYear()} IP-SAKTI Sahayak</div>
    </section>
  );
}
