# Synthetic Reconciliation Dataset

Thirteen fictional Australian grocery documents across three cases. These files
exercise native PDF extraction, OCR, graph linking, and multi-document
reconciliation. No company, person, address, identifier, signature, or
transaction other than Woolworths' public company name and ABN represents a real
record.

## Generate and verify

From `backend/`:

```bash
uv run python demo/synthetic-reconciliation/generate.py
uv run pytest demo/synthetic-reconciliation/test_generate.py \
  --confcutdir=demo/synthetic-reconciliation -q
```

## Upload order

Upload every file under `generated/` in any order. Identifiers should resolve
them into exactly three cases. Text PDFs follow native extraction; the Case 2
POD JPEG, Case 3 POD PNG, and Case 3 scanned invoice PDF follow vision OCR.

## Expected outcomes

- Case 1 - Coastal Dairy Foods: four documents, authorised AUD 180.00
  early-payment discount, AUD 0.00 recoverable.
- Case 2 - Riverina Fresh Produce: four documents, legitimate five-carton
  shortage worth AUD 125.00, excessive debit note amount of AUD 175.00
  recoverable.
- Case 3 - Southern Harvest Foods: five documents, AUD 420.00 prohibited
  shrinkage plus AUD 900.00 promotional over-cap, AUD 1,320.00 recoverable.

`expected-results.json` is the machine-readable ground truth. It describes the
desired unified reconciliation behavior, including checks the current backend
does not yet implement.
