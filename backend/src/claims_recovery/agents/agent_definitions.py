from __future__ import annotations

import json
from typing import Any

from agents import Agent, function_tool

from claims_recovery.config import settings

_agent2 = None
_agent3 = None
_agent5 = None


def _make_model(name: str) -> Any:
    from agents import OpenAIChatCompletionsModel
    from claims_recovery.fireworks.setup import get_fireworks_client

    return OpenAIChatCompletionsModel(model=name, openai_client=get_fireworks_client())


# ── Agent 2 Tools ─────────────────────────────────────


@function_tool
async def find_matching_po(
    supplier_name: str,
    invoice_date: str | None = None,
) -> str:
    """Find purchase orders matching a supplier using fuzzy matching."""
    from claims_recovery.agents.tools import find_matching_po as _fn

    result = await _fn(supplier_name, invoice_date)
    return json.dumps(result)


@function_tool
async def compare_po_line_items(
    invoice_items_json: str,
    po_items_json: str,
) -> str:
    """Compare invoice line items against PO line items. Returns discrepancies."""
    from rapidfuzz import fuzz

    inv_items = json.loads(invoice_items_json)
    po_items = json.loads(po_items_json)

    results: list[dict[str, Any]] = []
    for inv_item in inv_items:
        desc = inv_item.get("description", "")
        best_score = 0
        best_po: dict[str, Any] | None = None

        for po_item in po_items:
            score = fuzz.token_sort_ratio(
                desc.lower(), po_item.get("description", "").lower()
            )
            if score > best_score:
                best_score = score
                best_po = po_item

        if best_score < 60 or not best_po:
            results.append({
                "invoice_item": inv_item,
                "status": "UNAUTHORIZED_CHARGE",
                "message": "No matching PO item found",
            })
            continue

        inv_qty = float(inv_item.get("qty", 0))
        inv_price = float(inv_item.get("unit_price", 0))
        po_qty = float(best_po.get("qty", 0))
        po_price = float(best_po.get("unit_price", 0))

        flags = []
        if abs(inv_qty - po_qty) > 0.001:
            flags.append("QTY_MISMATCH")
        if abs(inv_price - po_price) > 0.001:
            flags.append("PRICE_MISMATCH")

        impact = (inv_price - po_price) * inv_qty if abs(inv_price - po_price) > 0.001 else 0

        results.append({
            "invoice_item": inv_item,
            "matched_po_item": best_po["description"],
            "status": ", ".join(flags) if flags else "MATCH",
            "invoice_qty": inv_qty,
            "po_qty": po_qty,
            "invoice_price": inv_price,
            "po_price": po_price,
            "impact": impact,
        })

    return json.dumps(results)


# ── Agent 3 Tools ─────────────────────────────────────


@function_tool
async def lookup_contract_price(
    supplier: str,
    item_description: str,
) -> str:
    """Look up the contracted price for an item from a supplier."""
    from claims_recovery.agents.tools import lookup_contract_price as _fn

    result = await _fn(supplier, item_description)
    return json.dumps(result)


@function_tool
async def compare_prices(
    invoice_price: float,
    contracted_price: float,
    quantity: float,
) -> str:
    """Compare invoice price against contracted price. Returns discrepancy details."""
    from claims_recovery.agents.tools import compare_item_price as _fn

    result = await _fn(invoice_price, contracted_price, quantity)
    return json.dumps(result)


# ── Late-bound agent factories ─────────────────────────

def get_agent2_po_matcher() -> Agent:
    global _agent2
    if _agent2 is None:
        _agent2 = Agent(
            name="PO Matcher",
            instructions=(
                "You are a purchase order matching agent for FMCG claims recovery. "
                "Your job is to match invoice line items to purchase order line items "
                "and flag any discrepancies.\n\n"
                "Steps:\n"
                "1. Call find_matching_po with the supplier name\n"
                "2. Call compare_po_line_items with the invoice and PO line items\n"
                "3. Summarize all findings: matched items, mismatches, total impact\n\n"
                "Always call both tools. Report ALL discrepancies found."
            ),
            tools=[find_matching_po, compare_po_line_items],
            model=_make_model(settings.model_po_matcher),
        )
    return _agent2


def get_agent3_contract_validator() -> Agent:
    global _agent3
    if _agent3 is None:
        _agent3 = Agent(
            name="Contract Validator",
            instructions=(
                "You are a contract validation agent for FMCG claims recovery. "
                "Check whether invoice prices match contracted rates.\n\n"
                "Steps:\n"
                "1. Call lookup_contract_price for each line item by supplier and item description\n"
                "2. Call compare_prices to check for discrepancies\n"
                "3. Summarize: which items are overcharged/undercharged, total impact\n\n"
                "Report ALL discrepancies with dollar amounts and clear explanations."
            ),
            tools=[lookup_contract_price, compare_prices],
            model=_make_model(settings.model_contract_validator),
        )
    return _agent3


def get_agent5_claim_drafter() -> Agent:
    global _agent5
    if _agent5 is None:
        _agent5 = Agent(
            name="Claim Drafter",
            instructions=(
                "You are a professional recovery claims drafting agent for FMCG retail. "
                "You receive a discrepancy report and produce a formal claim letter.\n\n"
                "Include in the claim letter:\n"
                "- Header: To [Supplier], Date, Reference: [Invoice #]\n"
                "- Body: each discrepancy with item description, expected vs actual, dollar impact\n"
                "- Summary: total amount claimed, payment deadline (Net 30)\n\n"
                "Format as clean Markdown suitable for PDF conversion. Be professional and concise."
            ),
            model=_make_model(settings.model_claim_drafter),
        )
    return _agent5
