from __future__ import annotations

import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from claims_recovery.agents.agent_definitions import (
    get_agent2_po_matcher,
    get_agent3_contract_validator,
    get_agent5_claim_drafter,
)
from claims_recovery.agents.agent4_discrepancy_aggregator import aggregate_discrepancies
from claims_recovery.models.discrepancy import (
    ClaimStatus,
    Discrepancy,
    DiscrepancyType,
    Severity,
)
from claims_recovery.models.invoice import Invoice
from claims_recovery.models.pipeline_run import PipelineRun, RunStatus
from claims_recovery.models.recovery_claim import RecoveryClaim
from agents import Runner


async def execute_pipeline(
    session: AsyncSession,
    run: PipelineRun,
) -> PipelineRun:
    document_ids = json.loads(run.document_ids)
    run.status = RunStatus.RUNNING
    await session.commit()

    try:
        all_discrepancies: list[dict[str, Any]] = []
        all_claims: list[dict[str, Any]] = []

        for doc_id in document_ids:
            # Load invoice
            result = await session.execute(
                select(Invoice)
                .options(selectinload(Invoice.line_items))
                .where(Invoice.document_id == doc_id)
            )
            invoice = result.scalar_one_or_none()
            if not invoice:
                continue

            invoice_data = _format_invoice_for_agent(invoice)

            # ── Agent 2: PO Matcher ──
            run.agent2_po_match = json.dumps({"status": "running"})
            await session.commit()

            po_input = f"Invoice:\n{json.dumps(invoice_data, indent=2)}"
            po_result = await Runner.run(get_agent2_po_matcher(), po_input)
            po_output = str(po_result.final_output)
            run.agent2_po_match = json.dumps({"status": "completed", "output": po_output})
            await session.commit()

            # ── Agent 3: Contract Validator ──
            run.agent3_contract = json.dumps({"status": "running"})
            await session.commit()

            contract_input = (
                f"Validate the following invoice line items against contracts:\n"
                f"Supplier: {invoice.supplier_name}\n"
                f"Line Items:\n{json.dumps(invoice_data['line_items'], indent=2)}"
            )
            contract_result = await Runner.run(get_agent3_contract_validator(), contract_input)
            contract_output = str(contract_result.final_output)
            run.agent3_contract = json.dumps({"status": "completed", "output": contract_output})
            await session.commit()

            # ── Agent 4: Discrepancy Aggregator ──
            po_matches = _parse_agent_output(po_output)
            contract_results = _parse_agent_output(contract_output)

            aggregated = aggregate_discrepancies(po_matches, contract_results)
            run.agent4_aggregate = json.dumps(aggregated)
            await session.commit()

            # Save discrepancies to DB
            for disc in aggregated.get("discrepancies", []):
                sev = Severity(disc.get("severity", "LOW"))
                d_type = DiscrepancyType(disc.get("discrepancy_type", "PRICE_MISMATCH"))

                discrepancy = Discrepancy(
                    run_id=run.id,
                    invoice_id=invoice.id,
                    invoice_number=invoice.invoice_number,
                    po_number=disc.get("po_number"),
                    item_description=disc.get("item_description", ""),
                    expected_quantity=disc.get("expected_quantity"),
                    actual_quantity=disc.get("actual_quantity"),
                    expected_unit_price=disc.get("expected_unit_price"),
                    actual_unit_price=disc.get("actual_unit_price"),
                    difference_amount=disc.get("difference_amount", 0),
                    discrepancy_type=d_type,
                    severity=sev,
                    status=ClaimStatus.OPEN,
                )
                session.add(discrepancy)

            await session.commit()

            # ── Agent 5: Claim Drafter ──
            if aggregated.get("discrepancies"):
                run.agent5_claims = json.dumps({"status": "running"})
                await session.commit()

                claim_input = (
                    f"Draft a recovery claim for the following discrepancies:\n"
                    f"Supplier: {invoice.supplier_name}\n"
                    f"Invoice: {invoice.invoice_number}\n"
                    f"{json.dumps(aggregated['discrepancies'], indent=2)}"
                )
                claim_result = await Runner.run(get_agent5_claim_drafter(), claim_input)
                claim_text = str(claim_result.final_output)
                run.agent5_claims = json.dumps({"status": "completed", "output": claim_text})
                await session.commit()

                claim = RecoveryClaim(
                    run_id=run.id,
                    invoice_id=invoice.id,
                    invoice_number=invoice.invoice_number,
                    po_number=aggregated["discrepancies"][0].get("po_number"),
                    total_claim_amount=aggregated["total_claim_value"],
                    draft_text=claim_text,
                    status="DRAFT",
                )
                session.add(claim)
                await session.commit()
                await session.refresh(claim)

                all_claims.append({
                    "id": claim.id,
                    "invoice_number": claim.invoice_number,
                    "po_number": claim.po_number,
                    "total_claim_amount": claim.total_claim_amount,
                    "draft_text": claim.draft_text,
                    "status": claim.status,
                })

            all_discrepancies.extend(aggregated.get("discrepancies", []))

        # Finalize run
        run.status = RunStatus.COMPLETED
        run.total_discrepancies = len(all_discrepancies)
        run.total_claim_value = sum(d.get("difference_amount", 0) for d in all_discrepancies)
        await session.commit()

    except Exception as e:
        run.status = RunStatus.FAILED
        run.error_message = str(e)
        await session.commit()

    return run


def _format_invoice_for_agent(invoice: Invoice) -> dict[str, Any]:
    return {
        "invoice_number": invoice.invoice_number,
        "invoice_date": invoice.invoice_date,
        "supplier_name": invoice.supplier_name,
        "total": float(invoice.total or 0),
        "line_items": [
            {
                "description": li.description,
                "quantity": float(li.quantity or 0),
                "unit_price": float(li.unit_price or 0),
                "line_total": float(li.line_total or 0),
            }
            for li in invoice.line_items
        ],
    }


def _parse_agent_output(output: str) -> list[dict[str, Any]]:
    """Best-effort parse of agent output. Tries JSON, then wraps as raw text."""
    try:
        return json.loads(output) if output.strip().startswith("[") else []
    except json.JSONDecodeError:
        try:
            return json.loads("[" + output + "]")
        except json.JSONDecodeError:
            return [{"raw_output": output}]
