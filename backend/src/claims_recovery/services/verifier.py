"""Slice 2 — deterministic arithmetic verifier.

The LLM extracts numbers *as printed* (slice 1); this checks they reconcile:
each line total = qty x unit_price, subtotal = sum of lines, total = subtotal +
tax. No LLM decides the maths — it only extracts and (later) narrates. Findings
here are internal-consistency discrepancies that feed the aggregator.
"""

from __future__ import annotations

from typing import Any


def _close(a: float, b: float, tol: float = 0.01) -> bool:
    # A cent absolute, or 0.5% relative for prices carried at >2dp.
    return abs(a - b) <= max(tol, 0.005 * abs(b))


def _finding(check: str, item: str, expected: float, printed: float, message: str) -> dict[str, Any]:
    return {
        "check": check,
        "item": item,
        "expected": expected,
        "printed": printed,
        "delta": round(printed - expected, 2),
        "message": message,
    }


def verify_arithmetic(fields: dict[str, Any]) -> dict[str, Any]:
    """Check a document's printed figures reconcile. Pure + deterministic."""
    findings: list[dict[str, Any]] = []
    items = fields.get("line_items") or []

    # 1. Each line: qty x unit_price == line_total.
    line_sum = 0.0
    for it in items:
        qty = float(it.get("quantity") or 0)
        price = float(it.get("unit_price") or 0)
        printed = float(it.get("line_total") or 0)
        line_sum += printed
        if qty and price:
            expected = round(qty * price, 2)
            if not _close(expected, printed):
                findings.append(_finding(
                    "line_total", str(it.get("description", "")), expected, printed,
                    f"{qty:g} x {price:.2f} = {expected:.2f}, but line shows {printed:.2f}",
                ))
    line_sum = round(line_sum, 2)

    subtotal = float(fields.get("subtotal") or 0)
    tax = float(fields.get("tax") or 0)
    total = float(fields.get("total") or 0)

    # 2. Subtotal == sum of line totals.
    if subtotal and items and not _close(line_sum, subtotal):
        findings.append(_finding(
            "subtotal", "", line_sum, subtotal,
            f"line totals sum to {line_sum:.2f}, but subtotal shows {subtotal:.2f}",
        ))

    # 3. Total == base + tax (base = printed subtotal, else the summed lines).
    base = subtotal if subtotal else line_sum
    if total and base:
        expected = round(base + tax, 2)
        if not _close(expected, total):
            findings.append(_finding(
                "total", "", expected, total,
                f"{base:.2f} + {tax:.2f} tax = {expected:.2f}, but total shows {total:.2f}",
            ))

    ok = not findings
    summary = (
        "Arithmetic reconciles."
        if ok
        else f"{len(findings)} arithmetic issue(s): "
        + "; ".join(f["message"] for f in findings)
    )
    return {"ok": ok, "findings": findings, "summary": summary}
