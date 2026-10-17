"use client";

import { Volume2, Square, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useLanguage, getLanguageCode } from "@/components/providers/language-provider";
import { translateApi } from "@/lib/api";

interface TextToSpeechProps {
  text: string;
  className?: string;
}

function pickVoice(langCode: string): SpeechSynthesisVoice | null {
  try {
    const voices = window.speechSynthesis.getVoices() || [];
    const prefix = langCode.split("-")[0].toLowerCase();
    return (
      voices.find(v => v.lang?.toLowerCase() === langCode.toLowerCase()) ||
      voices.find(v => v.lang?.toLowerCase().startsWith(prefix)) ||
      null
    );
  } catch {
    return null;
  }
}

export function TextToSpeech({ text, className }: TextToSpeechProps) {
  const { language, t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, []);

  const speak = (content: string) => {
    if (!content) { setIsPlaying(false); return; }
    const langCode = getLanguageCode(language);
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = langCode;
    const voice = pickVoice(langCode);
    if (voice) utterance.voice = voice;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = (e) => { console.error("Speech synthesis error", (e as SpeechSynthesisErrorEvent).error); setIsPlaying(false); };
    utteranceRef.current = utterance;
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = async () => {
    if (isPlaying || isLoading) {
      try { window.speechSynthesis.cancel(); } catch {}
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }
    if (!window.speechSynthesis) {
      console.warn("Speech Synthesis not supported in this browser.");
      return;
    }
    try { window.speechSynthesis.cancel(); } catch {}

    // English: speak directly. Other languages: translate first, then speak.
    if (language === "English") {
      setTimeout(() => speak(text), 50);
      return;
    }
    setIsLoading(true);
    let spoken = text;
    try {
      spoken = await translateApi.text(text, language);
    } catch {
      spoken = text;
    } finally {
      setIsLoading(false);
    }
    setTimeout(() => speak(spoken), 50);
  };

  return (
    <button
      type="button"
      onClick={toggleSpeech}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white transition-colors hover:bg-slate-50 focus:outline-none shrink-0",
        (isPlaying || isLoading) && "bg-slate-100 border-navy text-navy",
        className
      )}
      title={isPlaying ? t("tts.stop_reading", "Stop reading") : isLoading ? t("tts.preparing_audio", "Preparing audio…") : t("tts.read_aloud", "Read aloud")}
    >
      {isLoading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isPlaying ? (
        <Square size={14} className="fill-current" />
      ) : (
        <Volume2 size={14} />
      )}
      <span className="sr-only">{isPlaying ? t("tts.stop_reading", "Stop reading") : t("tts.read_aloud", "Read aloud")}</span>
    </button>
  );
}
