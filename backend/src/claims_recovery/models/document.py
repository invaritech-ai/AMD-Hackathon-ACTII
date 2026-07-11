from __future__ import annotations

import enum
from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from claims_recovery.models.base import Base, TimestampMixin


class DocumentType(str, enum.Enum):
    INVOICE = "invoice"
    PURCHASE_ORDER = "purchase_order"
    CONTRACT = "contract"
    DELIVERY_DOCKET = "delivery_docket"
    REMITTANCE_ADVICE = "remittance_advice"  # retailer payment + deduction/claim list
    PROMO_AGREEMENT = "promo_agreement"      # promotional funding terms (cap, window)
    UNKNOWN = "unknown"


class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    filename: Mapped[str] = mapped_column(String(512))
    original_filename: Mapped[str] = mapped_column(String(512))
    type: Mapped[DocumentType] = mapped_column(
        Enum(DocumentType), default=DocumentType.UNKNOWN
    )
    file_path: Mapped[str] = mapped_column(String(1024))
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)  # content_md
    extracted_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    verification_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")

    # Case-graph fields (slice: case-centric schema).
    case_id: Mapped[str | None] = mapped_column(
        String(8), ForeignKey("cases.id", ondelete="SET NULL"), nullable=True, index=True
    )
    doc_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    total: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    # Free-text currency as printed ("HK Dollar", "GBP", …) — not a 3-letter code.
    currency: Mapped[str | None] = mapped_column(String(32), nullable=True)
