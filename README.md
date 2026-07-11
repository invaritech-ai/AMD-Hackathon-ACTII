# AMD Hackathon ACT II

## Invaritech Claims Recovery Agent

An AI-assisted reconciliation workspace that turns invoices, purchase orders, delivery records, remittance advice, and promotional agreements into connected recovery cases.

Built for the **AMD Developer Hackathon ACT II — Unicorn Track**.

## The problem

Finance teams often investigate deductions and invoice discrepancies by manually searching across disconnected documents. Small claims are easy to miss, supporting evidence is slow to assemble, and recovery work becomes uneconomical.

The Claims Recovery Agent gives the team one workflow to ingest evidence, connect related documents, detect exceptions, calculate recoverable value, and track each claim through resolution.

## What it does

- Accepts native PDFs, scanned PDFs, images, spreadsheets, Word documents, and Markdown evidence.
- Classifies and extracts structured fields with AMD Fireworks-hosted models.
- Links documents into cases through shared invoice, purchase order, delivery, and agreement identifiers.
- Reconciles invoice lines against purchase orders and supporting evidence.
- Flags pricing, quantity, delivery, and policy exceptions with an evidence trail.
- Maintains a claim ledger with status history and recovered amounts.
- Presents the full workflow in a React dashboard with graph and case views.

## Workflow

```mermaid
flowchart LR
    A["Upload evidence"] --> B["Classify and extract"]
    B --> C["Link related documents"]
    C --> D["Build recovery cases"]
    D --> E["Reconcile and triage"]
    E --> F["Track claims and recovery"]
```

Document processing runs asynchronously. The API stores each upload, queues background extraction, and updates the case graph as normalized identifiers become available.

## Architecture

| Layer | Role |
| --- | --- |
| React, Vite, TanStack Query | Upload, case workspace, evidence graph, discrepancies, and ledger UI |
| FastAPI | Typed document, case, reconciliation, and ledger endpoints |
| Procrastinate worker | Durable asynchronous document-processing jobs |
| PostgreSQL and SQLAlchemy | Documents, graph links, cases, reconciliations, claims, and history |
| AMD Fireworks AI | Document classification, vision OCR, extraction, and cleanup |
| Deterministic Python services | Linking, verification, reconciliation, triage, and ledger rules |

Model roles are configured independently. The backend can route a role to AMD Fireworks or to an OpenAI-compatible local endpoint such as vLLM, Ollama, or llama.cpp.

## Monorepo structure

```text
.
├── frontend/                 React and Vite application
├── backend/                  FastAPI API, worker, database models, and tests
│   ├── src/claims_recovery/  Application source
│   ├── alembic/              Database migrations
│   └── demo/                 Reproducible demo evidence
├── packages/shared/          Shared TypeScript contracts
├── packages/ui/              Reusable interface components
├── package.json              Root Turborepo commands
└── pnpm-workspace.yaml       Workspace definition
```

## Run locally

### Prerequisites

- Node.js 20 or newer
- pnpm 9.15
- Docker with Docker Compose
- An AMD Fireworks API key

### 1. Install frontend dependencies

```bash
pnpm install
```

### 2. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Set `FIREWORKS_API_KEY` in `backend/.env`. Docker Compose supplies the in-network PostgreSQL connection automatically.

### 3. Start the backend

```bash
cd backend
docker compose up --build
```

The API is available at [http://localhost:8000](http://localhost:8000), with interactive documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

### 4. Start the frontend

In another terminal, from the repository root:

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` requests to the FastAPI service.

## Deploy on Coolify

The root [`docker-compose.yml`](./docker-compose.yml) packages the complete production application:

- `web`: Nginx serving the React build and proxying `/api` to FastAPI
- `api`: private FastAPI service that applies database schemas before startup
- `worker`: private Procrastinate document-processing worker
- `db`: private PostgreSQL 16 database
- Named volumes for PostgreSQL and uploaded documents

Create a **Docker Compose** application in Coolify with:

```text
Repository: AMD-Hackathon-ACTII
Branch: main
Base Directory: /
Docker Compose Location: /docker-compose.yml
```

Set these required runtime variables in Coolify:

```text
POSTGRES_PASSWORD=<long URL-safe alphanumeric password>
FIREWORKS_API_KEY=<your Fireworks API key>
```

Optional model overrides are listed in [`.env.coolify.example`](./.env.coolify.example). Assign the public domain only to the `web` service on container port `80`. Do not assign domains or host ports to `api`, `worker`, or `db`.

The production frontend and API use one origin: Nginx serves the SPA and forwards `/api/*` over the private Compose network. PostgreSQL and uploaded evidence survive deployments in named volumes.

## Demo evidence

The repository includes three deterministic synthetic reconciliation cases under `backend/demo/synthetic-reconciliation/`:

- A clean invoice, purchase order, and proof-of-delivery match.
- A delivery dispute with a defensible recovery exception.
- Invalid deductions supported by scanned and image-based evidence.

Generate or verify the fixtures with:

```bash
cd backend
uv run python demo/synthetic-reconciliation/generate.py
uv run pytest demo/synthetic-reconciliation/test_generate.py
```

The generated documents are synthetic test fixtures and have no commercial validity.

## Validation

Frontend and workspace checks:

```bash
pnpm typecheck
pnpm build
```

The backend test fixture truncates its target database between tests. Run the full backend suite only against a dedicated test database—never the demo database:

```bash
cd backend
DATABASE_URL=postgresql+asyncpg://claims:claims@localhost:5432/claims_test uv run pytest
```

## Technology

TypeScript, React, Vite, Tailwind CSS, TanStack Query, Zustand, React Flow, Recharts, Python 3.12, FastAPI, SQLAlchemy, Alembic, PostgreSQL, Procrastinate, Docker Compose, and AMD Fireworks AI.
