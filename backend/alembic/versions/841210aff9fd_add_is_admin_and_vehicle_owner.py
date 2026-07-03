"""add is_admin and vehicle owner

Revision ID: 841210aff9fd
Revises: 3d5e4a889d3a
Create Date: 2026-07-02 16:32:18.544419

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '841210aff9fd'
down_revision: Union[str, Sequence[str], None] = '3d5e4a889d3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(
            sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.false())
        )

    with op.batch_alter_table('vehicles') as batch_op:
        batch_op.add_column(sa.Column('owner_id', sa.Integer(), nullable=True))

    op.execute("UPDATE vehicles SET owner_id = created_by_id WHERE created_by_id IS NOT NULL")
    op.execute(
        "UPDATE vehicles SET owner_id = (SELECT id FROM users ORDER BY id LIMIT 1) WHERE owner_id IS NULL"
    )

    with op.batch_alter_table('vehicles') as batch_op:
        batch_op.create_foreign_key('fk_vehicles_owner_id_users', 'users', ['owner_id'], ['id'])
        batch_op.drop_column('created_by_id')

    with op.batch_alter_table('vehicles') as batch_op:
        batch_op.alter_column('owner_id', nullable=False)


def downgrade() -> None:
    with op.batch_alter_table('vehicles') as batch_op:
        batch_op.add_column(sa.Column('created_by_id', sa.Integer(), nullable=True))

    op.execute("UPDATE vehicles SET created_by_id = owner_id")

    with op.batch_alter_table('vehicles') as batch_op:
        batch_op.create_foreign_key('fk_vehicles_created_by_id_users', 'users', ['created_by_id'], ['id'])
        batch_op.drop_column('owner_id')

    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('is_admin')
