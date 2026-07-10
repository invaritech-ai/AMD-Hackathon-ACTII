from __future__ import annotations

import enum
from decimal import Decimal

from sqlalchemy import Date, Enum, Float, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from claims_recovery.models.base import Base, TimestampMixin


class RecoveryClaim(Base, TimestampMixin):
    __tablename__ = "recovery_claims"

    run_id: Mapped[str] = mapped_column(
        String(8), ForeignKey("pipeline_runs.id", ondelete="CASCADE"), index=True
    )
    invoice_id: Mapped[str] = mapped_column(
        String(8), ForeignKey("invoices.id"), index=True
    )
    invoice_number: Mapped[str] = mapped_column(String(64))
    po_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    total_claim_amount: Mapped[float] = mapped_column(Float, default=0.0)
    draft_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="DRAFT")
