# Case Ledger API Design

## Goal

Add a global, case-based recovery ledger for claim-bearing cases. The ledger must support portfolio charts, currency-separated totals, controlled claim lifecycle updates, recovered amounts, and an auditable status history.

This replaces the removed run-based ledger contract. It does not add frontend code, authentication, payment integrations, or multiple claims per case.

## Scope

- One active claim and ledger row per case.
- Only cases with a generated recovery claim appear in the ledger.
- Portfolio aggregates are separated by currency and are never converted or combined.
- Current state is computed from `cases`, `claims`, `exceptions`, and status events; there is no duplicate ledger table.

## Claim Lifecycle

The supported statuses are:

`draft -> submitted -> under_review -> approved -> partially_recovered -> recovered`

`rejected` and `written_off` are terminal alternatives reachable from any non-terminal status. Other transitions must follow the forward sequence. Terminal statuses cannot transition again.

Recovery rules:

- `partially_recovered` requires `0 < recovered_amount < total_amount`.
- `recovered` sets `recovered_amount` to `total_amount` automatically.
- Other transitions retain the existing recovered amount.
- `outstanding_amount` is calculated as `total_amount - recovered_amount`; it is not stored.

## Persistence

Extend `claims` with:

- A uniqueness constraint on `case_id`.
- `recovered_amount NUMERIC(12, 2) NOT NULL DEFAULT 0`.
- The approved status vocabulary, enforced in the service layer.

Add `claim_status_events` with:

- `id`
- `claim_id`, foreign key to `claims.id` with cascade delete
- `from_status`, nullable for the initial event
- `to_status`
- `recovered_amount`
- `note`, nullable
- `created_at`
- `updated_at`

Claim creation records an initial event with `to_status="draft"`. Each status mutation locks the claim row, validates the transition and amount, updates the claim, and inserts one event in the same transaction.

## API Contract

### Read the portfolio ledger

`GET /api/v1/ledger`

Success: `200 OK`

```json
{
  "summaries": [
    {
      "currency": "AUD",
      "claim_count": 4,
      "total_claimed": "12000.00",
      "total_recovered": "5000.00",
      "total_outstanding": "7000.00",
      "status_counts": {
        "draft": 1,
        "submitted": 2,
        "recovered": 1
      }
    }
  ],
  "cases": [
    {
      "case_id": "abc123",
      "claim_id": "def456",
      "title": "Case 01",
      "status": "submitted",
      "currency": "AUD",
      "claim_amount": "2352.00",
      "recovered_amount": "0.00",
      "outstanding_amount": "2352.00",
      "exception_count": 4,
      "created_at": "2026-07-11T10:00:00",
      "updated_at": "2026-07-11T11:00:00",
      "history": []
    }
  ]
}
```

Behavior:

- Empty portfolios return `{"summaries": [], "cases": []}`.
- Summary and case ordering is deterministic: summaries by currency, cases newest-updated first, history oldest-first.
- Decimal values use JSON strings to preserve financial precision.
- `exception_count` counts exceptions attached to the case's latest reconciliation.
- `status_counts` contains only statuses present for that currency.

### Update a case ledger entry

`PATCH /api/v1/cases/{case_id}/ledger`

Request:

```json
{
  "status": "partially_recovered",
  "recovered_amount": "1000.00",
  "note": "Partial credit received"
}
```

Success: `200 OK`, returning the updated case ledger row including history.

Errors:

- `404`: case does not exist or has no generated claim.
- `409`: invalid lifecycle transition, terminal claim, or invalid recovery amount for the requested transition.
- `422`: malformed status, decimal, or request body.

The mutation is synchronous and transactional. Repeating the same transition is invalid rather than silently creating duplicate history.

## Reconciliation Interaction

Reconciliation may create or replace a claim only while its current status is `draft`. Once a claim has advanced beyond `draft`, `POST /api/v1/cases/{case_id}/reconcile` returns `409` before deleting or rewriting reconciliation, exception, or claim records. This prevents a recheck from silently changing submitted financial records.

Draft reruns preserve the single-claim invariant by replacing the draft claim and creating a fresh initial draft event with the new claim. Existing draft history is removed with the replaced claim.

## Architecture

- `routers/ledger.py` owns request parsing, response models, and HTTP error mapping.
- `services/ledger.py` owns aggregation, transition validation, row locking, and mutation transactions.
- `schemas/api.py` contains the public ledger request and response models.
- `models/case_graph.py` contains the claim extension and status-event model.
- An additive Alembic migration changes the schema without rebuilding existing tables.
- `main.py` mounts the ledger router.

Route handlers remain thin. Aggregation and lifecycle rules are independently testable service behavior.

## TDD and Verification

Implementation proceeds in strict red-green-refactor cycles:

1. Empty ledger response.
2. Claim-bearing cases only.
3. Currency-separated totals and status counts.
4. Case rows and ordered status history.
5. Valid forward status transition.
6. Rejection of invalid and terminal transitions.
7. Partial and full recovery amount rules.
8. `404` behavior for unknown cases and cases without claims.
9. Non-draft claims block reconciliation reruns without data loss.
10. Migration upgrade verification and the full backend regression suite.

Tests use PostgreSQL through the existing fixtures. Production code is added only after the corresponding test has been observed failing for the expected reason.

## Out of Scope

- Frontend ledger implementation.
- Authentication, authorization, or actor attribution.
- Currency conversion or combined multi-currency totals.
- Multiple or versioned claims per case.
- External claim submission or payment-provider integration.
- Pagination and filtering; they can be added when portfolio size requires them.
