from __future__ import annotations
import logging
import os
from typing import Any, Dict

import httpx

from app.config import settings

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Unified LLM wrapper. Defaults to the local Ollama runtime (gemma4) via its
    native /api/chat endpoint, which — unlike Ollama's OpenAI-compatible /v1
    shim — honors `options.num_ctx`. That matters because gemma4 defaults to a
    128k context whose KV cache will not fit in modest RAM; we cap it via
    settings.llm_num_ctx.

    Set LLM_PROVIDER=openai (with OPENAI_API_KEY) to route through OpenAI instead.
    """

    def __init__(self, model: str | None = None, provider: str | None = None):
        api_key = (os.getenv("OPENAI_API_KEY") or os.getenv("GROQ_API_KEY") or settings.openai_api_key or "").strip()
        base_url = (os.getenv("OPENAI_BASE_URL") or os.getenv("GROQ_BASE_URL") or settings.openai_base_url or "").strip()
        configured_provider = (provider or os.getenv("LLM_PROVIDER") or settings.llm_provider or "").lower()

        # Auto-detect Groq keys (starts with gsk_) or Gemini keys (starts with AIza)
        if api_key.startswith("gsk_"):
            if not base_url:
                base_url = "https://api.groq.com/openai/v1"
            if not configured_provider or configured_provider == "ollama":
                configured_provider = "openai"
        elif api_key.startswith("AIza"):
            if not base_url:
                base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
            if not configured_provider or configured_provider == "ollama":
                configured_provider = "openai"
        elif api_key and (not configured_provider or configured_provider == "ollama"):
            configured_provider = "openai"

        self.provider = configured_provider or "ollama"

        # Model selection: ensure a valid cloud model is used if in openai mode
        selected_model = model or os.getenv("LLM_MODEL") or settings.llm_model
        if self.provider == "openai" and (not selected_model or selected_model in ("gemma4", "gemma4:e4b", "ollama")):
            if "groq.com" in (base_url or "") or api_key.startswith("gsk_"):
                selected_model = "llama-3.3-70b-versatile"
            elif "googleapis.com" in (base_url or "") or api_key.startswith("AIza"):
                selected_model = "gemini-2.0-flash"
            else:
                selected_model = "gpt-4o-mini"

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
                logger.warning("OpenAI provider selected but package or API key is missing; LLM calls will fail.")

    def _generate_ollama(self, prompt: str, system_prompt: str | None, **kwargs: Any) -> Dict[str, Any]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            # Disable "thinking" output. Reasoning-capable models (e.g. gemma4:e4b)
            # otherwise emit every token to a hidden reasoning channel and return an
            # EMPTY `content`; we want the final answer directly. Non-thinking models
            # ignore the flag, and if a model/Ollama build rejects it we retry without.
            "think": False,
            "options": {
                "num_ctx": settings.llm_num_ctx,
                "temperature": kwargs.get("temperature", 0.3),
                "num_predict": kwargs.get("max_tokens", 1000),
            },
        }
        # Force valid JSON output when requested (Ollama constrained decoding).
        # Small models are otherwise unreliable at raw JSON.
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
                # Some models / older Ollama builds reject the `think` field — retry without it.
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
            raise RuntimeError("OpenAI client not initialized. Check API key and dependencies.")
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        extra = {}
        if kwargs.get("format") == "json":
            extra["response_format"] = {"type": "json_object"}
        try:
            response = self._openai.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=kwargs.get("temperature", 0.3),
                max_tokens=kwargs.get("max_tokens", 1000),
                **extra,
            )
        except Exception as exc:
            err_str = str(exc).lower()
            if "model" in err_str and ("not found" in err_str or "does not exist" in err_str or "404" in err_str):
                fallback_model = "openai/gpt-oss-20b"
                logger.warning(f"Model '{self.model}' not found on provider. Retrying with fallback model '{fallback_model}'...")
                response = self._openai.chat.completions.create(
                    model=fallback_model,
                    messages=messages,
                    temperature=kwargs.get("temperature", 0.3),
                    max_tokens=kwargs.get("max_tokens", 1000),
                    **extra,
                )
                self.model = fallback_model
            else:
                raise

        return {
            "model": self.model,
            "provider": "openai",
            "prompt": prompt,
            "content": response.choices[0].message.content,
            "metadata": kwargs,
        }

    def generate(self, prompt: str, system_prompt: str | None = None, **kwargs: Any) -> Dict[str, Any]:
        if self.provider == "openai":
            return self._generate_openai(prompt, system_prompt, **kwargs)
        return self._generate_ollama(prompt, system_prompt, **kwargs)


def call_llm(prompt: str, system_prompt: str | None = None, **kwargs: Any) -> Dict[str, Any]:
    model = kwargs.pop("model", None)
    return LLMClient(model=model).generate(prompt=prompt, system_prompt=system_prompt, **kwargs)
