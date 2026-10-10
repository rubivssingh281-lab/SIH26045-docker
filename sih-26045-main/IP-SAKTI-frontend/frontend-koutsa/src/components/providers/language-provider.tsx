"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import en from "@/locales/en.json";
import { translateApi } from "@/lib/api";

export type Language = string;

export interface LanguageOption {
  name: string;    // canonical English name sent to Bhashini
  native: string;  // label shown in the dropdown
  code: string;    // BCP-47 code for speech synthesis
  bhashiniCode: string;
  region: "India" | "International";
}

// Bhashini/IndicTrans supports English plus India's 22 scheduled languages.
// Every non-English dictionary is translated on demand by Bhashini and cached.
export const LANGUAGES: LanguageOption[] = [
  { name: "English", native: "English", code: "en-IN", bhashiniCode: "en", region: "International" },
  { name: "Hindi", native: "हिन्दी", code: "hi-IN", bhashiniCode: "hi", region: "India" },
  { name: "Bengali", native: "বাংলা", code: "bn-IN", bhashiniCode: "bn", region: "India" },
  { name: "Telugu", native: "తెలుగు", code: "te-IN", bhashiniCode: "te", region: "India" },
  { name: "Marathi", native: "मराठी", code: "mr-IN", bhashiniCode: "mr", region: "India" },
  { name: "Tamil", native: "தமிழ்", code: "ta-IN", bhashiniCode: "ta", region: "India" },
  { name: "Urdu", native: "اردو", code: "ur-IN", bhashiniCode: "ur", region: "India" },
  { name: "Gujarati", native: "ગુજરાતી", code: "gu-IN", bhashiniCode: "gu", region: "India" },
  { name: "Kannada", native: "ಕನ್ನಡ", code: "kn-IN", bhashiniCode: "kn", region: "India" },
  { name: "Malayalam", native: "മലയാളം", code: "ml-IN", bhashiniCode: "ml", region: "India" },
  { name: "Odia", native: "ଓଡ଼ିଆ", code: "or-IN", bhashiniCode: "or", region: "India" },
  { name: "Punjabi", native: "ਪੰਜਾਬੀ", code: "pa-IN", bhashiniCode: "pa", region: "India" },
  { name: "Assamese", native: "অসমীয়া", code: "as-IN", bhashiniCode: "as", region: "India" },
  { name: "Maithili", native: "मैथिली", code: "mai-IN", bhashiniCode: "mai", region: "India" },
  { name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ", code: "sat-IN", bhashiniCode: "sat", region: "India" },
  { name: "Kashmiri", native: "کٲشُر", code: "ks-IN", bhashiniCode: "ks", region: "India" },
  { name: "Nepali", native: "नेपाली", code: "ne-NP", bhashiniCode: "ne", region: "India" },
  { name: "Konkani", native: "कोंकणी", code: "kok-IN", bhashiniCode: "gom", region: "India" },
  { name: "Sindhi", native: "سنڌي", code: "sd-IN", bhashiniCode: "sd", region: "India" },
  { name: "Dogri", native: "डोगरी", code: "doi-IN", bhashiniCode: "doi", region: "India" },
  { name: "Manipuri", native: "মেইতেই", code: "mni-IN", bhashiniCode: "mni", region: "India" },
  { name: "Bodo", native: "बड़ो", code: "brx-IN", bhashiniCode: "brx", region: "India" },
  { name: "Sanskrit", native: "संस्कृतम्", code: "sa-IN", bhashiniCode: "sa", region: "India" },
];

export function getLanguageCode(name: string): string {
  return LANGUAGES.find(l => l.name === name)?.code || "en-IN";
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
// Bump the version suffix whenever en.json gains/renames keys, or the translation
// engine changes, so stale per-language caches are discarded and re-fetched.
// v4 = translation provider migrated to Bhashini.
const cacheKey = (lang: string) => `ip-sakti-dict::v4::${lang}`;

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

    try {
      const cached = window.localStorage.getItem(cacheKey(lang));
      if (cached) { setDict(JSON.parse(cached)); return; }
    } catch {}

    // Translate the whole dictionary once via Bhashini, then cache.
    setDict(en); // show English while the translation is fetched
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

  const t = (key: string): string => {
    const keys = key.split(".");
    let current: any = dict;
    for (const k of keys) {
      if (current == null || current[k] === undefined) {
        let fallback: any = en;
        for (const fk of keys) {
          if (fallback == null || fallback[fk] === undefined) return key;
          fallback = fallback[fk];
        }
        return fallback as string;
      }
      current = current[k];
    }
    return typeof current === "string" ? current : key;
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
