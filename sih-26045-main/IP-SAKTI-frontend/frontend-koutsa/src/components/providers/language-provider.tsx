"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

// Scheduled Languages
import en from "@/locales/en.json";
import as from "@/locales/as.json";
import bn from "@/locales/bn.json";
import brx from "@/locales/brx.json";
import doi from "@/locales/doi.json";
import gom from "@/locales/gom.json";
import gu from "@/locales/gu.json";
import hi from "@/locales/hi.json";
import kn from "@/locales/kn.json";
import ks from "@/locales/ks.json";
import mai from "@/locales/mai.json";
import ml from "@/locales/ml.json";
import mni from "@/locales/mni.json";
import mr from "@/locales/mr.json";
import ne from "@/locales/ne.json";
import or from "@/locales/or.json";
import pa from "@/locales/pa.json";
import sa from "@/locales/sa.json";
import sat from "@/locales/sat.json";
import sd from "@/locales/sd.json";
import ta from "@/locales/ta.json";
import te from "@/locales/te.json";
import ur from "@/locales/ur.json";

// Additional Indian Languages & Regional Dialects
import awa from "@/locales/awa.json";
import bho from "@/locales/bho.json";
import bra from "@/locales/bra.json";
import hne from "@/locales/hne.json";
import gon from "@/locales/gon.json";
import hoc from "@/locales/hoc.json";
import xnr from "@/locales/xnr.json";
import mag from "@/locales/mag.json";
import lus from "@/locales/lus.json";
import si from "@/locales/si.json";
import tcy from "@/locales/tcy.json";
import bhb from "@/locales/bhb.json";
import bgc from "@/locales/bgc.json";
import raj from "@/locales/raj.json";
import kha from "@/locales/kha.json";
import hinglish from "@/locales/hinglish.json";

import { translateApi } from "@/lib/api";

export type Language = string;

export interface LanguageOption {
  name: string;    // canonical English name
  native: string;  // label shown in the dropdown
  code: string;    // BCP-47 code for speech synthesis
  bhashiniCode: string;
  region: "Scheduled Languages" | "Additional Indian Languages" | "International";
}

// 100% Pre-compiled Dictionaries for EVERY language (22 Scheduled + 16 Additional + English)
const staticDicts: Record<string, unknown> = {
  English: en,
  // 22 Scheduled Languages
  Assamese: as,
  Bengali: bn,
  Bodo: brx,
  Dogri: doi,
  Gujarati: gu,
  Hindi: hi,
  Kannada: kn,
  Kashmiri: ks,
  Konkani: gom,
  Maithili: mai,
  Malayalam: ml,
  Manipuri: mni,
  Marathi: mr,
  Nepali: ne,
  Odia: or,
  Punjabi: pa,
  Sanskrit: sa,
  Santali: sat,
  Sindhi: sd,
  Tamil: ta,
  Telugu: te,
  Urdu: ur,
  // Additional Indian Languages & Regional Dialects
  Awadhi: awa,
  Bhojpuri: bho,
  Braj: bra,
  Chhattisgarhi: hne,
  Gondi: gon,
  Ho: hoc,
  Kangri: xnr,
  Magahi: mag,
  Mizo: lus,
  Sinhala: si,
  Tulu: tcy,
  Bhili: bhb,
  Haryanvi: bgc,
  Rajasthani: raj,
  Khasi: kha,
  Hinglish: hinglish,
};

