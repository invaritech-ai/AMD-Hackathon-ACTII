FROM python:3.12.13-slim-trixie

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONPATH=/app/src \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# No system libs needed: pypdfium2 (PDF raster) and Pillow ship self-contained
# manylinux wheels. OCR is a remote vision-LLM call — nothing native to build.

RUN pip install uv==0.6.3

# Deps first so this layer caches unless pyproject/lock change.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

RUN useradd --create-home --shell /bin/bash appuser

COPY --chown=appuser:appuser src ./src
COPY --chown=appuser:appuser tests ./tests
COPY --chown=appuser:appuser alembic ./alembic
COPY --chown=appuser:appuser alembic.ini ./alembic.ini

# An empty named volume inherits this directory's ownership on first mount.
# Both the API and worker mount the same volume in production.
RUN mkdir -p /app/data/uploads && chown -R appuser:appuser /app/data

USER appuser

EXPOSE 8000

CMD ["uvicorn", "claims_recovery.main:app", "--host", "0.0.0.0", "--port", "8000"]
