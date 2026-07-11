"""add claim ledger

Revision ID: e4a7b2c9d105
Revises: d9f1a136d398
Create Date: 2026-07-11
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e4a7b2c9d105"
down_revision: Union[str, Sequence[str], None] = "d9f1a136d398"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "claims",
        sa.Column(
            "recovered_amount",
            sa.Numeric(precision=12, scale=2),
            server_default=sa.text("0"),
            nullable=False,
        ),
    )
    op.alter_column(
        "claims",
        "status",
        existing_type=sa.String(length=16),
        type_=sa.String(length=32),
        existing_nullable=False,
    )
    op.create_unique_constraint("uq_claim_case", "claims", ["case_id"])
    op.create_table(
        "claim_status_events",
        sa.Column("claim_id", sa.String(length=8), nullable=False),
        sa.Column("from_status", sa.String(length=32), nullable=True),
        sa.Column("to_status", sa.String(length=32), nullable=False),
        sa.Column("recovered_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["claim_id"], ["claims.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_claim_status_events_claim_id",
        "claim_status_events",
        ["claim_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_claim_status_events_claim_id", table_name="claim_status_events"
    )
    op.drop_table("claim_status_events")
    op.drop_constraint("uq_claim_case", "claims", type_="unique")
    op.alter_column(
        "claims",
        "status",
        existing_type=sa.String(length=32),
        type_=sa.String(length=16),
        existing_nullable=False,
    )
    op.drop_column("claims", "recovered_amount")
