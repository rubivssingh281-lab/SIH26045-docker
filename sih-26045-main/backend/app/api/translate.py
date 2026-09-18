"""
Translation endpoints — text, UI dictionary and audio are all translated by the
Gemini cloud model (see gemini_translator). The local Gemma model is reserved for
the core answer-generation pipeline, not translation.
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


class TranslateResponse(BaseModel):
    translated: str
    target_language: str


def _translator():
    """Lazy import so the app still runs if the translation deps/key are absent."""
    try:
        from app.translation.gemini_translator import get_translator, GeminiTranslationError
        return get_translator(), GeminiTranslationError
    except Exception as exc:  # missing package or API key
        raise HTTPException(503, f"Translation service unavailable: {exc}")


@router.post("", response_model=TranslateResponse)
@router.post("/", response_model=TranslateResponse)
def translate_text(payload: TranslateRequest):
    # Nothing to do for empty text or English target — return as-is.
    if not payload.text.strip() or payload.target_language.strip().lower() in ("english", "en"):
        return {"translated": payload.text, "target_language": payload.target_language}
    translator, TranslationError = _translator()
    try:
        out = translator.translate_text(payload.text, payload.target_language)
        return {"translated": out, "target_language": payload.target_language}
    except TranslationError as exc:
        raise HTTPException(502, str(exc))


class DictionaryRequest(BaseModel):
    dictionary: dict = Field(..., description="Nested dict of English UI strings")
    target_language: str


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

    translator, TranslationError = _translator()
    try:
        translated = translator.translate_batch(values, payload.target_language)
    except TranslationError as exc:
        raise HTTPException(502, str(exc))

    import copy
    out = copy.deepcopy(payload.dictionary)
    for path, tv in zip(paths, translated):
        node = out
        for k in path[:-1]:
            node = node[k]
        node[path[-1]] = tv
    return {"dictionary": out, "target_language": payload.target_language}


@router.post("/audio", response_model=TranslateResponse)
async def translate_audio(target_language: str = Form(...), file: UploadFile = File(...)):
    translator, TranslationError = _translator()
    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        out = translator.translate_audio(tmp_path, target_language)
        return {"translated": out, "target_language": target_language}
    except TranslationError as exc:
        raise HTTPException(502, str(exc))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
