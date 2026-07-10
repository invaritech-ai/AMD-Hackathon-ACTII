from __future__ import annotations

from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from claims_recovery.models.base import Base, TimestampMixin


class Invoice(Base, TimestampMixin):
    __tablename__ = "invoices"

    document_id: Mapped[str] = mapped_column(
        String(8), ForeignKey("documents.id"), unique=True
    )
    invoice_number: Mapped[str] = mapped_column(String(64), index=True)
    invoice_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    supplier_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(8), nullable=True)
    subtotal: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    tax: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    total: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(String(128), nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    line_items: Mapped[list["LineItem"]] = relationship(
        "LineItem", back_populates="invoice", cascade="all, delete-orphan"
    )


class LineItem(Base, TimestampMixin):
    __tablename__ = "line_items"

    invoice_id: Mapped[str] = mapped_column(
        String(8), ForeignKey("invoices.id", ondelete="CASCADE"), index=True
    )
    description: Mapped[str] = mapped_column(Text)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    unit_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)
    line_total: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="line_items")
