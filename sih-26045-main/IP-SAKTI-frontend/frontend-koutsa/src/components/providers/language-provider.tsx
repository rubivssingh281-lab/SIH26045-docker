"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import en from "@/locales/en.json";
import { translateApi } from "@/lib/api";

export type Language = string;

export interface LanguageOption {
  name: string;    // canonical English name sent to translation API
  native: string;  // label shown in the dropdown
  code: string;    // BCP-47 code for speech synthesis
  bhashiniCode: string;
  region: "Scheduled Languages" | "Additional Indian Languages" | "International";
}

// Full multilingual coverage: English + 22 Scheduled Languages + 16 Additional Indian Languages
export const LANGUAGES: LanguageOption[] = [
  // International
  { name: "English", native: "English", code: "en-IN", bhashiniCode: "en", region: "International" },

  // 22 Scheduled Languages of India
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
  t: (key: string) => string;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
// Bump the version suffix whenever languages or translation dictionary changes
// v5 = expanded to 38 Indian languages + Hinglish + English.
const cacheKey = (lang: string) => `ip-sakti-dict::v5::${lang}`;

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
