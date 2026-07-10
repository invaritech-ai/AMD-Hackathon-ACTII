"""Procrastinate app — the background worker for document processing.

Postgres-backed (procrastinate is Postgres-only). The FastAPI process opens
this app to *defer* jobs; a separate `procrastinate worker` process runs them.
"""

from __future__ import annotations

from procrastinate import App, PsycopgConnector

from claims_recovery.config import settings

app = App(connector=PsycopgConnector(conninfo=settings.procrastinate_dsn))

# Import for side effect: registers the tasks on `app`. Kept at the bottom so
# tasks.py can import `app` from here without a circular-import error.
from claims_recovery import tasks  # noqa: E402,F401
