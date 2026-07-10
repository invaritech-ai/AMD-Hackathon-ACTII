from __future__ import annotations

import enum

from sqlalchemy import Enum, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from claims_recovery.models.base import Base, TimestampMixin


class RunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class PipelineRun(Base, TimestampMixin):
    __tablename__ = "pipeline_runs"

    status: Mapped[RunStatus] = mapped_column(
        Enum(RunStatus), default=RunStatus.PENDING
    )
    document_ids: Mapped[str] = mapped_column(Text)

    # Per-agent progress (store as JSON strings for simplicity)
    agent1_ocr: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent2_po_match: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent3_contract: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent4_aggregate: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent5_claims: Mapped[str | None] = mapped_column(Text, nullable=True)

    total_discrepancies: Mapped[int | None] = mapped_column(nullable=True)
    total_claim_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
