FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DATABASE_URL=sqlite+aiosqlite:///./data/wiki.db \
    SYNC_DATABASE_URL=sqlite:///./data/wiki.db \
    EMBEDDING_PROVIDER_ORDER=gemini

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-docker.txt .
RUN pip install --no-cache-dir -r requirements-docker.txt

COPY . .
RUN mkdir -p /app/data

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

ENTRYPOINT ["python", "docker_entrypoint.py"]
