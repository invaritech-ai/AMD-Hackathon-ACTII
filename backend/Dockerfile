FROM python:3.12.13-slim-trixie

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONPATH=/app/src \
    PATH="/app/.venv/bin:$PATH" \
    PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True

WORKDIR /app

# System libs for PaddleOCR (it reads PDFs directly via pypdfium2 — no poppler).
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install uv==0.6.3

# Deps first so this layer caches unless pyproject/lock change (paddle is slow to install).
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Non-root user; paddle writes its model cache to ~/.paddlex.
RUN useradd --create-home --shell /bin/bash appuser \
    && mkdir -p /home/appuser/.paddlex \
    && chown -R appuser:appuser /home/appuser/.paddlex

COPY --chown=appuser:appuser src ./src
COPY --chown=appuser:appuser tests ./tests
COPY --chown=appuser:appuser alembic ./alembic
COPY --chown=appuser:appuser alembic.ini ./alembic.ini

USER appuser

EXPOSE 8000

CMD ["uvicorn", "claims_recovery.main:app", "--host", "0.0.0.0", "--port", "8000"]
