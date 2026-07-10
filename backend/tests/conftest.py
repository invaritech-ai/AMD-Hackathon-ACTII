from __future__ import annotations

import asyncio

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from claims_recovery.config import settings
from claims_recovery.database import get_db
from claims_recovery.main import app
from claims_recovery.models.base import Base
from claims_recovery.procrastinate_app import app as procrastinate_app

# Postgres only. Run with e.g.
#   DATABASE_URL=postgresql+asyncpg://claims:claims@localhost:5432/claims pytest
# NullPool: don't reuse a connection across pytest's per-test event loops.
test_engine = create_async_engine(settings.database_url, echo=False, poolclass=NullPool)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
def _schema():
    """Create our tables + procrastinate's once, in a self-contained loop."""

    async def setup() -> None:
        engine = create_async_engine(settings.database_url, poolclass=NullPool)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()
        async with procrastinate_app.open_async():
            try:
                await procrastinate_app.schema_manager.apply_schema_async()
            except Exception:
                pass  # already applied (re-run against the same DB)

    asyncio.run(setup())
    yield


@pytest_asyncio.fixture(autouse=True)
async def _clean():
    # Fresh data per test; order-independent assertions (e.g. empty ledger).
    tables = ", ".join(t.name for t in reversed(Base.metadata.sorted_tables))
    async with test_engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    yield


@pytest_asyncio.fixture
async def session():
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def client(session):
    async def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    # Open the procrastinate pool on this test's loop so upload can defer jobs.
    async with procrastinate_app.open_async():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
    app.dependency_overrides.clear()
