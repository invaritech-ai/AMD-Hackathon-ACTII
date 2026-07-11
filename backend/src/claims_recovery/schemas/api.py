from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

from claims_recovery.models.document import DocumentType


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


class CaseSummary(BaseModel):
    case_id: str
    title: str | None = None
    status: str
    document_count: int
    shared_ids: list[str] = Field(default_factory=list)


class DocumentSummary(BaseModel):
    id: str
    filename: str
    type: DocumentType
    status: str
    case_ids: list[str] = Field(default_factory=list)  # 1 today; list for the M:N future
    ids: list[str] = Field(default_factory=list)        # normalised ids the doc carries
    created_at: datetime
    size_bytes: int


# ── Reconciliation (case-centric) ─────────────────────

class CaseExceptionResponse(BaseModel):
    id: str
    document_id: str | None = None
    check_type: str
    severity: str
    expected_value: Decimal | None = None
    actual_value: Decimal | None = None
    delta: Decimal | None = None
    currency: str | None = None
    explanation: str | None = None
    status: str

    model_config = {"from_attributes": True}


class CaseClaimResponse(BaseModel):
    id: str
    total_amount: Decimal
    currency: str | None = None
    draft_text: str | None = None
    status: str

    model_config = {"from_attributes": True}


class ReconciliationResponse(BaseModel):
    case_id: str
    reconciliation_id: str | None = None
    status: str  # ok | exceptions_found
    summary: str | None = None
    total_recoverable: Decimal = Decimal("0")
    currency: str | None = None
    exceptions: list[CaseExceptionResponse] = Field(default_factory=list)
    claim: CaseClaimResponse | None = None


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

