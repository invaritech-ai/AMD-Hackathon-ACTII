"""Provider-agnostic LLM harness.

Fireworks and every local GPU server (vLLM, Ollama, llama.cpp, TGI) speak the
same OpenAI /v1/chat/completions API, so "provider-agnostic" is just a
configurable base_url + api_key on the OpenAI client we already depend on — no
custom provider interface needed.

A model is named by a ``"provider:model"`` spec, e.g.
``"fireworks:accounts/fireworks/models/llama-v3p1-8b-instruct"`` or
``"local:qwen2.5-3b-instruct"``. Flip a role from cloud to the AMD GPU droplet
by changing one env var — no code change.
"""

from __future__ import annotations

from functools import lru_cache

from openai import AsyncOpenAI

from claims_recovery.config import settings


def _providers() -> dict[str, tuple[str, str]]:
    return {
        "fireworks": (settings.fireworks_base_url, settings.fireworks_api_key),
        "local": (settings.local_base_url, settings.local_api_key or "EMPTY"),
    }


@lru_cache(maxsize=None)
def _client(provider: str) -> AsyncOpenAI:
    providers = _providers()
    if provider not in providers:
        raise RuntimeError(
            f"Unknown LLM provider '{provider}'. Known: {', '.join(providers)}"
        )
    base_url, api_key = providers[provider]
    if not base_url or not api_key:
        env = "FIREWORKS_" if provider == "fireworks" else "LOCAL_"
        raise RuntimeError(
            f"LLM provider '{provider}' is not configured. "
            f"Set {env}BASE_URL and {env}API_KEY in .env."
        )
    return AsyncOpenAI(base_url=base_url, api_key=api_key, timeout=60.0)


def _resolve(spec: str) -> tuple[str, str]:
    """Split 'provider:model' (model may itself contain ':', e.g. ollama tags)."""
    provider, sep, model = spec.partition(":")
    if not sep or not model:
        raise RuntimeError(f"Model spec '{spec}' must be 'provider:model'.")
    return provider, model


async def complete(
    spec: str,
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.0,
    max_tokens: int = 1024,
    **extra: object,
) -> str:
    """Run a chat completion against the backend named by ``spec``.

    ``extra`` forwards provider params (e.g. ``reasoning_effort="low"``). A model
    that doesn't accept a given param will error — the caller decides how to
    degrade.
    """
    provider, model = _resolve(spec)
    resp = await _client(provider).chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        **extra,
    )
    return resp.choices[0].message.content or ""
