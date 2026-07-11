# Synthetic Reconciliation Documents Design

**Date:** 2026-07-11
**Status:** Approved for planning

## Goal

Create a reproducible synthetic evidence set for exercising document ingestion,
OCR, graph linking, and future multi-document reconciliation. The set represents
three Australian grocery supplier cases involving Woolworths and uses AUD, GST,
retailer-deduction, and Food and Grocery Code terminology.

This work creates fixtures only. It does not seed the database, upload files,
change reconciliation logic, or add API behavior.

## Output Structure

```text
backend/demo/synthetic-reconciliation/
├── source/
│   ├── case-01-clean.json
│   ├── case-02-delivery-dispute.json
│   └── case-03-invalid-deductions.json
├── generated/
│   ├── case-01/
│   ├── case-02/
│   └── case-03/
├── expected-results.json
└── README.md
```

The source JSON files are canonical. Generated PDFs and images must not contain
values maintained separately from their source case. A small generator reads the
source files, validates them, and writes the upload-ready documents and expected
results manifest.

## Evidence Model

Each case contains four core documents:

1. Purchase order
2. Tax invoice
3. Proof of delivery or delivery docket
4. Debit note or remittance advice containing retailer deductions

Case 3 also contains a promotional funding agreement because its debit note
depends on agreed promotional terms.

Every case uses a distinct supplier and unique PO, invoice, POD, debit-note, and
agreement identifiers. Woolworths remains the common retailer. Documents repeat
the appropriate identifiers so the existing linker can form exactly three
separate case graphs.

## Case Scenarios

### Case 1: Clean Reconciliation

- Supplier: Coastal Dairy Foods Pty Ltd
- The PO, invoice, and POD quantities and prices agree.
- The debit note contains an early-payment discount explicitly authorised by the
  PO terms.
- Files: four text-layer PDFs.
- Expected recoverable amount: AUD 0.00.
- Expected outcome: no contestable discrepancy.

### Case 2: Delivery and Deduction Dispute

- Supplier: Riverina Fresh Produce Pty Ltd
- PO and invoice: 100 cartons at AUD 25.00 each.
- POD: 95 cartons received, establishing a legitimate shortage of 5 cartons.
- Debit note: claims 10 cartons at AUD 30.00 each, totaling AUD 300.00.
- Legitimate deduction: 5 cartons at the agreed AUD 25.00, totaling AUD 125.00.
- Recoverable excess: AUD 175.00.
- Expected findings: claimed shortage exceeds the POD shortage, and the debit
  note rate exceeds the PO rate.
- Files: text-layer PDF PO, invoice, and debit note; scanned JPEG POD.

### Case 3: Invalid Retailer Deductions

- Supplier: Southern Harvest Foods Pty Ltd
- The PO, invoice, and POD quantities and prices agree.
- Debit note deduction 1: AUD 420.00 shrinkage, treated as prohibited.
- Debit note deduction 2: AUD 2,500.00 promotional funding.
- Promotional funding agreement cap: AUD 1,600.00.
- Promotional over-cap recovery: AUD 900.00.
- Total expected recoverable amount: AUD 1,320.00.
- Files: text-layer PDF PO, debit note, and promotional agreement; scanned PDF
  invoice with no text layer; scanned PNG POD.

## Document Generation

The generator uses ReportLab to produce polished A4 business documents with
consistent typography, margins, headers, metadata blocks, line-item tables,
totals, terms, and footers.

Raster documents are derived from the same canonical data. They use modest
rotation, compression, and visual noise to resemble scans without sacrificing
legibility. The Case 3 scanned invoice PDF must contain no extractable text layer
so the backend routes it through vision OCR. Image dimensions must remain large
enough for table text and identifiers to be readable.

The generator is deterministic: running it twice from unchanged source files
produces equivalent document content and the same filenames. Cosmetic scan noise
uses a fixed seed.

## Source Validation

Generation stops with a clear error if any of these invariants fail:

- Document identifiers are missing or collide across cases.
- A document references a PO, invoice, POD, debit note, or agreement outside its
  case.
- Line totals do not equal quantity multiplied by unit price.
- Subtotals, GST, gross totals, deductions, or net amounts do not reconcile.
- Case 2's claimed, legitimate, and recoverable shortage amounts do not reconcile.
- Case 3's promotional excess and total recovery do not reconcile.
- A required document or required cross-link identifier is absent.

## Expected Results Manifest

`expected-results.json` records the ground truth independently of the backend's
current behavior. For each case it includes:

- Case label and supplier
- Expected document filenames and document types
- Identifiers that should form graph edges
- Expected case document count
- Expected discrepancy types and amounts
- Expected legitimate deduction amount
- Expected recoverable total and currency

The manifest deliberately describes the desired multi-document reconciliation,
including behavior not yet implemented by the backend. It can therefore serve as
the contract for later reconciliation-agent tests.

## Verification

The completed artifact set must pass all of the following checks:

1. Parse and validate every source JSON file.
2. Recalculate all line, subtotal, tax, deduction, net-payment, and recovery
   amounts from source values.
3. Extract text from every text-layer PDF and confirm key identifiers and amounts
   are present.
4. Confirm the scanned PDF has no usable text layer and that image files are
   routed to OCR by the existing ingestion code.
5. Render every PDF page to PNG with Poppler.
6. Visually inspect every rendered page and source image for clipping,
   overlapping text, broken tables, unreadable identifiers, and poor contrast.
7. Confirm filenames and manifest entries match the generated directory exactly.

The dataset README documents the intended upload order, file formats, expected
three-case graph, and expected reconciliation result for each case.

## Error Handling

The generator fails before replacing usable output when source validation fails.
Generation errors identify the case, document, and failed invariant. Temporary
rendered pages used for visual inspection remain outside the final fixture
directories and are removed after verification.

## Non-Goals

- Changing document extraction or classification
- Implementing the unified reconciliation orchestrator
- Automatically uploading or seeding the fixtures
- Testing authentication or authorization
- Reproducing real supplier, employee, account, or transaction data

All companies, people, addresses, identifiers, signatures, and transactions in
the generated files are synthetic.
