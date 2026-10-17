"""Bhashini-backed translation for text, UI dictionaries, and audio."""
from __future__ import annotations

import base64
import re
import time
from pathlib import Path
from typing import Any, Optional, Union

import httpx

from app.config import settings


SUPPORTED_AUDIO_TYPES = {
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".aiff": "audio/aiff",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".webm": "audio/webm",
}

LANGUAGE_CODES = {
    # 22 Scheduled Languages of India
    "english": "en", "en": "en", "hindi": "hi", "hi": "hi",
    "bengali": "bn", "bangla": "bn", "bn": "bn", "telugu": "te", "te": "te",
    "tamil": "ta", "ta": "ta", "marathi": "mr", "mr": "mr", "gujarati": "gu", "gu": "gu",
    "kannada": "kn", "kn": "kn", "malayalam": "ml", "ml": "ml", "odia": "or", "oriya": "or", "or": "or",
    "punjabi": "pa", "pa": "pa", "assamese": "as", "as": "as", "urdu": "ur", "ur": "ur",
    "sanskrit": "sa", "sa": "sa", "nepali": "ne", "ne": "ne", "konkani": "gom", "kok": "gom", "gom": "gom",
    "sindhi": "sd", "sd": "sd", "dogri": "doi", "doi": "doi", "maithili": "mai", "mai": "mai",
    "santali": "sat", "sat": "sat", "kashmiri": "ks", "ks": "ks", "manipuri": "mni", "mni": "mni",
    "bodo": "brx", "brx": "brx",
    # Additional Indian Languages
    "awadhi": "awa", "awa": "awa",
    "bhojpuri": "bho", "bho": "bho",
    "braj": "bra", "bra": "bra",
    "chhattisgarhi": "hne", "hne": "hne",
    "gondi": "gon", "gon": "gon",
    "ho": "hoc", "hoc": "hoc",
    "kangri": "xnr", "xnr": "xnr",
    "magahi": "mag", "mag": "mag",
    "mizo": "lus", "lus": "lus",
    "sinhala": "si", "si": "si",
    "tulu": "tcy", "tcy": "tcy",
    "bhili": "bhb", "bhb": "bhb",
    "haryanvi": "bgc", "bgc": "bgc",
    "rajasthani": "raj", "raj": "raj",
    "khasi": "kha", "kha": "kha",
    "hinglish": "hinglish",
}


class BhashiniTranslationError(Exception):
    """Raised for configuration, validation, or Bhashini API failures."""


def language_code(value: str) -> str:
    normalized = str(value or "").strip().lower().replace("_", "-").split("-", 1)[0]
    code = LANGUAGE_CODES.get(normalized)
    if code:
        return code
    if len(normalized) == 2 and normalized.isalpha():
        return normalized
    raise BhashiniTranslationError(f"Unsupported language '{value}'. Use a Bhashini language name or code.")


def is_configured() -> bool:
    direct_configured = bool(
        settings.bhashini_api_key
        and settings.bhashini_inference_url
        and settings.bhashini_translation_service_id
    )
    discovery_configured = bool(settings.bhashini_api_key and settings.bhashini_user_id)
    return direct_configured or discovery_configured


