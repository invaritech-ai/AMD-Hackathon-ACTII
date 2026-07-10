from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

from claims_recovery.models.document import DocumentType
from claims_recovery.models.discrepancy import ClaimStatus, DiscrepancyType, Severity


# ── Document ──────────────────────────────────────────

class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    type: DocumentType
    status: str

    model_config = {"from_attributes": True}


class DocumentDetail(BaseModel):
    id: str
    filename: str
    type: DocumentType
    status: str
    extracted_text: str | None = None
    extracted_json: dict[str, Any] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Case graph (slice 3) ──────────────────────────────

class GraphNode(BaseModel):
    id: str                       # document id
    type: DocumentType
    filename: str
    ids: list[str]                # normalised ids this document carries
    case_id: str


class GraphEdge(BaseModel):
    source: str                   # document id
    target: str                   # document id
    shared_ids: list[str]         # normalised ids that link source & target


class GraphCase(BaseModel):
    case_id: str
    document_ids: list[str]
    shared_ids: list[str]


class GraphResponse(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    cases: list[GraphCase] = Field(default_factory=list)


# ── Invoice ───────────────────────────────────────────

class LineItemResponse(BaseModel):
    description: str
    quantity: float | None = None
    unit: str | None = None
    unit_price: float | None = None
    line_total: float | None = None

    model_config = {"from_attributes": True}


class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    invoice_date: str | None = None
    supplier_name: str | None = None
    currency: str | None = None
    subtotal: float | None = None
    tax: float | None = None
    total: float | None = None
    line_items: list[LineItemResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


# ── Run ───────────────────────────────────────────────

class RunCreateRequest(BaseModel):
    document_ids: list[str]


class RunResponse(BaseModel):
    id: str
    status: str
    progress_pct: float = 0.0
    total_discrepancies: int | None = None
    total_claim_value: float | None = None
    agents: dict[str, Any] = Field(default_factory=dict)
    discrepancies: list[dict[str, Any]] = Field(default_factory=list)
    claims: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Discrepancy ───────────────────────────────────────

class DiscrepancyResponse(BaseModel):
    invoice_number: str
    po_number: str | None = None
    item_description: str
    expected_quantity: float | None = None
    actual_quantity: float | None = None
    expected_unit_price: float | None = None
    actual_unit_price: float | None = None
    difference_amount: float
    discrepancy_type: DiscrepancyType
    severity: Severity
    explanation: str | None = None

    model_config = {"from_attributes": True}


# ── Claim ─────────────────────────────────────────────

class ClaimResponse(BaseModel):
    invoice_number: str
    po_number: str | None = None
    total_claim_amount: float
    draft_text: str | None = None
    status: str

    model_config = {"from_attributes": True}


# ── Ledger ────────────────────────────────────────────

class LedgerEntry(BaseModel):
    supplier_name: str
    total_discrepancies: int
    total_claim_value: float
    claims_count: int


class LedgerResponse(BaseModel):
    total_claims: int
    total_claim_value: float
    by_supplier: list[LedgerEntry]
