"""Turn any uploaded document into Markdown, preserving tables.

Dispatch by file extension, fast path first (native text layer before OCR),
mirroring the split proven across the dataset:

    text-layer PDF        -> pdfplumber (text + text-strategy tables)
    scanned PDF / image   -> PaddleOCR PP-StructureV3 (layout + table recognition)
    .docx                 -> python-docx (paragraphs + tables)
    .xlsx                 -> openpyxl (rows)
    .csv                  -> stdlib csv (rows)
    .txt / .md / .json    -> decode

Tables are the point: financial docs live and die on their line-item tables, so
every tabular source is rendered to Markdown (pipe tables here; PP-StructureV3
emits HTML <table> inline, which LLMs read fine). Every extractor is
dependency-guarded and never raises — a failed extract returns "" not a 500.
"""

from __future__ import annotations

import csv
import json
import logging
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

# A PDF text layer shorter than this is treated as scanned -> route to OCR.
_MIN_TEXT_LAYER_CHARS = 50

_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp"}
_TEXT_SUFFIXES = {".txt", ".md", ".markdown", ".json", ".log", ".xml", ".yaml", ".yml"}


def extract_markdown(file_path: Path) -> str:
    """Extract a Markdown representation of a document. Never raises."""
    suffix = file_path.suffix.lower()
    try:
        if suffix == ".pdf":
            return _from_pdf(file_path)
        if suffix in _IMAGE_SUFFIXES:
            return _from_image(file_path)
        if suffix == ".docx":
            return _from_docx(file_path)
        if suffix == ".xlsx":
            return _from_xlsx(file_path)
        if suffix == ".csv":
            return _from_csv(file_path)
        if suffix in _TEXT_SUFFIXES:
            return _decode(file_path)
        # Unknown extension: try a plain text decode, else give up.
        return _decode(file_path)
    except Exception:  # never let extraction 500 the request
        logger.exception("extraction failed for %s", file_path.name)
        return ""


SUPPORTED_SUFFIXES = {".pdf", ".docx", ".xlsx", ".csv", *_IMAGE_SUFFIXES, *_TEXT_SUFFIXES}


def is_supported(filename: str) -> bool:
    return Path(filename).suffix.lower() in SUPPORTED_SUFFIXES


# ── Markdown helpers ──────────────────────────────────────────────────

def rows_to_markdown(rows: list[list[str]]) -> str:
    """Render rows as a GitHub Markdown table. First row is the header."""
    cleaned = [
        [(c if c is not None else "").replace("\n", " ").replace("|", "\\|").strip() for c in row]
        for row in rows
    ]
    cleaned = [r for r in cleaned if any(cell for cell in r)]
    if not cleaned:
        return ""
    width = max(len(r) for r in cleaned)
    cleaned = [r + [""] * (width - len(r)) for r in cleaned]
    header, *body = cleaned
    lines = ["| " + " | ".join(header) + " |", "|" + "|".join(["---"] * width) + "|"]
    lines += ["| " + " | ".join(r) + " |" for r in body]
    return "\n".join(lines)


# ── PDF ───────────────────────────────────────────────────────────────

def _from_pdf(file_path: Path) -> str:
    import pdfplumber

    text_parts: list[str] = []
    table_strategy = {"vertical_strategy": "text", "horizontal_strategy": "text"}
    with pdfplumber.open(str(file_path)) as pdf:
        for page in pdf.pages:
            text_parts.append(page.extract_text() or "")
            for table in page.extract_tables(table_strategy):
                md = rows_to_markdown(table)
                if md:
                    text_parts.append(md)

    combined = "\n\n".join(p for p in text_parts if p.strip())
    if len(combined.strip()) >= _MIN_TEXT_LAYER_CHARS:
        return combined
    # Empty/near-empty text layer -> scanned PDF, fall back to OCR.
    logger.info("%s has no usable text layer; routing to PP-StructureV3", file_path.name)
    return _from_image(file_path)


# ── Image / scanned (PP-StructureV3) ──────────────────────────────────

@lru_cache(maxsize=1)
def _get_structure_pipeline():
    """PP-StructureV3 with the trimmed mobile config (fits memory, keeps tables)."""
    from paddleocr import PPStructureV3

    return PPStructureV3(
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        use_formula_recognition=False,
        use_seal_recognition=False,
        use_chart_recognition=False,
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="PP-OCRv5_mobile_rec",
    )


def _from_image(file_path: Path) -> str:
    try:
        pipeline = _get_structure_pipeline()
    except ImportError:
        logger.warning("paddleocr/paddlex not installed; skipping OCR for %s", file_path.name)
        return ""

    pages: list[str] = []
    for result in pipeline.predict(str(file_path)):
        md = getattr(result, "markdown", None)
        if isinstance(md, dict):
            md = md.get("markdown_texts", "")
        if md:
            pages.append(md)
    return "\n\n".join(pages)


# ── Office formats ────────────────────────────────────────────────────

def _from_docx(file_path: Path) -> str:
    import docx

    document = docx.Document(str(file_path))
    parts = [p.text for p in document.paragraphs if p.text.strip()]
    for table in document.tables:
        rows = [[cell.text for cell in row.cells] for row in table.rows]
        md = rows_to_markdown(rows)
        if md:
            parts.append(md)
    return "\n\n".join(parts)


def _from_xlsx(file_path: Path) -> str:
    import openpyxl

    workbook = openpyxl.load_workbook(str(file_path), read_only=True, data_only=True)
    parts: list[str] = []
    for sheet in workbook.worksheets:
        rows = [
            [("" if v is None else str(v)) for v in row]
            for row in sheet.iter_rows(values_only=True)
        ]
        md = rows_to_markdown(rows)
        if md:
            parts.append(f"## {sheet.title}\n\n{md}")
    workbook.close()
    return "\n\n".join(parts)


def _from_csv(file_path: Path) -> str:
    with open(file_path, newline="", encoding="utf-8", errors="replace") as f:
        rows = list(csv.reader(f))
    return rows_to_markdown(rows)


# ── Plain text ────────────────────────────────────────────────────────

def _decode(file_path: Path) -> str:
    data = file_path.read_bytes()
    for enc in ("utf-8", "utf-16", "latin-1"):
        try:
            text = data.decode(enc)
            break
        except (UnicodeDecodeError, LookupError):
            continue
    else:
        text = data.decode("utf-8", errors="replace")
    # Pretty-print JSON so keys are on their own lines (helps keyword classification).
    if file_path.suffix.lower() == ".json":
        try:
            return json.dumps(json.loads(text), indent=2)
        except json.JSONDecodeError:
            pass
    return text
