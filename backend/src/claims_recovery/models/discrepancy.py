from __future__ import annotations

import enum
from decimal import Decimal

from sqlalchemy import Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from claims_recovery.models.base import Base, TimestampMixin


class DiscrepancyType(str, enum.Enum):
    PRICE_MISMATCH = "PRICE_MISMATCH"
    QTY_MISMATCH = "QTY_MISMATCH"
    UNAUTHORIZED_CHARGE = "UNAUTHORIZED_CHARGE"
    DUPLICATE = "DUPLICATE"
    OVERCHARGE = "OVERCHARGE"
    UNDERCHARGE = "UNDERCHARGE"


class Severity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ClaimStatus(str, enum.Enum):
    OPEN = "OPEN"
    DRAFTING_CLAIM = "DRAFTING_CLAIM"
    CLAIM_SUBMITTED = "CLAIM_SUBMITTED"
    RESOLVED = "RESOLVED"


class Discrepancy(Base, TimestampMixin):
    __tablename__ = "discrepancies"

    run_id: Mapped[str] = mapped_column(
        String(8), ForeignKey("pipeline_runs.id", ondelete="CASCADE"), index=True
    )
    invoice_id: Mapped[str] = mapped_column(
        String(8), ForeignKey("invoices.id"), index=True
    )
    invoice_number: Mapped[str] = mapped_column(String(64))
    po_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    item_description: Mapped[str] = mapped_column(Text)
    expected_quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    actual_quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    expected_unit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    actual_unit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    difference_amount: Mapped[float] = mapped_column(Float, default=0.0)
    discrepancy_type: Mapped[DiscrepancyType] = mapped_column(
        Enum(DiscrepancyType)
    )
    severity: Mapped[Severity] = mapped_column(Enum(Severity))
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ClaimStatus] = mapped_column(
        Enum(ClaimStatus), default=ClaimStatus.OPEN
    )
