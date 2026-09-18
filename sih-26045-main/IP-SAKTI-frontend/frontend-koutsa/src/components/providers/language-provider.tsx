"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import te from "@/locales/te.json";
import bn from "@/locales/bn.json";
import { translateApi } from "@/lib/api";

export type Language = string;

export interface LanguageOption {
  name: string;    // canonical English name (used as the key / sent to Gemini)
  native: string;  // label shown in the dropdown
  code: string;    // BCP-47 code for speech synthesis
  region: "India" | "International";
}

// Languages offered in the top-bar dropdown. English + all 22 scheduled Indian
// languages (+ Sanskrit) + major world languages. English/Hindi/Telugu/Bengali are
// pre-seeded (instant); any other language is translated on demand by the LOCAL
// Gemma model and cached, so this list can grow freely.
export const LANGUAGES: LanguageOption[] = [
  { name: "English", native: "English", code: "en-IN", region: "International" },
  // --- India (scheduled languages + Sanskrit) ---
  { name: "Hindi", native: "हिन्दी", code: "hi-IN", region: "India" },
  { name: "Bengali", native: "বাংলা", code: "bn-IN", region: "India" },
  { name: "Telugu", native: "తెలుగు", code: "te-IN", region: "India" },
  { name: "Marathi", native: "मराठी", code: "mr-IN", region: "India" },
  { name: "Tamil", native: "தமிழ்", code: "ta-IN", region: "India" },
  { name: "Urdu", native: "اردو", code: "ur-IN", region: "India" },
  { name: "Gujarati", native: "ગુજરાતી", code: "gu-IN", region: "India" },
  { name: "Kannada", native: "ಕನ್ನಡ", code: "kn-IN", region: "India" },
  { name: "Malayalam", native: "മലയാളം", code: "ml-IN", region: "India" },
  { name: "Odia", native: "ଓଡ଼ିଆ", code: "or-IN", region: "India" },
  { name: "Punjabi", native: "ਪੰਜਾਬੀ", code: "pa-IN", region: "India" },
  { name: "Assamese", native: "অসমীয়া", code: "as-IN", region: "India" },
  { name: "Maithili", native: "मैथिली", code: "mai-IN", region: "India" },
  { name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ", code: "sat-IN", region: "India" },
  { name: "Kashmiri", native: "کٲشُر", code: "ks-IN", region: "India" },
  { name: "Nepali", native: "नेपाली", code: "ne-NP", region: "India" },
  { name: "Konkani", native: "कोंकणी", code: "kok-IN", region: "India" },
  { name: "Sindhi", native: "سنڌي", code: "sd-IN", region: "India" },
  { name: "Dogri", native: "डोगरी", code: "doi-IN", region: "India" },
  { name: "Manipuri", native: "মেইতেই", code: "mni-IN", region: "India" },
  { name: "Bodo", native: "बड़ो", code: "brx-IN", region: "India" },
  { name: "Sanskrit", native: "संस्कृतम्", code: "sa-IN", region: "India" },
  // --- International ---
  { name: "Spanish", native: "Español", code: "es-ES", region: "International" },
  { name: "French", native: "Français", code: "fr-FR", region: "International" },
  { name: "German", native: "Deutsch", code: "de-DE", region: "International" },
  { name: "Italian", native: "Italiano", code: "it-IT", region: "International" },
  { name: "Portuguese", native: "Português", code: "pt-PT", region: "International" },
  { name: "Dutch", native: "Nederlands", code: "nl-NL", region: "International" },
  { name: "Russian", native: "Русский", code: "ru-RU", region: "International" },
  { name: "Arabic", native: "العربية", code: "ar-SA", region: "International" },
  { name: "Chinese", native: "中文", code: "zh-CN", region: "International" },
  { name: "Japanese", native: "日本語", code: "ja-JP", region: "International" },
  { name: "Korean", native: "한국어", code: "ko-KR", region: "International" },
  { name: "Vietnamese", native: "Tiếng Việt", code: "vi-VN", region: "International" },
  { name: "Thai", native: "ไทย", code: "th-TH", region: "International" },
  { name: "Indonesian", native: "Bahasa Indonesia", code: "id-ID", region: "International" },
  { name: "Malay", native: "Bahasa Melayu", code: "ms-MY", region: "International" },
  { name: "Turkish", native: "Türkçe", code: "tr-TR", region: "International" },
  { name: "Polish", native: "Polski", code: "pl-PL", region: "International" },
  { name: "Ukrainian", native: "Українська", code: "uk-UA", region: "International" },
  { name: "Greek", native: "Ελληνικά", code: "el-GR", region: "International" },
  { name: "Hebrew", native: "עברית", code: "he-IL", region: "International" },
  { name: "Persian", native: "فارسی", code: "fa-IR", region: "International" },
  { name: "Swahili", native: "Kiswahili", code: "sw-KE", region: "International" },
  { name: "Filipino", native: "Filipino", code: "fil-PH", region: "International" },
  { name: "Burmese", native: "မြန်မာ", code: "my-MM", region: "International" },
  { name: "Sinhala", native: "සිංහල", code: "si-LK", region: "International" },
  { name: "Khmer", native: "ខ្មែរ", code: "km-KH", region: "International" },
];

export function getLanguageCode(name: string): string {
  return LANGUAGES.find(l => l.name === name)?.code || "en-IN";
}

// Pre-seeded (instant) dictionaries. Others are fetched from Gemini and cached.
const staticDicts: Record<string, unknown> = { English: en, Hindi: hi, Telugu: te, Bengali: bn };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
// Bump the version suffix whenever en.json gains/renames keys, or the translation
// engine changes, so stale per-language caches are discarded and re-fetched.
// v3 = translation now served by the local Gemma model instead of the cloud API.
const cacheKey = (lang: string) => `ip-sakti-dict::v3::${lang}`;

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
    if (staticDicts[lang]) { setDict(staticDicts[lang]); return; }

    try {
      const cached = window.localStorage.getItem(cacheKey(lang));
      if (cached) { setDict(JSON.parse(cached)); return; }
    } catch {}

    // Translate the whole dictionary once via the local Gemma model, then cache.
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
