"""Case-centric schema (the graph model).

Edges (`DocLink`) are the source of truth; a `Case` is a derived connected
component, cached onto `Document.case_id`. A `Reconciliation` checks a case's
figures; each failed check is an `Exception`; recoverable ones bundle into a
`Claim`. All relationships are many-to-one — no junction tables.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from claims_recovery.models.base import Base, TimestampMixin


class Case(Base, TimestampMixin):
    __tablename__ = "cases"

    title: Mapped[str | None] = mapped_column(String(256), nullable=True)  # AI-derived
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # AI-derived
    status: Mapped[str] = mapped_column(String(32), default="open")


class DocLink(Base, TimestampMixin):
    __tablename__ = "doc_links"
    __table_args__ = (
        UniqueConstraint("doc_a_id", "doc_b_id", "value_norm", name="uq_doc_link"),
    )

    # Convention: doc_a_id < doc_b_id so a pair dedupes to one row.
    doc_a_id: Mapped[str] = mapped_column(String(8), ForeignKey("documents.id"), index=True)
    doc_b_id: Mapped[str] = mapped_column(String(8), ForeignKey("documents.id"), index=True)
    case_id: Mapped[str | None] = mapped_column(
        String(8), ForeignKey("cases.id", ondelete="CASCADE"), nullable=True, index=True
    )
    value_norm: Mapped[str] = mapped_column(String(128))  # the shared id
    match_type: Mapped[str] = mapped_column(String(16), default="exact")  # exact|partial
    confidence: Mapped[float] = mapped_column(default=1.0)
    origin: Mapped[str] = mapped_column(String(16), default="auto")  # auto|manual
    status: Mapped[str] = mapped_column(String(16), default="active")  # active|dismissed


class CaseMembershipOverride(Base, TimestampMixin):
    """Operator curation on top of auto-derived cases (Model A).

    A case is normally a connected component of docs sharing ids. This table
    lets a human pin (`include`) or tombstone (`exclude`) a doc's membership so
    the choice survives the next component rebuild. Exactly one row per
    (case, doc): `include` forces the doc in, `exclude` forces it out; no row =
    pure auto. Clearing the row ("restore automatic placement") reverts to auto.
    """

    __tablename__ = "case_membership_overrides"
    __table_args__ = (
        UniqueConstraint("case_id", "document_id", name="uq_case_override"),
    )

    case_id: Mapped[str] = mapped_column(
        String(8), ForeignKey("cases.id", ondelete="CASCADE"), index=True
    )
    document_id: Mapped[str] = mapped_column(
        String(8), ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(8))  # include|exclude


class Reconciliation(Base, TimestampMixin):
    __tablename__ = "reconciliations"

    case_id: Mapped[str] = mapped_column(
        String(8), ForeignKey("cases.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(32), default="ok")  # ok|exceptions_found|failed
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)


class CaseException(Base, TimestampMixin):
    __tablename__ = "exceptions"

    case_id: Mapped[str] = mapped_column(
        String(8), ForeignKey("cases.id", ondelete="CASCADE"), index=True
    )
    reconciliation_id: Mapped[str | None] = mapped_column(
        String(8), ForeignKey("reconciliations.id", ondelete="CASCADE"), nullable=True
    )
    document_id: Mapped[str | None] = mapped_column(
        String(8), ForeignKey("documents.id"), nullable=True
    )
    claim_id: Mapped[str | None] = mapped_column(
        String(8), ForeignKey("claims.id"), nullable=True
    )
    check_type: Mapped[str] = mapped_column(String(32))  # line_math|price_vs_po|...
    severity: Mapped[str] = mapped_column(String(16), default="medium")
    expected_value: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    actual_value: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    delta: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(32), nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="open")  # open|in_claim|resolved|dismissed


class Claim(Base, TimestampMixin):
    __tablename__ = "claims"

    case_id: Mapped[str] = mapped_column(
        String(8), ForeignKey("cases.id", ondelete="CASCADE"), index=True
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    currency: Mapped[str | None] = mapped_column(String(32), nullable=True)
    draft_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="draft")  # draft|submitted|accepted|paid
