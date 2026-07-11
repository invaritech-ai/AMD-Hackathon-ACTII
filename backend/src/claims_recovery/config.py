from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    fireworks_api_key: str = ""
    database_url: str = "postgresql+asyncpg://claims:claims@localhost:5432/claims"
    upload_dir: Path = Path("data/uploads")
    fireworks_base_url: str = "https://api.fireworks.ai/inference/v1"

    # Local GPU backend (vLLM/Ollama/llama.cpp — OpenAI-compatible). Empty until
    # the AMD droplet is serving; set LOCAL_BASE_URL / LOCAL_API_KEY to enable.
    local_base_url: str = ""
    local_api_key: str = ""

    # Per-role model, "provider:model". Flip cloud<->local by editing one value.
    # Cheapest capable model per occasion — classification is trivial.
    model_classifier: str = "fireworks:accounts/fireworks/models/gpt-oss-20b"
    model_extractor: str = "fireworks:accounts/fireworks/models/gpt-oss-20b"

    # OCR: a vision model transcribes scans (Kimi reasons into its output), then a
    # cheap text model strips that reasoning to clean Markdown. See vision_ocr.py.
    model_vision_ocr: str = "fireworks:accounts/fireworks/models/kimi-k2p7-code"
    model_ocr_cleanup: str = "fireworks:accounts/fireworks/models/gpt-oss-120b"
    # Cheap vision call that classifies a scan BEFORE the expensive OCR, so junk
    # (screenshots, random photos) never burns a transcription. See vision_ocr.py.
    model_vision_classifier: str = "fireworks:accounts/fireworks/models/qwen3p7-plus"

    # Fireworks model assignments per agent
    model_po_matcher: str = "accounts/fireworks/models/llama-v3p1-70b-instruct"
    model_contract_validator: str = "accounts/fireworks/models/deepseek-r1"
    model_claim_drafter: str = "accounts/fireworks/models/llama-v3p1-70b-instruct"

    @property
    def procrastinate_dsn(self) -> str:
        # procrastinate speaks psycopg3; drop SQLAlchemy's async driver suffix.
        return self.database_url.replace("+asyncpg", "")


settings = Settings()
