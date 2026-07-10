from __future__ import annotations

from openai import AsyncOpenAI
from agents import (
    set_default_openai_client,
    set_default_openai_api,
    set_tracing_disabled,
)

from claims_recovery.config import settings

set_tracing_disabled(True)
set_default_openai_api("chat_completions")

_client: AsyncOpenAI | None = None


def get_fireworks_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        api_key = settings.fireworks_api_key
        if not api_key:
            raise RuntimeError(
                "FIREWORKS_API_KEY is not set. "
                "Copy .env.example to .env and add your Fireworks API key."
            )
        _client = AsyncOpenAI(
            base_url=settings.fireworks_base_url,
            api_key=api_key,
            timeout=120.0,
        )
        set_default_openai_client(_client)
    return _client