class BhashiniTranslator:
    """Translation client using Bhashini pipeline discovery and inference APIs."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        user_id: Optional[str] = None,
        max_retries: Optional[int] = None,
        timeout: Optional[float] = None,
    ):
        self.api_key = settings.bhashini_api_key if api_key is None else api_key
        self.user_id = settings.bhashini_user_id if user_id is None else user_id
        self.pipeline_id = settings.bhashini_pipeline_id
        self.pipeline_url = settings.bhashini_pipeline_url
        self.inference_url = settings.bhashini_inference_url
        self.inference_auth_token = settings.bhashini_inference_auth_token
        self.inference_auth_header = settings.bhashini_inference_auth_header
        self.translation_service_id = settings.bhashini_translation_service_id
        self.asr_service_id = settings.bhashini_asr_service_id
        self.max_retries = max(1, max_retries if max_retries is not None else settings.bhashini_max_retries)
        self.timeout = timeout if timeout is not None else settings.bhashini_timeout
        self.batch_size = max(1, settings.bhashini_batch_size)
        self._discovered_auth_token: Optional[str] = None
        self._discovered_service_id: Optional[str] = None
        self._discovered_asr_service_id: Optional[str] = None

    def translate(self, source: Union[str, Path], target_language: str, source_language: Optional[str] = None) -> str:
        self._require_configured()
        candidate = Path(str(source))
        if candidate.suffix.lower() in SUPPORTED_AUDIO_TYPES and candidate.is_file():
            return self.translate_audio(candidate, target_language, source_language)
        return self.translate_text(str(source), target_language, source_language)

    def translate_text(self, text: str, target_language: str, source_language: Optional[str] = None) -> str:
        self._require_configured()
        if not text or not text.strip():
            return ""
        return self.translate_batch([text], target_language, source_language)[0]

    def translate_batch(self, texts: list, target_language: str, source_language: Optional[str] = None) -> list:
        self._require_configured()
        source = language_code(source_language or settings.bhashini_source_language)
        target = language_code(target_language)
        items = ["" if value is None else str(value) for value in texts]
        if not items or source == target:
            return items
        translated: list[str] = []
        for start in range(0, len(items), self.batch_size):
            translated.extend(self._infer_text(items[start:start + self.batch_size], source, target))
        return translated

    def translate_audio(
        self,
        audio_path: Union[str, Path],
        target_language: str,
        source_language: Optional[str] = None,
    ) -> str:
        self._require_configured()
        path = Path(audio_path)
        if not path.is_file():
            raise BhashiniTranslationError(f"Audio file not found: {path}")
        mime_type = SUPPORTED_AUDIO_TYPES.get(path.suffix.lower())
        if not mime_type:
            raise BhashiniTranslationError(
                f"Unsupported audio type '{path.suffix or '(none)'}'. "
                f"Supported: {', '.join(sorted(SUPPORTED_AUDIO_TYPES))}"
            )
        source = language_code(source_language or settings.bhashini_source_language)
        target = language_code(target_language)
        if source == target:
            raise BhashiniTranslationError("Audio translation requires different source and target languages.")
        return self._infer_audio(path, mime_type, source, target).strip()

    def _infer_text(self, texts: list[str], source: str, target: str) -> list[str]:
        service_id = self._ensure_pipeline(source, target)
        body = {
            "pipelineTasks": [{
                "taskType": "translation",
                "config": {
                    "language": {"sourceLanguage": source, "targetLanguage": target},
                    "serviceId": service_id,
                },
            }],
            "inputData": {"input": [{"source": text} for text in texts]},
        }
        outputs = _extract_outputs(self._request(body))
        if len(outputs) != len(texts):
            raise BhashiniTranslationError(
                f"Bhashini returned {len(outputs)} translations for {len(texts)} inputs."
            )
        return outputs

    def _infer_audio(self, path: Path, mime_type: str, source: str, target: str) -> str:
        self._ensure_pipeline(source, target, audio=True)
        body = {
            "pipelineTasks": [{
                "taskType": "asr",
                "config": {
                    "language": {"sourceLanguage": source},
                    "serviceId": self._discovered_asr_service_id or self.asr_service_id,
                    "audioFormat": mime_type,
                },
            }, {
                "taskType": "translation",
                "config": {
                    "language": {"sourceLanguage": source, "targetLanguage": target},
                    "serviceId": self._discovered_service_id or self.translation_service_id,
                },
            }],
            "inputData": {"audio": [{"audioContent": base64.b64encode(path.read_bytes()).decode("ascii")}]},
        }
        outputs = _extract_outputs(self._request(body))
        if not outputs:
            raise BhashiniTranslationError("Bhashini returned no translated audio output.")
        return outputs[-1]

    def _ensure_pipeline(self, source: str, target: str, audio: bool = False) -> str:
        if self.inference_url and (self.translation_service_id or self._discovered_service_id):
            return self.translation_service_id or self._discovered_service_id or ""
        if not self.pipeline_url:
            raise BhashiniTranslationError("Set BHASHINI_PIPELINE_URL or BHASHINI_INFERENCE_URL.")
        if not self.api_key:
            raise BhashiniTranslationError("Set BHASHINI_API_KEY.")
        if not self.user_id:
            raise BhashiniTranslationError(
                "BHASHINI_USER_ID is required for pipeline discovery. "
                "Set BHASHINI_INFERENCE_URL and BHASHINI_TRANSLATION_SERVICE_ID for direct inference."
            )

        headers = {"Content-Type": "application/json", "userID": self.user_id, "ulcaApiKey": self.api_key}
        tasks = [{
            "taskType": "translation",
            "config": {"language": {"sourceLanguage": source, "targetLanguage": target}},
        }]
        if audio:
            tasks.insert(0, {"taskType": "asr", "config": {"language": {"sourceLanguage": source}}})
        body: dict[str, Any] = {"pipelineTasks": tasks}
        if self.pipeline_id:
            body["pipelineRequestConfig"] = {"pipelineId": self.pipeline_id}
        response = self._request_raw(self.pipeline_url, headers, body)
        endpoint = _find_value(response, "callbackUrl") or _find_value(response, "inferenceApiEndpoint")
        if endpoint and not self.inference_url:
            self.inference_url = endpoint
        self._discovered_auth_token = _find_auth_token(response) or self._discovered_auth_token
        configs = _find_task_configs(response)
        self._discovered_service_id = self.translation_service_id or _find_service_id(configs, "translation")
        self._discovered_asr_service_id = self.asr_service_id or _find_service_id(configs, "asr")
        if not self.inference_url:
            raise BhashiniTranslationError("Bhashini discovery did not return an inference endpoint.")
        if audio and not self._discovered_asr_service_id:
            raise BhashiniTranslationError("Bhashini discovery did not return an ASR service.")
        if not self._discovered_service_id:
            raise BhashiniTranslationError("Bhashini discovery did not return a translation service.")
        return self._discovered_service_id

    def _request(self, body: dict) -> dict:
        headers = {"Content-Type": "application/json"}
        token = self.inference_auth_token or self._discovered_auth_token
        if token:
            headers[self.inference_auth_header] = token
        if self.user_id:
            headers.setdefault("userID", self.user_id)
        if self.api_key:
            headers.setdefault("ulcaApiKey", self.api_key)
        return self._request_raw(self.inference_url or "", headers, body)

    def _request_raw(self, url: str, headers: dict, body: dict) -> dict:
        if not url:
            raise BhashiniTranslationError("Bhashini inference endpoint is not configured.")
        last_error: Optional[Exception] = None
        for attempt in range(self.max_retries):
            try:
                response = httpx.post(url, headers=headers, json=body, timeout=self.timeout)
                response.raise_for_status()
                data = response.json()
                if not isinstance(data, dict):
                    raise BhashiniTranslationError("Bhashini returned a non-object response.")
                return data
            except BhashiniTranslationError:
                raise
            except (httpx.HTTPError, ValueError) as exc:
                last_error = exc
                if attempt + 1 < self.max_retries and _is_transient(exc):
                    time.sleep(2 ** attempt)
                    continue
                detail = getattr(getattr(exc, "response", None), "text", str(exc))
                raise BhashiniTranslationError(f"Bhashini request failed: {detail}") from exc
        raise BhashiniTranslationError(f"Bhashini request failed: {last_error}") from last_error

    def _require_configured(self) -> None:
        if not self.api_key:
            raise BhashiniTranslationError(
                "Translation service is not configured. Set BHASHINI_API_KEY."
            )


def _clean_translated_text(text: str) -> str:
    if not text:
        return text
    # Strip machine translation artifact tokens
    text = re.sub(r'<unk>|<pad>|<s>|</s>', '', text, flags=re.IGNORECASE)
    # Collapse pathological repeated hyphenated suffixes (e.g. ᱼᱟᱱᱼᱟᱱ or -an-an)
    text = re.sub(r'([ᱼ\-]\S+?)(?:\1){2,}', r'\1', text)
    # Collapse repeated consecutive words (e.g. word word word...)
    text = re.sub(r'(?<!\S)(\S+)(?:\s+\1){2,}(?!\S)', r'\1', text)
    # Collapse repeated consecutive bigrams
    text = re.sub(r'(?<!\S)(\S+\s+\S+)(?:\s+\1){2,}(?!\S)', r'\1', text)
    # Clean excessive whitespace
    text = re.sub(r'[ \t]{2,}', ' ', text).strip()
    return text


def _extract_outputs(response: dict) -> list[str]:
    outputs: list[str] = []
    for task in response.get("pipelineResponse", []) or []:
        for item in task.get("output", []) or []:
            value = item.get("target") or item.get("source") or item.get("translatedText")
            if value is not None:
                outputs.append(_clean_translated_text(str(value)))
    if outputs:
        return outputs
    for key in ("output", "outputs", "translations"):
        values = response.get(key)
        if isinstance(values, list):
            return [_clean_translated_text(str(item.get("target") or item.get("source") or item) if isinstance(item, dict) else str(item)) for item in values]
    return []


def _find_value(value: Any, key: str) -> Optional[str]:
    if isinstance(value, dict):
        if isinstance(value.get(key), str):
            return value[key]
        for child in value.values():
            found = _find_value(child, key)
            if found:
                return found
    elif isinstance(value, list):
        for child in value:
            found = _find_value(child, key)
            if found:
                return found
    return None


def _find_auth_token(value: Any) -> Optional[str]:
    if isinstance(value, dict):
        auth = value.get("inferenceApiKey")
        if isinstance(auth, dict) and auth.get("value"):
            return str(auth["value"])
        for key in ("authToken", "authorization"):
            if value.get(key):
                return str(value[key])
        for child in value.values():
            found = _find_auth_token(child)
            if found:
                return found
    elif isinstance(value, list):
        for child in value:
            found = _find_auth_token(child)
            if found:
                return found
    return None


def _find_task_configs(value: Any) -> list[dict]:
    if isinstance(value, dict):
        for key in ("pipelineResponseConfig", "pipelineTasks"):
            child = value.get(key)
            if isinstance(child, list):
                return [item for item in child if isinstance(item, dict)]
        for child in value.values():
            found = _find_task_configs(child)
            if found:
                return found
    elif isinstance(value, list):
        for child in value:
            found = _find_task_configs(child)
            if found:
                return found
    return []


def _find_service_id(configs: list[dict], task_type: str) -> Optional[str]:
    for item in configs:
        if item.get("taskType") == task_type:
            config = item.get("config")
            candidates = config if isinstance(config, list) else [config]
            for candidate in candidates:
                if isinstance(candidate, dict) and candidate.get("serviceId"):
                    return str(candidate["serviceId"])
    return None


def _is_transient(exc: Exception) -> bool:
    status = getattr(getattr(exc, "response", None), "status_code", None)
    return status in (408, 429, 500, 502, 503, 504) or isinstance(exc, (httpx.TimeoutException, httpx.NetworkError))


_default_translator: Optional[BhashiniTranslator] = None


def get_translator() -> BhashiniTranslator:
    global _default_translator
    if _default_translator is None:
        _default_translator = BhashiniTranslator()
    return _default_translator


def translate(source: Union[str, Path], target_language: str) -> str:
    return get_translator().translate(source, target_language)