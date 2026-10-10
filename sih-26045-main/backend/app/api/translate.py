"""
Translation endpoints backed exclusively by the Bhashini API. The local LLM is
reserved for the core answer-generation pipeline, not translation.
"""
import os
import tempfile
import logging

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/translate", tags=["Translation"])


class TranslateRequest(BaseModel):
    text: str = Field(..., description="Text to translate")
    target_language: str = Field(..., description="Target language, e.g. Hindi / Tamil / Marathi")
    source_language: str | None = Field(None, description="Source language; defaults to configured Bhashini source")


class TranslateResponse(BaseModel):
    translated: str
    target_language: str


def _translate_with_llm(text: str, target_language: str, source_language: str | None = None) -> str:
    from app.llm.client import call_llm
    is_hinglish = target_language.strip().lower() == "hinglish"
    if is_hinglish:
        system_prompt = (
            "You are a translator for an Indian Intellectual Property and Ayurvedic research application. "
            "Translate accurately into natural Hinglish (conversational Hindi written in English/Latin script). "
            "Return ONLY the direct translation."
        )
    else:
        system_prompt = (
            f"You are a professional translator for an Indian Intellectual Property and Ayurvedic research application. "
            f"Translate accurately to {target_language} using its standard script and grammar. "
            "Return ONLY the direct translation."
        )
    prompt = (
        f"Translate the following text from {source_language or 'English'} to {target_language}.\n"
        f"Return ONLY the direct translation without explanation, preamble, or quotes:\n\n{text}"
    )
    res = call_llm(prompt=prompt, system_prompt=system_prompt, temperature=0.1, max_tokens=1000)
    out = (res.get("content") or "").strip()
    return out or text


def _translate_batch_with_llm(texts: list[str], target_language: str, source_language: str | None = None) -> list[str]:
    from app.llm.client import call_llm
    results: list[str] = []
    BATCH_SIZE = 25
    is_hinglish = target_language.strip().lower() == "hinglish"

    for i in range(0, len(texts), BATCH_SIZE):
        chunk = texts[i:i + BATCH_SIZE]
        if is_hinglish:
            system_prompt = (
                "You are a professional translator for an Indian Ayurvedic IP system. "
                "Translate into conversational Hinglish (Hindi written in the English/Latin alphabet). "
                f"Output exactly {len(chunk)} lines with no extra text, notes, or numbering."
            )
        else:
            system_prompt = (
                f"You are a professional translator for an Indian Ayurvedic IP system. "
                f"Translate accurately to {target_language}. "
                f"Output exactly {len(chunk)} lines with no extra text, notes, or numbering."
            )
        prompt = (
            f"Translate each of the following UI strings from {source_language or 'English'} to {target_language}.\n"
            f"Preserve the exact line count ({len(chunk)} lines). Output ONLY the translated strings, one per line, nothing else:\n\n"
            + "\n".join(chunk)
        )
        try:
            res = call_llm(prompt=prompt, system_prompt=system_prompt, temperature=0.1, max_tokens=1500)
            lines = [l.strip() for l in (res.get("content") or "").strip().split("\n") if l.strip()]
            if len(lines) == len(chunk):
                results.extend(lines)
            else:
                for idx, item in enumerate(chunk):
                    results.append(lines[idx] if idx < len(lines) else item)
        except Exception as exc:
            logger.warning(f"Batch {i} LLM translation failed: {exc}. Using original strings.")
            results.extend(chunk)
    return results


@router.post("", response_model=TranslateResponse)
@router.post("/", response_model=TranslateResponse)
def translate_text(payload: TranslateRequest):
    # Nothing to do for empty text or English target — return as-is.
    if not payload.text.strip() or payload.target_language.strip().lower() in ("english", "en"):
        return {"translated": payload.text, "target_language": payload.target_language}

    # 1. Try Bhashini if configured
    try:
        from app.translation.bhashini_translator import is_configured, get_translator
        if is_configured():
            out = get_translator().translate_text(payload.text, payload.target_language, payload.source_language)
            return {"translated": out, "target_language": payload.target_language}
    except Exception as exc:
        logger.warning(f"Bhashini translation failed: {exc}. Trying LLM fallback...")

    # 2. Try LLM translation
    try:
        out = _translate_with_llm(payload.text, payload.target_language, payload.source_language)
        return {"translated": out, "target_language": payload.target_language}
    except Exception as exc:
        logger.error(f"LLM translation failed: {exc}. Returning original text.")
        return {"translated": payload.text, "target_language": payload.target_language}


class DictionaryRequest(BaseModel):
    dictionary: dict = Field(..., description="Nested dict of English UI strings")
    target_language: str
    source_language: str | None = None


@router.post("/dictionary")
def translate_dictionary(payload: DictionaryRequest):
    """Translate every string value in a (possibly nested) UI dictionary in one batch."""
    if payload.target_language.strip().lower() in ("english", "en"):
        return {"dictionary": payload.dictionary, "target_language": payload.target_language}

    # Flatten string leaves, remembering their paths.
    paths: list = []
    values: list = []

    def walk(obj, prefix):
        if isinstance(obj, dict):
            for k, v in obj.items():
                walk(v, prefix + [k])
        elif isinstance(obj, str):
            paths.append(prefix)
            values.append(obj)

    walk(payload.dictionary, [])
    if not values:
        return {"dictionary": payload.dictionary, "target_language": payload.target_language}

    translated = None
    # 1. Try Bhashini if configured
    try:
        from app.translation.bhashini_translator import is_configured, get_translator
        if is_configured():
            translated = get_translator().translate_batch(values, payload.target_language, payload.source_language)
    except Exception as exc:
        logger.warning(f"Bhashini batch translation failed: {exc}. Falling back to LLM...")

    # 2. If Bhashini is not configured or failed, use LLM
    if translated is None or len(translated) != len(values):
        try:
            translated = _translate_batch_with_llm(values, payload.target_language, payload.source_language)
        except Exception as exc:
            logger.error(f"LLM batch translation failed: {exc}. Keeping original English dictionary.")
            return {"dictionary": payload.dictionary, "target_language": payload.target_language}

    import copy
    out = copy.deepcopy(payload.dictionary)
    for path, tv in zip(paths, translated):
        node = out
        for k in path[:-1]:
            node = node[k]
        node[path[-1]] = tv
    return {"dictionary": out, "target_language": payload.target_language}


@router.post("/audio", response_model=TranslateResponse)
async def translate_audio(target_language: str = Form(...), source_language: str | None = Form(None), file: UploadFile = File(...)):
    try:
        from app.translation.bhashini_translator import get_translator, BhashiniTranslationError
        translator = get_translator()
    except Exception as exc:
        raise HTTPException(503, f"Translation service unavailable: {exc}")

    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        out = translator.translate_audio(tmp_path, target_language, source_language)
        return {"translated": out, "target_language": target_language}
    except BhashiniTranslationError as exc:
        raise HTTPException(502, str(exc))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
