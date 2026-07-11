from __future__ import annotations

from pathlib import Path

from claims_recovery.services.ingestion import (
    extract_native_text,
    is_supported,
    rows_to_markdown,
)


def test_rows_to_markdown_basic():
    md = rows_to_markdown([["a", "b"], ["1", "2"]])
    assert md.splitlines() == ["| a | b |", "|---|---|", "| 1 | 2 |"]


def test_rows_to_markdown_pads_ragged_rows_and_escapes_pipes():
    md = rows_to_markdown([["h1", "h2", "h3"], ["x|y", "z"]])
    lines = md.splitlines()
    assert lines[1] == "|---|---|---|"          # header width = 3
    assert lines[2] == "| x\\|y | z |  |"        # pipe escaped, missing cell padded


def test_rows_to_markdown_drops_empty_rows():
    assert rows_to_markdown([["a"], ["", ""], ["b"]]).splitlines() == [
        "| a |",
        "|---|",
        "| b |",
    ]


def test_csv_extraction(tmp_path: Path):
    p = tmp_path / "po.csv"
    p.write_text("po_number,supplier\nPO-1,Acme\nPO-2,Globex\n")
    md = extract_native_text(p)
    assert "| po_number | supplier |" in md
    assert "| PO-1 | Acme |" in md


def test_images_have_no_native_text():
    # Images carry no native text -> None signals "route to vision OCR".
    assert extract_native_text(Path("scan.jpg")) is None


def test_missing_pdf_never_raises(tmp_path: Path):
    # Missing/broken file: swallowed, returns None (needs OCR / nothing to read).
    assert extract_native_text(tmp_path / "nope.pdf") is None
    assert is_supported("invoice.pdf")
    assert is_supported("scan.JPG")
    assert not is_supported("archive.zip")
