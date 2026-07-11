# Pitch deck slides 2, 4, and 6 update

## Communication job

By the end of these three slides, AMD Developer Hackathon judges should understand that Invaritech finds recoverable Australian retailer deductions by connecting evidence, that the current demo uses Fireworks-hosted open models, and that the same open-model document intelligence can be deployed on self-hosted AMD infrastructure.

## Scope

Edit slides 2, 4, and 6 of `outputs/invaritech-claims-recovery-agent-pitch-v2.pptx`. Preserve all other slides, the existing visual system, typography, spacing, footers, page markers, and imagery. Export a distinct revised copy rather than overwriting `v2`.

## Slide 2 — current deduction patterns

Narrative job: replace generic, partially unsupported discrepancy claims with the three deduction patterns demonstrated by the current Australian supplier-recovery workflow.

Title:

> Retail deductions fail when the evidence does not agree.

Subtitle:

> Invaritech tests every remittance claim against delivery proof, agreed terms, and the Food and Grocery Code.

Three columns:

1. **Unsupported shortages** — “A short-delivery deduction conflicts with proof that the order was received in full.”
2. **Prohibited shrinkage** — “In-store loss is charged back to the supplier even though the Code prohibits it.”
3. **Funding above the cap** — “A promotional deduction exceeds the amount authorised in the signed agreement.”

Accuracy basis: the current triage service implements these verdicts, and current ACCC guidance states that a large grocery business cannot ask a supplier to pay for shrinkage.

## Slide 4 — deployment flexibility

Narrative job: accurately distinguish the current hosted demo from the deployable local architecture without claiming that all current inference already runs locally.

Title:

> Cloud today. Local by design.

Subtitle:

> The demo uses Fireworks-hosted open models. The same model roles can run behind a self-hosted, OpenAI-compatible endpoint on AMD infrastructure.

Left column label and content:

- Label: **CURRENT DEMO · FIREWORKS**
- Heading: “Classify, extract, transcribe, and draft”
- Body: “Fast hosted inference for the hackathon build, using open models selected per document task.”

Right column label and content:

- Label: **SELF-HOSTED · AMD**
- Heading: “Full local document intelligence”
- Body: “Deploy open-weight models on AMD GPUs when privacy, control, or data residency requires it.”

The subtitle or footer-level supporting copy should retain the deterministic boundary: document linking, arithmetic, deduction verdicts, and the ledger remain inspectable application logic.

## Slide 6 — operating model

Narrative job: replace the outdated four-source/five-agent count with a memorable and accurate summary that reinforces deployment flexibility.

Title:

> One evidence model. Two ways to deploy it.

Subtitle:

> The workflow connects more of the supplier record while keeping every recovery decision traceable.

Metrics:

1. **6 source types** — “Invoice, PO, contract, delivery docket, remittance advice, and promo agreement.”
2. **2 deployment modes** — “Fireworks-hosted today or self-hosted on AMD infrastructure.”
3. **1 auditable case** — “Evidence, relationships, verdicts, and claim history in one workspace.”

## Visual and implementation constraints

- Use the existing slides as the sole visual reference.
- Edit inherited text objects in place; do not redesign or add parallel overlays.
- Preserve current font family, sizes, line spacing, alignment, color, and geometry.
- Shorten copy if necessary rather than shrinking text.
- Keep slide numbers and deck-level pacing unchanged.
- Export to `outputs/invaritech-claims-recovery-agent-pitch-v3.pptx`.

## Validation

- Render and inspect all seven slides individually at full size.
- Run overflow and template-fidelity checks.
- Confirm slides 2, 4, and 6 contain the approved copy and all other slide text remains unchanged.
- Confirm no empty inherited placeholders, clipping, unintended overlaps, or title wrapping.

