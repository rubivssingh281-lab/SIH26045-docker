"""
gemini_translator.py — Gemini-powered translation pipeline for IP-SAKTI Sahayak.

Domain-accurate (legal + Ayurvedic / AYUSH) translation of TEXT or AUDIO into a
configurable target language, using the google-generativeai SDK with
`gemini-1.5-flash` (which natively processes audio inputs alongside text
instructions).

This module is self-contained and does NOT alter the app's local-phi3 pipeline;
it is an optional cloud translation layer for the multilingual / voice flow.

Setup
-----
    pip install -r requirements-translation.txt
    # then set your key (either export it, or add GEMINI_API_KEY=... to backend/.env)
    #   export GEMINI_API_KEY="your_api_key"

Usage
-----
    from app.translation.gemini_translator import GeminiTranslator, translate

    tr = GeminiTranslator()                                  # reads GEMINI_API_KEY
    tr.translate_text("Section 3(p) bars patents on TK.", "Hindi")
    tr.translate_audio("query.wav", "Tamil")                 # spoken query -> Tamil text
    tr.translate("path/to/note.mp3", "Marathi")              # auto-detects audio vs text

    # module-level convenience (lazy singleton):
    translate("What is a phytopharmaceutical drug?", "Telugu")

Voice features
--------------
`translate_audio` accepts the voice/audio input; the returned translated string
can be handed straight to the app's text-to-speech (read-aloud) feature to
produce spoken output in the target language — completing voice-in / voice-out.
"""
from __future__ import annotations

import os
import time
import logging
from pathlib import Path
from typing import Optional, Union

# Load backend/.env so GEMINI_API_KEY set there is available (python-dotenv is
# already a project dependency). Safe no-op if the package or file is missing.
try:  # pragma: no cover - environment convenience
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

try:
    import google.generativeai as genai
except ImportError as exc:  # pragma: no cover - dependency guard
    raise ImportError(
        "google-generativeai is required. Install it with:\n"
        "    pip install -r requirements-translation.txt"
    ) from exc

logger = logging.getLogger(__name__)

# Current multimodal Flash model (handles text + audio). `gemini-1.5-flash` has
# been retired on the API. We use the fast, auto-updating `gemini-flash-lite-latest`
# alias: the plain `gemini-flash-latest` alias resolves to a "thinking" model that
# adds 30-50s of latency per call, which is unusable for on-demand UI translation.
# Override with the GEMINI_MODEL env var if you need a pinned name.
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")

# Audio container types Gemini accepts, mapped to their MIME types.
SUPPORTED_AUDIO_TYPES = {
    ".wav": "audio/wav",
    ".mp3": "audio/mp3",
    ".aiff": "audio/aiff",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".webm": "audio/webm",
}

# Strict domain system prompt: the model is a legal/medical translator that must
# preserve statutory meaning and technical terminology, and return ONLY the text.
SYSTEM_PROMPT = """You are a certified legal and medical translator specialising in Indian intellectual-property law and Ayurveda / traditional-medicine (AYUSH). You translate content used in patent, Geographical Indication (GI), Access-and-Benefit-Sharing (ABS) and Traditional Knowledge Digital Library (TKDL) contexts.

Translate the user's content into the requested TARGET LANGUAGE with absolute fidelity of meaning.

STRICT RULES:
1. Preserve exact statutory and technical meaning. Never paraphrase, reinterpret, soften or expand the legal effect of any statement.
2. Keep legal citations, statute names, section numbers and codes EXACTLY as written, in their original Latin script — for example: "Section 3(p)", "Section 3(d)", "Patents Act, 1970", "Biological Diversity Act, 2002", "GI", "TKDL", "TKRC", "IPC", "ABS", "WIPO", "Rule 24". Do NOT translate, transliterate, expand or localise these tokens.
3. Keep specialised terminology accurate. For terms that have no faithful, unambiguous equivalent in the target language — such as "phytopharmaceutical", "classical medicine", "prior art", "novelty", "non-obviousness", "formulation", "access-and-benefit-sharing", "prior informed consent" — render the meaning in the target language AND keep the exact English term in parentheses so the statutory/technical meaning is never lost.
4. Preserve all numbers, dates, dosages, percentages, botanical/Latin names (e.g. "Withania somnifera"), brand names, proper nouns, URLs and identifiers unchanged.
5. Preserve the original formatting: line breaks, bullet points, numbering and paragraph structure.
6. Translate EVERY word of the substantive content — do not omit or abbreviate anything.
7. Do not add, remove, summarise, comment on or explain anything.
8. Output ONLY the translated text. No preamble, no closing remarks, no notes, no surrounding quotation marks, and never phrases like "Here is the translation".

Write the output in the native script of the target language."""


