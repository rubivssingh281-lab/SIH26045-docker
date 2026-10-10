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


@router.post("", response_model=TranslateResponse)
@router.post("/", response_model=TranslateResponse)
def translate_text(payload: TranslateRequest):
    """Translate text strictly using Bhashini API."""
    if not payload.text.strip() or payload.target_language.strip().lower() in ("english", "en"):
        return {"translated": payload.text, "target_language": payload.target_language}

    try:
        from app.translation.bhashini_translator import get_translator
        out = get_translator().translate_text(payload.text, payload.target_language, payload.source_language)
        return {"translated": out or payload.text, "target_language": payload.target_language}
    except Exception as exc:
        logger.error(f"Bhashini translation failed: {exc}")
        return {"translated": payload.text, "target_language": payload.target_language}


class DictionaryRequest(BaseModel):
    dictionary: dict = Field(..., description="Nested dict of English UI strings")
    target_language: str
    source_language: str | None = None


@router.post("/dictionary")
def translate_dictionary(payload: DictionaryRequest):
    """Translate every string value in a UI dictionary strictly using Bhashini API."""
    if payload.target_language.strip().lower() in ("english", "en"):
        return {"dictionary": payload.dictionary, "target_language": payload.target_language}

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

    try:
        from app.translation.bhashini_translator import get_translator
        translated = get_translator().translate_batch(values, payload.target_language, payload.source_language)
        if translated and len(translated) == len(values):
            import copy
            out = copy.deepcopy(payload.dictionary)
            for path, tv in zip(paths, translated):
                node = out
                for k in path[:-1]:
                    node = node[k]
                node[path[-1]] = tv
            return {"dictionary": out, "target_language": payload.target_language}
    except Exception as exc:
        logger.error(f"Bhashini batch dictionary translation failed: {exc}")

    return {"dictionary": payload.dictionary, "target_language": payload.target_language}


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
