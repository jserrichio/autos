"""add email to users

Revision ID: 6436173e100f
Revises: ff9cd7ece752
Create Date: 2026-07-03 11:49:25.933913

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6436173e100f'
down_revision: Union[str, Sequence[str], None] = 'ff9cd7ece752'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('email', sa.String(length=255), nullable=True))

    op.execute("UPDATE users SET email = 'juan.serrichio@gmail.com' WHERE username = 'juan' AND email IS NULL")

    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('email', nullable=False)
        batch_op.create_index(batch_op.f('ix_users_email'), ['email'], unique=True)


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_email'))
        batch_op.drop_column('email')
