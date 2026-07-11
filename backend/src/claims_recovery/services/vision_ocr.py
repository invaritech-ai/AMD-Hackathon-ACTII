"""Vision subagents of the ingestion agent — for scans and images.

Two jobs, both cheap-first:

* ``classify`` — the classifier subagent's vision path: one low-cost vision call
  that labels a scan (invoice / PO / contract / delivery_docket /
  remittance_advice / promo_agreement / other) BEFORE any transcription, so junk
  never burns the expensive OCR pass.
* ``transcribe`` — the OCR subagent: the vision model (Kimi K2.7) reads the page
  to Markdown, then the cleanup step (a cheap text model, gpt-oss) strips Kimi's
  chain-of-thought to the final clean Markdown. Kimi reasons and often truncates,
  so this second pass is required.

Sync on purpose: called from the worker's off-thread extraction path.
"""

from __future__ import annotations

import base64
import io
import logging
from pathlib import Path

from openai import OpenAI

from claims_recovery.config import settings

logger = logging.getLogger(__name__)

# Cap the long side sent to the vision model — bounds image-token cost with no
# quality loss on documents. ponytail: raise if fine print gets missed.
_LONG_SIDE = 2000
_PDF_DPI = 150

_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp"}

_VISION_PROMPT = (
    "Transcribe this document to clean Markdown. Preserve every number exactly and "
    "render line-item tables as Markdown tables. Include all header fields."
)
_CLEANUP_PROMPT = (
    "The text below is an OCR transcription attempt that mixes the model's private "
    "reasoning notes and multiple draft revisions with the actual document "
    "transcription. Return ONLY the final, clean transcription as Markdown: all "
    "header fields, every number preserved, line-item tables as Markdown tables. "
    "No reasoning, no commentary, no 'Final version' labels, no ``` fences.\n\n---\n"
)
_CLASSIFY_PROMPT = (
    "What kind of document is this? Decide, then on the LAST line output exactly one "
    "of: invoice, purchase_order, contract, delivery_docket, remittance_advice, "
    "promo_agreement, other."
)
# Longest labels first so 'purchase_order' wins over a stray 'order'.
_LABELS = (
    "remittance_advice", "promo_agreement", "purchase_order", "delivery_docket",
    "invoice", "contract", "other",
)


def _client() -> OpenAI:
    return OpenAI(
        base_url=settings.fireworks_base_url,
        api_key=settings.fireworks_api_key,
        timeout=120.0,
    )


def _model(spec: str) -> str:
    """'provider:model' -> 'model' (model may itself contain ':')."""
    return spec.partition(":")[2]


def _encode(pil) -> bytes:
    """PIL image -> JPEG bytes, long side capped at _LONG_SIDE."""
    w, h = pil.size
    s = min(1.0, _LONG_SIDE / max(w, h))
    if s < 1.0:
        pil = pil.resize((round(w * s), round(h * s)))
    buf = io.BytesIO()
    pil.convert("RGB").save(buf, format="JPEG", quality=88)
    return buf.getvalue()


def _pages(file_path: Path):
    """Yield one PIL image per page. PDFs rasterised via pypdfium2; images direct."""
    if file_path.suffix.lower() == ".pdf":
        import pypdfium2 as pdfium

        pdf = pdfium.PdfDocument(str(file_path))
        try:
            for page in pdf:
                yield page.render(scale=_PDF_DPI / 72).to_pil()
        finally:
            pdf.close()
        return

    from PIL import Image

    yield Image.open(file_path)


def _data_url(pil) -> str:
    return "data:image/jpeg;base64," + base64.b64encode(_encode(pil)).decode()


def _vision_call(client: OpenAI, model_spec: str, prompt: str, pil, max_tokens: int) -> str:
    resp = client.chat.completions.create(
        model=_model(model_spec),
        temperature=0.0,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": _data_url(pil)}},
        ]}],
    )
    return resp.choices[0].message.content or ""


def classify(file_path: Path) -> str:
    """Label a scan from its first page. Returns one of _LABELS ('other' = junk)."""
    client = _client()
    first = next(_pages(file_path), None)
    if first is None:
        return "other"
    raw = _vision_call(client, settings.model_vision_classifier, _CLASSIFY_PROMPT, first, 400)
    low = raw.lower()
    # The model echoes every label in its reasoning; the committed answer is the
    # last one it writes, so take the last occurrence.
    best, pos = "other", -1
    for lab in _LABELS:
        i = low.rfind(lab)
        if i > pos:
            best, pos = lab, i
    return best


def _cleanup(client: OpenAI, raw: str) -> str:
    resp = client.chat.completions.create(
        model=_model(settings.model_ocr_cleanup),
        temperature=0.0,
        max_tokens=2048,
        messages=[{"role": "user", "content": _CLEANUP_PROMPT + raw}],
    )
    return (resp.choices[0].message.content or "").strip()


def transcribe(file_path: Path) -> str:
    """Vision OCR -> reasoning-stripped Markdown for every page, joined."""
    client = _client()
    cleaned = []
    for pil in _pages(file_path):
        raw = _vision_call(client, settings.model_vision_ocr, _VISION_PROMPT, pil, 4096)
        cleaned.append(_cleanup(client, raw) if raw.strip() else "")
    return "\n\n".join(p for p in cleaned if p)