// Full multilingual coverage: English + 22 Scheduled Languages + 16 Additional Indian Languages
export const LANGUAGES: LanguageOption[] = [
  // International
  { name: "English", native: "English", code: "en-IN", bhashiniCode: "en", region: "International" },

  // 22 Scheduled Languages of India (100% Bhashini verified)
  { name: "Assamese", native: "অসমীয়া", code: "as-IN", bhashiniCode: "as", region: "Scheduled Languages" },
  { name: "Bengali", native: "বাংলা", code: "bn-IN", bhashiniCode: "bn", region: "Scheduled Languages" },
  { name: "Bodo", native: "बड़ो", code: "brx-IN", bhashiniCode: "brx", region: "Scheduled Languages" },
  { name: "Dogri", native: "डोगरी", code: "doi-IN", bhashiniCode: "doi", region: "Scheduled Languages" },
  { name: "Gujarati", native: "ગુજરાતી", code: "gu-IN", bhashiniCode: "gu", region: "Scheduled Languages" },
  { name: "Hindi", native: "हिन्दी", code: "hi-IN", bhashiniCode: "hi", region: "Scheduled Languages" },
  { name: "Kannada", native: "ಕನ್ನಡ", code: "kn-IN", bhashiniCode: "kn", region: "Scheduled Languages" },
  { name: "Kashmiri", native: "کٲشُر", code: "ks-IN", bhashiniCode: "ks", region: "Scheduled Languages" },
  { name: "Konkani", native: "कोंकणी", code: "kok-IN", bhashiniCode: "gom", region: "Scheduled Languages" },
  { name: "Maithili", native: "मैथिली", code: "mai-IN", bhashiniCode: "mai", region: "Scheduled Languages" },
  { name: "Malayalam", native: "മലയാളം", code: "ml-IN", bhashiniCode: "ml", region: "Scheduled Languages" },
  { name: "Manipuri", native: "মেইতেই", code: "mni-IN", bhashiniCode: "mni", region: "Scheduled Languages" },
  { name: "Marathi", native: "मराठी", code: "mr-IN", bhashiniCode: "mr", region: "Scheduled Languages" },
  { name: "Nepali", native: "नेपाली", code: "ne-NP", bhashiniCode: "ne", region: "Scheduled Languages" },
  { name: "Odia", native: "ଓଡ଼ିଆ", code: "or-IN", bhashiniCode: "or", region: "Scheduled Languages" },
  { name: "Punjabi", native: "ਪੰਜਾਬੀ", code: "pa-IN", bhashiniCode: "pa", region: "Scheduled Languages" },
  { name: "Sanskrit", native: "संस्कृतम्", code: "sa-IN", bhashiniCode: "sa", region: "Scheduled Languages" },
  { name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ", code: "sat-IN", bhashiniCode: "sat", region: "Scheduled Languages" },
  { name: "Sindhi", native: "سنڌي", code: "sd-IN", bhashiniCode: "sd", region: "Scheduled Languages" },
  { name: "Tamil", native: "தமிழ்", code: "ta-IN", bhashiniCode: "ta", region: "Scheduled Languages" },
  { name: "Telugu", native: "తెలుగు", code: "te-IN", bhashiniCode: "te", region: "Scheduled Languages" },
  { name: "Urdu", native: "اردو", code: "ur-IN", bhashiniCode: "ur", region: "Scheduled Languages" },

  // Additional Indian Languages
  { name: "Awadhi", native: "अवधी", code: "awa-IN", bhashiniCode: "awa", region: "Additional Indian Languages" },
  { name: "Bhojpuri", native: "भोजपुरी", code: "bho-IN", bhashiniCode: "bho", region: "Additional Indian Languages" },
  { name: "Braj", native: "ब्रजभाषा", code: "bra-IN", bhashiniCode: "bra", region: "Additional Indian Languages" },
  { name: "Chhattisgarhi", native: "छत्तीसगढ़ी", code: "hne-IN", bhashiniCode: "hne", region: "Additional Indian Languages" },
  { name: "Gondi", native: "गोंडी", code: "gon-IN", bhashiniCode: "gon", region: "Additional Indian Languages" },
  { name: "Ho", native: "ᱦᱳ", code: "hoc-IN", bhashiniCode: "hoc", region: "Additional Indian Languages" },
  { name: "Kangri", native: "कांगड़ी", code: "xnr-IN", bhashiniCode: "xnr", region: "Additional Indian Languages" },
  { name: "Magahi", native: "मगही", code: "mag-IN", bhashiniCode: "mag", region: "Additional Indian Languages" },
  { name: "Mizo", native: "Mizo ṭawng", code: "lus-IN", bhashiniCode: "lus", region: "Additional Indian Languages" },
  { name: "Sinhala", native: "සිංහල", code: "si-LK", bhashiniCode: "si", region: "Additional Indian Languages" },
  { name: "Tulu", native: "ತುಳು", code: "tcy-IN", bhashiniCode: "tcy", region: "Additional Indian Languages" },
  { name: "Bhili", native: "भीली", code: "bhb-IN", bhashiniCode: "bhb", region: "Additional Indian Languages" },
  { name: "Haryanvi", native: "हरियाणवी", code: "bgc-IN", bhashiniCode: "bgc", region: "Additional Indian Languages" },
  { name: "Rajasthani", native: "राजस्थानी", code: "raj-IN", bhashiniCode: "raj", region: "Additional Indian Languages" },
  { name: "Khasi", native: "Ka Ktien Khasi", code: "kha-IN", bhashiniCode: "kha", region: "Additional Indian Languages" },
  { name: "Hinglish", native: "Hinglish", code: "hi-Latn-IN", bhashiniCode: "hinglish", region: "Additional Indian Languages" },
];

export function getLanguageCode(name: string): string {
  return LANGUAGES.find(l => l.name === name)?.code || "en-IN";
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyOrEnglish: string, paramsOrFallback?: Record<string, string | number> | string) => string;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const cacheKey = (lang: string) => `ip-sakti-dict::v9::${lang}`;

// Build reverse lookup index from English phrases to key paths
const enToKeyMap: Record<string, string> = {
  // Manual overrides for short common terms
  "india": "common.india",
  "international": "common.international",
  "draft": "common.status_draft",
  "pending": "common.status_pending",
  "verifying": "common.status_verifying",
  "in progress": "common.status_analyzing",
  "complete": "common.status_complete",
  "abstained": "common.status_abstained",
  "escalated": "common.status_escalated",
  "search": "archive.search",
  "tool": "archive.tool",
  "status": "archive.status",
  "records": "archive.eyebrow",
  "all": "archive.all",
  "case": "archive.col_case",
  "result": "archive.col_result",
  "updated": "archive.col_updated",
  "jurisdiction": "archive.jurisdiction",
  "dashboard": "nav.dashboard",
  "ask sahayak": "nav.ask_sahayak",
  "ip navigator": "nav.ip_navigator",
  "formulation classifier": "nav.formulation_classifier",
  "abs compliance": "nav.abs_compliance",
  "tkdl / prior art": "nav.tkdl_prior_art",
  "regulatory pathway": "nav.regulatory_pathway",
  "deep research": "nav.reasoning",
  "case archive": "nav.case_archive",
  "source library": "nav.source_library",
  "connected sources": "nav.connectors",
  "share": "case_view.share",
  "report": "case_view.report",
  "history": "case_view.history",
  "run analysis": "case_view.run_analysis",
  "re-run analysis": "case_view.rerun_analysis",
  "running analysis…": "case_view.running_analysis",
  "view explainability": "case_view.explainability",
  "request human review": "case_view.request_human_review",
  "requesting review…": "case_view.requesting_review",
  "patent": "common.patent",
  "trademark": "common.trademark",
  "gi": "common.gi",
  "design": "common.design",
  "copyright": "common.copyright",
  "plant variety": "common.plant_variety",
};

function indexObject(obj: any, prefix = "") {
  if (!obj || typeof obj !== "object") return;
  for (const [k, v] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      const normalized = v.trim().toLowerCase();
      if (!enToKeyMap[normalized]) {
        enToKeyMap[normalized] = fullPath;
      }
    } else if (typeof v === "object") {
      indexObject(v, fullPath);
    }
  }
}
indexObject(en);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("English");
  const [dict, setDict] = useState<any>(en);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("ip-sakti-language");
    if (saved && saved !== "English") applyLanguage(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyLanguage(lang: string) {
    setLanguageState(lang);
    try { window.localStorage.setItem("ip-sakti-language", lang); } catch {}

    if (lang === "English") { setDict(en); return; }

    // Instant pre-compiled Bhashini dictionaries (0ms latency, 100% translated, like Hindi)
    if (staticDicts[lang]) {
      setDict(staticDicts[lang]);
      return;
    }

    try {
      const cached = window.localStorage.getItem(cacheKey(lang));
      if (cached) { setDict(JSON.parse(cached)); return; }
    } catch {}

    // Dynamic Bhashini API translation fallback
    setDict(en);
    setIsTranslating(true);
    try {
      const translated = await translateApi.dictionary(en as Record<string, unknown>, lang);
      setDict(translated);
      try { window.localStorage.setItem(cacheKey(lang), JSON.stringify(translated)); } catch {}
    } catch {
      setDict(en);
    } finally {
      setIsTranslating(false);
    }
  }

  const resolvePath = (d: any, path: string): string | undefined => {
    if (!d || !path) return undefined;
    const parts = path.split(".");
    let cur = d;
    for (const part of parts) {
      if (cur == null || cur[part] === undefined) return undefined;
      cur = cur[part];
    }
    return typeof cur === "string" ? cur : undefined;
  };

  const t = (keyOrEnglish: string, paramsOrFallback?: Record<string, string | number> | string): string => {
    if (!keyOrEnglish) return "";
    let lookupKey = keyOrEnglish;

    // Check if directly resolves in dict
    let res = resolvePath(dict, lookupKey);

    // If not found, check if it's an English phrase that maps to a key
    if (!res) {
      const mappedKey = enToKeyMap[keyOrEnglish.trim().toLowerCase()];
      if (mappedKey) {
        lookupKey = mappedKey;
        res = resolvePath(dict, mappedKey);
      }
    }

    // Fallback to English dict
    if (!res) {
      res = resolvePath(en, lookupKey);
    }

    // Final fallback
    let out = res ?? (typeof paramsOrFallback === "string" ? paramsOrFallback : keyOrEnglish);

    // Apply template parameters if provided
    if (paramsOrFallback && typeof paramsOrFallback === "object") {
      for (const [pk, pv] of Object.entries(paramsOrFallback)) {
        out = out.replace(new RegExp(`\\{${pk}\\}`, "g"), String(pv));
      }
    }

    return out;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: applyLanguage, t, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
}
