from __future__ import annotations

from typing import AsyncGenerator

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from claims_recovery.database import engine
from claims_recovery.routers import documents, ledger, runs


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Schema is owned by Alembic (see the `migrate` compose service), not create_all.
    # Open the procrastinate pool so request handlers can defer jobs to the worker.
    from claims_recovery.procrastinate_app import app as procrastinate_app

    async with procrastinate_app.open_async():
        yield

    await engine.dispose()


app = FastAPI(
    title="Claims Recovery Agent API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(runs.router)
app.include_router(ledger.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
