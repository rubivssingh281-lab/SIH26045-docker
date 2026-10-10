from __future__ import annotations
import logging
import os
import time
from typing import Any, Dict

import httpx

from app.config import settings

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

logger = logging.getLogger(__name__)

# Full verified pool of Google Gemini cloud models for automatic quota rotation
CLOUD_MODEL_POOL = [
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-3-flash-preview",
    "gemini-3.8-flash",
    "gemma-4-31b-it",
    "gemma-4-26b-a4b-it",
]

_exhausted_models: dict[str, float] = {}
_current_active_model: str = "gemini-flash-lite-latest"


def _mark_model_exhausted(model_name: str, cooldown_seconds: float = 1800.0) -> None:
    """Mark a model as exhausted (e.g. 429 quota or 503 overload) for the cooldown period."""
    _exhausted_models[model_name] = time.time() + cooldown_seconds
    logger.warning(
        f"Model '{model_name}' reached quota/rate limit. Marked exhausted for {int(cooldown_seconds)}s."
    )


def _get_active_cloud_model(requested_model: str | None = None) -> str:
    """Return the healthiest available cloud model that is not currently exhausted."""
    now = time.time()

    # Clean up expired cooldowns
    expired = [m for m, expiry in _exhausted_models.items() if expiry <= now]
    for m in expired:
        _exhausted_models.pop(m, None)

    # If caller requested a model and it's healthy, honor it
    if requested_model and (_exhausted_models.get(requested_model, 0) <= now):
        return requested_model

    # If current active model is still healthy, use it immediately
    global _current_active_model
    if _current_active_model and (_exhausted_models.get(_current_active_model, 0) <= now):
        return _current_active_model

    # Pick the next healthy model from the pool
    for candidate in CLOUD_MODEL_POOL:
        if _exhausted_models.get(candidate, 0) <= now:
            _current_active_model = candidate
            return candidate

    # If all models are marked exhausted, return the one with the earliest expiry
    if _exhausted_models:
        return min(_exhausted_models.items(), key=lambda x: x[1])[0]
    return CLOUD_MODEL_POOL[0]


