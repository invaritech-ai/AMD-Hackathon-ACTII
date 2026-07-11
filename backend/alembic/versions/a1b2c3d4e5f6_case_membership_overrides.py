"""case membership overrides (manual attach/detach)

Revision ID: a1b2c3d4e5f6
Revises: 59dbbdaf196f
Create Date: 2026-07-11 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '59dbbdaf196f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'case_membership_overrides',
        sa.Column('case_id', sa.String(length=8), nullable=False),
        sa.Column('document_id', sa.String(length=8), nullable=False),
        sa.Column('kind', sa.String(length=8), nullable=False),
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('case_id', 'document_id', name='uq_case_override'),
    )
    op.create_index(
        op.f('ix_case_membership_overrides_case_id'),
        'case_membership_overrides', ['case_id'], unique=False,
    )
    op.create_index(
        op.f('ix_case_membership_overrides_document_id'),
        'case_membership_overrides', ['document_id'], unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_case_membership_overrides_document_id'), table_name='case_membership_overrides')
    op.drop_index(op.f('ix_case_membership_overrides_case_id'), table_name='case_membership_overrides')
    op.drop_table('case_membership_overrides')
