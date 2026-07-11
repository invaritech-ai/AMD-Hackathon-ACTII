# Coolify Unified Compose Deployment Design

## Goal

Package the complete Claims Recovery Agent into one production Docker Compose stack that Coolify can build from the monorepo and expose through one public application URL.

## Selected topology

The stack will use four services:

1. `web` builds the pnpm monorepo, serves the Vite production bundle with Nginx, and proxies `/api/*` to `api:8000`.
2. `api` runs FastAPI with production Uvicorn settings and is reachable only inside the Compose network.
3. `worker` runs the Procrastinate background worker from the same backend image.
4. `db` runs PostgreSQL 16 with persistent storage.

Only `web` exposes port 80 to Coolify. The API, worker, and database remain private. The API applies Alembic and Procrastinate schemas before Uvicorn starts, and the worker waits for the API health check. Coolify assigns the public domain to `web`; browser requests stay same-origin because Nginx forwards `/api` internally.

## Build artifacts

- Create a root production `docker-compose.yml` as the single Coolify source of truth.
- Create `frontend/Dockerfile` with a pnpm build stage rooted at the monorepo and an Nginx runtime stage.
- Create `frontend/nginx.conf` with SPA fallback, static-asset caching, an application health endpoint, and API proxying.
- Adjust `backend/Dockerfile` so `/app/data/uploads` exists with `appuser` ownership before an empty named volume is mounted.
- Keep `backend/docker-compose.yml` as the local development stack.

## Persistence

- `postgres-data` persists PostgreSQL at `/var/lib/postgresql/data`.
- `uploads-data` is mounted at `/app/data` in both `api` and `worker` so queued jobs can read files written by the API.
- The database URL is internal and generated from a required PostgreSQL password rather than exposed host ports.
- No source directories or host paths are bind-mounted in production.

## Configuration and secrets

Coolify will discover Compose variables and require `FIREWORKS_API_KEY` and `POSTGRES_PASSWORD` before deployment. Model names and Fireworks base URL receive safe defaults. Secrets are runtime-only and are never copied into images.

The production stack will not expose PostgreSQL or FastAPI ports to the host. It will not run Uvicorn with `--reload`, seed or truncate data automatically, or include test configuration.

## Startup and failure behavior

- `db` must pass `pg_isready` before migrations run.
- `api` must apply database schemas and pass its health check before `worker` starts.
- `api` exposes `/health`; `web` exposes `/healthz` without proxying to the API.
- `web` waits for a healthy API before becoming available.
- Every long-running service uses an explicit restart policy.

## Validation

1. Render the Compose file with required placeholder environment variables.
2. Build all local images.
3. Start the stack against fresh named volumes.
4. Verify web health, API health through the Nginx proxy, SPA fallback, and internal-only ports.
5. Upload a safe synthetic document and confirm the worker can access the shared file.
6. Stop and restart the stack and confirm PostgreSQL and uploads persist.
7. Run frontend typecheck/build and scoped non-destructive backend tests.

## Deployment handoff

Coolify should deploy the repository as a Docker Compose application using the root `docker-compose.yml`. Assign the public domain only to `web` on container port 80, populate the required variables in Coolify, and leave all other services without domains or host port mappings.
