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
    Unified LLM wrapper. Defaults to the local Ollama runtime (phi3) via its
    native /api/chat endpoint, which — unlike Ollama's OpenAI-compatible /v1
    shim — honors `options.num_ctx`. That matters because phi3 defaults to a
    128k context whose KV cache will not fit in modest RAM; we cap it via
    settings.llm_num_ctx.

    Set LLM_PROVIDER=openai (with OPENAI_API_KEY) to route through OpenAI instead.
    """

    def __init__(self, model: str | None = None, provider: str | None = None):
        self.provider = (provider or settings.llm_provider or "ollama").lower()
        self.model = model or settings.llm_model
        # Legacy callers may pass model="phi3" to force local; treat that as ollama.
        if model == "phi3":
            self.provider = "ollama"
        self.ollama_base = settings.ollama_base_url.rstrip("/")
        if self.ollama_base.endswith("/v1"):
            self.ollama_base = self.ollama_base[:-3]

        self._openai = None
        if self.provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
            if OpenAI and api_key:
                self._openai = OpenAI(api_key=api_key)
            else:
                logger.warning("OpenAI provider selected but package/API key missing; LLM calls will fail.")

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
        response = self._openai.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=kwargs.get("temperature", 0.3),
            max_tokens=kwargs.get("max_tokens", 1000),
            **extra,
        )
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