class GeminiTranslationError(Exception):
    """Raised for any recoverable translation failure (config, input, or API)."""


class GeminiTranslator:
    """Domain-accurate text/audio translator backed by Gemini."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = MODEL_NAME,
        max_retries: int = 3,
        temperature: float = 0.1,
    ):
        key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not key:
            raise GeminiTranslationError(
                "No API key found. Set the GEMINI_API_KEY environment variable "
                "(or add it to backend/.env), or pass api_key=... explicitly."
            )
        genai.configure(api_key=key)
        self._model = genai.GenerativeModel(model_name, system_instruction=SYSTEM_PROMPT)
        self.max_retries = max(1, max_retries)
        self._generation_config = {"temperature": temperature}

    # ---- public API -------------------------------------------------------

    def translate(self, source: Union[str, Path], target_language: str) -> str:
        """
        Translate `source` into `target_language`.

        `source` may be a text string OR a path to a supported audio file — audio
        is auto-detected when `source` points to an existing file with a
        supported audio extension; otherwise it is treated as text.
        """
        self._require_language(target_language)
        try:
            candidate = Path(str(source))
            if candidate.suffix.lower() in SUPPORTED_AUDIO_TYPES and candidate.is_file():
                return self.translate_audio(candidate, target_language)
        except (OSError, ValueError):
            pass  # not a path — fall through to text
        return self.translate_text(str(source), target_language)

    def translate_text(self, text: str, target_language: str) -> str:
        """Translate a plain-text string into the target language."""
        self._require_language(target_language)
        if not text or not text.strip():
            return ""
        prompt = (
            f"TARGET LANGUAGE: {target_language}\n"
            f"Translate the following content into {target_language}, applying every rule above.\n\n"
            f"----- BEGIN CONTENT -----\n{text}\n----- END CONTENT -----"
        )
        return self._generate([prompt])

    def translate_batch(self, texts: list, target_language: str) -> list:
        """
        Translate a list of short UI strings in ONE call. Returns a list of the
        same length/order; on any failure returns the originals (safe fallback).
        Used to translate the whole interface dictionary per language.
        """
        import json
        self._require_language(target_language)
        items = [("" if t is None else str(t)) for t in texts]
        if not items:
            return []
        instruction = (
            f"TARGET LANGUAGE: {target_language}\n"
            f"You are given a JSON array of user-interface strings. Translate EACH element into "
            f"{target_language}, applying all the rules above (keep legal tokens like 'Section 3(p)', "
            f"'TKDL', 'GI', 'ABS' unchanged; keep technical terms accurate; keep placeholders like "
            f"'{{q}}' unchanged). Return ONLY a JSON array of strings with the SAME length and order "
            f"as the input — no object, no keys, no commentary.\n\n"
            f"{json.dumps(items, ensure_ascii=False)}"
        )
        try:
            resp = self._model.generate_content(
                instruction,
                generation_config={"temperature": 0.1, "response_mime_type": "application/json"},
            )
            text = (getattr(resp, "text", "") or "").strip()
            arr = json.loads(text)
            if isinstance(arr, list) and len(arr) == len(items):
                return [str(x) for x in arr]
            logger.warning("Batch translate length mismatch (%s vs %s); returning originals.",
                           len(arr) if isinstance(arr, list) else "n/a", len(items))
        except Exception as exc:
            logger.warning("Batch translate failed (%s); returning originals.", exc)
        return items

    def translate_audio(self, audio_path: Union[str, Path], target_language: str) -> str:
        """
        Transcribe spoken audio and translate it into the target language.

        Supports the voice-input feature: pass the recorded/uploaded audio file
        and receive clean translated text (which can then be read aloud by the
        app's text-to-speech feature).
        """
        self._require_language(target_language)
        path = Path(audio_path)
        if not path.is_file():
            raise GeminiTranslationError(f"Audio file not found: {path}")
        mime_type = SUPPORTED_AUDIO_TYPES.get(path.suffix.lower())
        if not mime_type:
            raise GeminiTranslationError(
                f"Unsupported audio type '{path.suffix or '(none)'}'. "
                f"Supported: {', '.join(sorted(SUPPORTED_AUDIO_TYPES))}"
            )

        uploaded = None
        try:
            uploaded = genai.upload_file(path=str(path), mime_type=mime_type)
            instruction = (
                f"TARGET LANGUAGE: {target_language}\n"
                f"The attached file contains spoken audio. Transcribe the speech and translate it into "
                f"{target_language}, applying every rule above. Output only the translated text."
            )
            return self._generate([instruction, uploaded])
        except GeminiTranslationError:
            raise
        except Exception as exc:
            raise GeminiTranslationError(f"Failed to process audio '{path.name}': {exc}") from exc
        finally:
            # Best-effort cleanup of the uploaded file on Gemini's side.
            if uploaded is not None:
                try:
                    genai.delete_file(uploaded.name)
                except Exception:  # pragma: no cover - cleanup is non-critical
                    logger.debug("Could not delete uploaded Gemini file %s", getattr(uploaded, "name", "?"))

    # ---- internals --------------------------------------------------------

    @staticmethod
    def _require_language(target_language: str) -> None:
        if not target_language or not str(target_language).strip():
            raise GeminiTranslationError("target_language is required (e.g. 'Hindi', 'Tamil', 'Marathi').")

    def _generate(self, parts: list) -> str:
        """Call Gemini with retry/backoff for rate limits and transient errors."""
        last_error: Optional[Exception] = None
        for attempt in range(1, self.max_retries + 1):
            try:
                response = self._model.generate_content(parts, generation_config=self._generation_config)
                text = (getattr(response, "text", "") or "").strip()
                if not text:
                    # Surface a safety/other block reason if present.
                    reason = getattr(getattr(response, "prompt_feedback", None), "block_reason", None)
                    raise GeminiTranslationError(
                        f"Gemini returned an empty response{f' (blocked: {reason})' if reason else ''}."
                    )
                return _strip_filler(text)
            except GeminiTranslationError:
                raise
            except Exception as exc:  # google API / network errors
                last_error = exc
                if self._is_transient(exc) and attempt < self.max_retries:
                    wait = 2 ** attempt
                    logger.warning(
                        "Gemini transient error (attempt %d/%d): %s — retrying in %ss",
                        attempt, self.max_retries, exc, wait,
                    )
                    time.sleep(wait)
                    continue
                break
        raise GeminiTranslationError(f"Gemini translation failed: {last_error}") from last_error

    @staticmethod
    def _is_transient(exc: Exception) -> bool:
        name = type(exc).__name__.lower()
        text = str(exc).lower()
        markers = ("resourceexhausted", "toomanyrequests", "serviceunavailable",
                   "deadlineexceeded", "internalservererror", "internal")
        codes = ("429", "500", "503", "504", "rate limit", "quota")
        return any(m in name for m in markers) or any(c in text for c in codes)


def _strip_filler(text: str) -> str:
    """Remove any stray conversational preamble or wrapping quotes, just in case."""
    cleaned = text.strip().strip("`").strip()
    lowered = cleaned.lower()
    for lead in ("here is the translation", "translation:", "translated text:", "sure,", "here's the translation"):
        if lowered.startswith(lead):
            cleaned = cleaned[len(lead):].lstrip(":").strip()
            lowered = cleaned.lower()
    if len(cleaned) >= 2 and cleaned[0] in "\"'“" and cleaned[-1] in "\"'”":
        cleaned = cleaned[1:-1].strip()
    return cleaned


# ---- module-level convenience (lazy singleton) ----------------------------

_default_translator: Optional[GeminiTranslator] = None


def get_translator() -> GeminiTranslator:
    global _default_translator
    if _default_translator is None:
        _default_translator = GeminiTranslator()
    return _default_translator


def translate(source: Union[str, Path], target_language: str) -> str:
    """Convenience wrapper using a shared translator instance."""
    return get_translator().translate(source, target_language)


if __name__ == "__main__":  # simple manual smoke test / CLI
    import argparse

    parser = argparse.ArgumentParser(description="Translate text or an audio file with Gemini.")
    parser.add_argument("source", help="Text to translate, or a path to an audio file.")
    parser.add_argument("target_language", help="Target language, e.g. Hindi / Tamil / Marathi.")
    args = parser.parse_args()
    try:
        print(translate(args.source, args.target_language))
    except GeminiTranslationError as e:
        raise SystemExit(f"Translation error: {e}")
