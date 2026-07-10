from __future__ import annotations

import json
from typing import Any

import httpx

from claims_recovery.config import settings


class FireworksClient:
    def __init__(self) -> None:
        self._base_url = settings.fireworks_base_url
        self._api_key = settings.fireworks_api_key
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(120.0),
        )

    async def chat(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> str:
        if not self._api_key:
            raise RuntimeError(
                "FIREWORKS_API_KEY not set. Create a .env file with your key."
            )

        payload: dict[str, Any] = {
            "model": model or settings.model_po_matcher,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        response = await self._client.post(
            "/chat/completions",
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def chat_structured(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> dict[str, Any]:
        """Chat and parse response as JSON."""
        text = await self.chat(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            if text.startswith("json"):
                text = text[4:].strip()
        return json.loads(text)

    async def close(self) -> None:
        await self._client.aclose()


_fireworks: FireworksClient | None = None


def get_fireworks() -> FireworksClient:
    global _fireworks
    if _fireworks is None:
        _fireworks = FireworksClient()
    return _fireworks