class LLMClient:
    """
    Unified LLM wrapper:
    - Local development: Ollama (gemma4:e4b) via /api/chat.
    - Cloud deployment: Google Gemini (gemini-3.5-flash) via OpenAI-compatible endpoint
      (1,000,000 TPM, 1,500 requests/day, 100% Free, sub-second responses).
    """

    def __init__(self, model: str | None = None, provider: str | None = None):
        api_key = (
            os.getenv("OPENAI_API_KEY")
            or os.getenv("GEMINI_API_KEY")
            or settings.openai_api_key
            or ""
        ).strip()
        base_url = (os.getenv("OPENAI_BASE_URL") or settings.openai_base_url or "").strip()
        configured_provider = (provider or os.getenv("LLM_PROVIDER") or settings.llm_provider or "").lower()

        # Google Gemini is our primary cloud provider (Free, 1M TPM, 1500 RPD)
        is_gemini = api_key.startswith("AIza") or api_key.startswith("AQ.") or "googleapis.com" in (base_url or "")
        self.is_gemini = is_gemini

        if is_gemini or api_key:
            if not base_url or is_gemini:
                base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
            if not configured_provider or configured_provider == "ollama":
                configured_provider = "openai"

        self.provider = configured_provider or "ollama"

        # Model selection: Google Gemini high-speed production model
        selected_model = model or os.getenv("LLM_MODEL") or settings.llm_model
        if self.provider == "openai":
            if not selected_model or selected_model in (
                "gemma4", "gemma4:e4b", "ollama", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-3.5-flash"
            ):
                selected_model = "gemini-flash-lite-latest"

        # Legacy callers passing model="gemma4" when no cloud API key is present
        if model == "gemma4" and not api_key:
            self.provider = "ollama"

        self.model = selected_model

        self.ollama_base = (os.getenv("OLLAMA_BASE_URL") or settings.ollama_base_url or "http://localhost:11434").rstrip("/")
        if self.ollama_base.endswith("/v1"):
            self.ollama_base = self.ollama_base[:-3]

        self._openai = None
        if self.provider == "openai":
            if OpenAI and api_key:
                self._openai = OpenAI(api_key=api_key, base_url=base_url or None)
            else:
                logger.warning("Cloud LLM provider selected but API key is missing; LLM calls will fail.")

    def _generate_ollama(self, prompt: str, system_prompt: str | None, **kwargs: Any) -> Dict[str, Any]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "think": False,
            "options": {
                "num_ctx": settings.llm_num_ctx,
                "temperature": kwargs.get("temperature", 0.3),
                "num_predict": kwargs.get("max_tokens", 1000),
            },
        }
        if kwargs.get("format"):
            payload["format"] = kwargs["format"]

        def _post(body: dict):
            resp = httpx.post(f"{self.ollama_base}/api/chat", json=body, timeout=settings.llm_timeout)
            resp.raise_for_status()
            return resp

        try:
            try:
                response = _post(payload)
            except httpx.HTTPStatusError as exc:
                body_text = (exc.response.text or "").lower() if exc.response is not None else ""
                if exc.response is not None and exc.response.status_code == 400 and "think" in body_text:
                    payload.pop("think", None)
                    response = _post(payload)
                else:
                    raise
        except httpx.HTTPError as exc:
            raise RuntimeError(
                f"Ollama request to {self.ollama_base} failed for model '{self.model}': {exc}. "
                f"Is `ollama serve` running and the model pulled (`ollama pull {self.model}`)?"
            ) from exc

        data = response.json()
        content = (data.get("message") or {}).get("content", "")
        return {
            "model": self.model,
            "provider": "ollama",
            "prompt": prompt,
            "content": content,
            "metadata": kwargs,
        }

    def _generate_openai(self, prompt: str, system_prompt: str | None, **kwargs: Any) -> Dict[str, Any]:
        if not self._openai:
            raise RuntimeError("Cloud LLM client not initialized. Check OPENAI_API_KEY setting.")
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        extra = {}
        if kwargs.get("format") == "json":
            extra["response_format"] = {"type": "json_object"}

        # Immediately select the best healthy non-exhausted model
        active_model = _get_active_cloud_model(self.model)

        # Build candidate priority list starting with the active model
        candidates = [active_model] + [m for m in CLOUD_MODEL_POOL if m != active_model]
        response = None
        last_exc = None
        used_model = active_model

        for target_model in candidates:
            # Skip models still in cooldown unless it's the only remaining option
            if _exhausted_models.get(target_model, 0) > time.time() and target_model != active_model:
                continue

            try:
                response = self._openai.chat.completions.create(
                    model=target_model,
                    messages=messages,
                    temperature=kwargs.get("temperature", 0.3),
                    max_tokens=kwargs.get("max_tokens", 1000),
                    **extra,
                )
                used_model = target_model
                global _current_active_model
                _current_active_model = target_model
                self.model = target_model
                break
            except Exception as exc:
                last_exc = exc
                err_str = str(exc).lower()
                # If quota limit reached (429) or high demand (503): mark exhausted and switch immediately
                if "429" in err_str or "quota" in err_str or "resource_exhausted" in err_str or "503" in err_str:
                    _mark_model_exhausted(target_model, cooldown_seconds=1800.0)
                    logger.warning(
                        f"Model '{target_model}' reached rate/quota limit. Immediately switching to next model in pool..."
                    )
                    continue
                elif "404" in err_str or "not found" in err_str or "does not exist" in err_str:
                    _mark_model_exhausted(target_model, cooldown_seconds=86400.0)
                    logger.warning(
                        f"Model '{target_model}' not found. Immediately switching to next model in pool..."
                    )
                    continue
                else:
                    logger.warning(f"Model '{target_model}' error ({exc}). Trying next candidate in pool...")
                    continue

        if not response:
            raise last_exc or RuntimeError("All available cloud models exhausted.")

        msg = response.choices[0].message
        content = msg.content or getattr(msg, "reasoning", "") or ""
        return {
            "model": used_model,
            "provider": "openai",
            "prompt": prompt,
            "content": content,
            "metadata": kwargs,
        }

    def generate(self, prompt: str, system_prompt: str | None = None, **kwargs: Any) -> Dict[str, Any]:
        if self.provider == "openai":
            return self._generate_openai(prompt, system_prompt, **kwargs)
        return self._generate_ollama(prompt, system_prompt, **kwargs)


def call_llm(prompt: str, system_prompt: str | None = None, **kwargs: Any) -> Dict[str, Any]:
    model = kwargs.pop("model", None)
    return LLMClient(model=model).generate(prompt=prompt, system_prompt=system_prompt, **kwargs)
