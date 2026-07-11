"""Generate deterministic synthetic reconciliation documents."""

from __future__ import annotations

import json
import random
import tempfile
from decimal import Decimal
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageEnhance, ImageFilter
from reportlab import rl_config
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

rl_config.invariant = True

BASE_DIR = Path(__file__).resolve().parent
SOURCE_DIR = BASE_DIR / "source"
GENERATED_DIR = BASE_DIR / "generated"
MANIFEST_PATH = BASE_DIR / "expected-results.json"


def money(value: object) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def load_cases(source_dir: Path = SOURCE_DIR) -> list[dict]:
    return [json.loads(path.read_text()) for path in sorted(source_dir.glob("*.json"))]


def _check_totals(case: dict, document_name: str) -> None:
    document = case[document_name]
    calculated = sum(
        money(row["quantity"]) * money(row["unit_price"])
        for row in document["line_items"]
    )
    if calculated != money(document["subtotal"]):
        raise ValueError(
            f"{case['case_id']} {document_name} subtotal does not reconcile"
        )
    if money(document["subtotal"]) + money(document["gst"]) != money(
        document["total"]
    ):
        raise ValueError(
            f"{case['case_id']} {document_name} total does not reconcile"
        )
    for row in document["line_items"]:
        expected = money(row["quantity"]) * money(row["unit_price"])
        if expected != money(row["line_total"]):
            raise ValueError(
                f"{case['case_id']} {document_name} line total does not reconcile"
            )


def validate_cases(cases: list[dict]) -> None:
    if [case["case_id"] for case in cases] != ["case-01", "case-02", "case-03"]:
        raise ValueError("expected case-01, case-02, and case-03")

    seen: set[str] = set()
    for case in cases:
        identifiers = [
            case["po"]["number"],
            case["invoice"]["number"],
            case["pod"]["number"],
            case["debit_note"]["number"],
        ]
        if "promo_agreement" in case:
            identifiers.append(case["promo_agreement"]["number"])
        for identifier in identifiers:
            if not identifier or identifier in seen:
                raise ValueError(f"duplicate identifier: {identifier}")
            seen.add(identifier)

        valid_references = set(identifiers)
        for deduction in case["debit_note"]["deductions"]:
            if deduction["reference"] not in valid_references:
                raise ValueError(
                    f"{case['case_id']} deduction reference is outside the case: "
                    f"{deduction['reference']}"
                )

        _check_totals(case, "po")
        _check_totals(case, "invoice")
        deductions = sum(
            money(row["amount"]) for row in case["debit_note"]["deductions"]
        )
        if deductions != money(case["debit_note"]["total_deductions"]):
            raise ValueError(
                f"{case['case_id']} debit note deductions do not reconcile"
            )
        if money(case["debit_note"]["gross_amount"]) - deductions != money(
            case["debit_note"]["net_amount"]
        ):
            raise ValueError(
                f"{case['case_id']} debit note net amount does not reconcile"
            )

        output_count = 5 if "promo_agreement" in case else 4
        if len(case["outputs"]) != output_count:
            raise ValueError(f"{case['case_id']} output count is incorrect")

        if case["case_id"] == "case-01":
            authorised = money(case["invoice"]["total"]) * Decimal(
                str(case["po"]["early_payment_discount_rate"])
            )
            if authorised != money(case["debit_note"]["deductions"][0]["amount"]):
                raise ValueError("case-01 authorised discount does not reconcile")
        elif case["case_id"] == "case-02":
            po_line = case["po"]["line_items"][0]
            pod_line = case["pod"]["line_items"][0]
            deduction = case["debit_note"]["deductions"][0]
            shortage = money(pod_line["dispatched_quantity"]) - money(
                pod_line["received_quantity"]
            )
            legitimate = shortage * money(po_line["unit_price"])
            if money(deduction["amount"]) - legitimate != Decimal("175.00"):
                raise ValueError("case-02 recovery does not reconcile")
        elif case["case_id"] == "case-03":
            by_reason = {
                row["reason"].lower(): money(row["amount"])
                for row in case["debit_note"]["deductions"]
            }
            promo_excess = by_reason["promotional funding"] - money(
                case["promo_agreement"]["funding_cap"]
            )
            if by_reason["shrinkage"] + promo_excess != Decimal("1320.00"):
                raise ValueError("case-03 recovery does not reconcile")


def _identifier_map(case: dict) -> dict[str, str]:
    identifiers = {
        "po_number": case["po"]["number"],
        "invoice_number": case["invoice"]["number"],
        "delivery_note_number": case["pod"]["number"],
        "debit_note_number": case["debit_note"]["number"],
    }
    if "promo_agreement" in case:
        identifiers["promo_agreement_number"] = case["promo_agreement"]["number"]
    return identifiers


def _case_expectation(case: dict) -> dict:
    discrepancies: list[dict[str, str]] = []
    legitimate = Decimal("0.00")
    recoverable = Decimal("0.00")

    if case["case_id"] == "case-01":
        legitimate = money(case["debit_note"]["deductions"][0]["amount"])
    elif case["case_id"] == "case-02":
        po_line = case["po"]["line_items"][0]
        pod_line = case["pod"]["line_items"][0]
        deduction = case["debit_note"]["deductions"][0]
        actual_shortage = money(pod_line["dispatched_quantity"]) - money(
            pod_line["received_quantity"]
        )
        legitimate = actual_shortage * money(po_line["unit_price"])
        recoverable = money(deduction["amount"]) - legitimate
        discrepancies = [
            {"type": "shortage_quantity_overstated", "amount": "125.00"},
            {"type": "deduction_rate_above_po", "amount": "50.00"},
        ]
    elif case["case_id"] == "case-03":
        deductions = {
            row["reason"].lower(): money(row["amount"])
            for row in case["debit_note"]["deductions"]
        }
        shrinkage = deductions["shrinkage"]
        promo_excess = deductions["promotional funding"] - money(
            case["promo_agreement"]["funding_cap"]
        )
        recoverable = shrinkage + promo_excess
        discrepancies = [
            {"type": "shrinkage_prohibited", "amount": f"{shrinkage:.2f}"},
            {"type": "promo_over_cap", "amount": f"{promo_excess:.2f}"},
        ]

    return {
        "case_id": case["case_id"],
        "label": case["label"],
        "supplier": case["supplier"]["name"],
        "document_count": len(case["outputs"]),
        "documents": [
            {"type": kind, "filename": filename}
            for kind, filename in case["outputs"].items()
        ],
        "identifiers": _identifier_map(case),
        "discrepancies": discrepancies,
        "legitimate_deduction": f"{legitimate:.2f}",
        "recoverable_total": f"{recoverable:.2f}",
    }


def build_expected_results(cases: list[dict]) -> dict:
    validate_cases(cases)
    return {
        "currency": "AUD",
        "expected_case_count": 3,
        "cases": [_case_expectation(case) for case in cases],
    }


def write_manifest(cases: list[dict], path: Path = MANIFEST_PATH) -> dict:
    manifest = build_expected_results(cases)
    path.write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


def _styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="DocumentTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#14243B"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Meta",
            parent=styles["BodyText"],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#334155"),
        )
    )
    return styles


def _money(value: object) -> str:
    return f"{money(value):,.2f}"


def _line_table(rows: list[dict], delivery: bool = False) -> Table:
    if delivery:
        data = [["SKU", "Description", "Dispatched", "Received", "UOM"]]
        data += [
            [
                row["sku"],
                row["description"],
                str(row["dispatched_quantity"]),
                str(row["received_quantity"]),
                row["unit"],
            ]
            for row in rows
        ]
        widths = [27 * mm, 78 * mm, 25 * mm, 23 * mm, 17 * mm]
    else:
        data = [["SKU", "Description", "Qty", "UOM", "Unit Price", "Line Total"]]
        data += [
            [
                row["sku"],
                row["description"],
                str(row["quantity"]),
                row["unit"],
                _money(row["unit_price"]),
                _money(row["line_total"]),
            ]
            for row in rows
        ]
        widths = [22 * mm, 66 * mm, 16 * mm, 16 * mm, 25 * mm, 27 * mm]

    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#14243B")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.white, colors.HexColor("#F8FAFC")],
                ),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def _totals_table(document: dict) -> Table:
    data = [
        ["Subtotal", f"AUD {_money(document['subtotal'])}"],
        ["GST", f"AUD {_money(document['gst'])}"],
        ["Total", f"AUD {_money(document['total'])}"],
    ]
    table = Table(data, colWidths=[35 * mm, 40 * mm], hAlign="RIGHT")
    table.setStyle(
        TableStyle(
            [
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("LINEABOVE", (0, -1), (-1, -1), 0.8, colors.HexColor("#14243B")),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def _metadata(text: str, styles) -> Paragraph:
    return Paragraph(text, styles["Meta"])


def document_story(case: dict, kind: str) -> list:
    styles = _styles()
    supplier = case["supplier"]
    retailer = case["retailer"]
    po = case["po"]
    invoice = case["invoice"]
    pod = case["pod"]
    debit = case["debit_note"]
    title = {
        "purchase_order": "PURCHASE ORDER",
        "invoice": "TAX INVOICE",
        "delivery_docket": "PROOF OF DELIVERY",
        "debit_note": "DEBIT NOTE / REMITTANCE ADVICE",
        "promo_agreement": "PROMOTIONAL FUNDING AGREEMENT",
    }[kind]
    story = [
        Paragraph(title, styles["DocumentTitle"]),
        _metadata(
            "SYNTHETIC DEMONSTRATION DOCUMENT - NOT A REAL TRANSACTION", styles
        ),
        Spacer(1, 6 * mm),
    ]

    if kind == "purchase_order":
        discount = Decimal(str(po["early_payment_discount_rate"]))
        terms = (
            f"{int(discount * 100)}% early-payment discount authorised."
            if discount
            else "No early-payment discount is authorised."
        )
        story += [
            _metadata(
                f"<b>Purchase Order:</b> {po['number']}<br/>"
                f"<b>PO Date:</b> {po['date']}<br/>"
                f"<b>Delivery Required:</b> {po['delivery_date']}<br/>"
                f"<b>Buyer:</b> {retailer['name']} (ABN {retailer['abn']})<br/>"
                f"<b>Supplier:</b> {supplier['name']} "
                f"(Vendor {supplier['vendor_number']})",
                styles,
            ),
            Spacer(1, 6 * mm),
            _line_table(po["line_items"]),
            Spacer(1, 5 * mm),
            _totals_table(po),
            Spacer(1, 7 * mm),
            Paragraph(
                f"Terms: {terms} Supply is governed by the Food and Grocery "
                "Code of Conduct.",
                styles["BodyText"],
            ),
        ]
    elif kind == "invoice":
        story += [
            _metadata(
                f"<b>Invoice Number:</b> {invoice['number']}<br/>"
                f"<b>Invoice Date:</b> {invoice['date']}<br/>"
                f"<b>Purchase Order:</b> {po['number']}<br/>"
                f"<b>From:</b> {supplier['name']} (ABN {supplier['abn']})<br/>"
                f"<b>Bill To:</b> {retailer['name']}",
                styles,
            ),
            Spacer(1, 6 * mm),
            _line_table(invoice["line_items"]),
            Spacer(1, 5 * mm),
            _totals_table(invoice),
        ]
    elif kind == "delivery_docket":
        story += [
            _metadata(
                f"<b>Delivery Note:</b> {pod['number']}<br/>"
                f"<b>Delivery Date:</b> {pod['date']}<br/>"
                f"<b>Purchase Order:</b> {po['number']}<br/>"
                f"<b>Invoice Reference:</b> {invoice['number']}<br/>"
                f"<b>Received At:</b> {case['delivery_address']}",
                styles,
            ),
            Spacer(1, 6 * mm),
            _line_table(pod["line_items"], delivery=True),
            Spacer(1, 7 * mm),
            Paragraph(
                f"Received by: {pod['received_by']} - electronic signature recorded.",
                styles["BodyText"],
            ),
        ]
    elif kind == "debit_note":
        deduction_data = [["Claim ID", "Reason", "Reference", "Amount"]] + [
            [
                row["claim_id"],
                row["reason"],
                row["reference"],
                f"AUD {_money(row['amount'])}",
            ]
            for row in debit["deductions"]
        ]
        deductions = Table(
            deduction_data,
            colWidths=[28 * mm, 76 * mm, 38 * mm, 30 * mm],
            repeatRows=1,
        )
        deductions.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#14243B")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                    ("ALIGN", (-1, 1), (-1, -1), "RIGHT"),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        summary = Table(
            [
                ["Gross invoice", f"AUD {_money(debit['gross_amount'])}"],
                ["Total deductions", f"AUD {_money(debit['total_deductions'])}"],
                ["Net amount paid", f"AUD {_money(debit['net_amount'])}"],
            ],
            colWidths=[38 * mm, 38 * mm],
            hAlign="RIGHT",
        )
        summary.setStyle(
            TableStyle(
                [
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                    (
                        "LINEABOVE",
                        (0, -1),
                        (-1, -1),
                        0.8,
                        colors.HexColor("#14243B"),
                    ),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                ]
            )
        )
        story += [
            _metadata(
                f"<b>Debit Note:</b> {debit['number']}<br/>"
                f"<b>Date:</b> {debit['date']}<br/>"
                f"<b>Supplier:</b> {supplier['name']}<br/>"
                f"<b>Invoice:</b> {invoice['number']}<br/>"
                f"<b>Purchase Order:</b> {po['number']}<br/>"
                f"<b>Delivery Note:</b> {pod['number']}",
                styles,
            ),
            Spacer(1, 6 * mm),
            deductions,
            Spacer(1, 5 * mm),
            summary,
        ]
    else:
        promo = case["promo_agreement"]
        story += [
            _metadata(
                f"<b>Agreement:</b> {promo['number']}<br/>"
                f"<b>Retailer:</b> {retailer['name']}<br/>"
                f"<b>Supplier:</b> {supplier['name']}<br/>"
                f"<b>Purchase Order:</b> {po['number']}<br/>"
                f"<b>Promotion Window:</b> {promo['start_date']} to "
                f"{promo['end_date']}<br/>"
                f"<b>Funding Rate:</b> AUD {_money(promo['funding_rate'])} "
                "per unit<br/>"
                f"<b>Maximum Supplier Contribution:</b> "
                f"AUD {_money(promo['funding_cap'])}<br/>"
                "<b>Status:</b> Signed by both parties",
                styles,
            ),
            Spacer(1, 8 * mm),
            Paragraph(
                "Claims exceeding the agreed cap or falling outside the promotion "
                "window are not authorised. Any set-off must remain consistent "
                "with this signed agreement and the Food and Grocery Code of Conduct.",
                styles["BodyText"],
            ),
        ]
    return story


def _footer(canvas, document) -> None:
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(20 * mm, 12 * mm, "Synthetic test fixture - no commercial validity")
    canvas.drawRightString(190 * mm, 12 * mm, f"Page {document.page}")
    canvas.restoreState()


def render_text_pdf(case: dict, kind: str, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(target),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=20 * mm,
        title=f"Synthetic {kind}",
        author="Claims Recovery Demo",
    )
    document.build(
        document_story(case, kind),
        onFirstPage=_footer,
        onLaterPages=_footer,
    )


def extract_pdf_text(path: Path) -> str:
    import pdfplumber

    with pdfplumber.open(path) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def render_scan(source_pdf: Path, target: Path, seed: int) -> None:
    pdf = pdfium.PdfDocument(str(source_pdf))
    try:
        page = pdf[0]
        image = page.render(scale=2.25).to_pil().convert("RGB")
    finally:
        pdf.close()

    rng = random.Random(seed)
    image = ImageEnhance.Contrast(image).enhance(0.96)
    image = ImageEnhance.Brightness(image).enhance(1.01)
    image = image.rotate(
        rng.uniform(-0.55, 0.55),
        resample=Image.Resampling.BICUBIC,
        expand=True,
        fillcolor=(242, 241, 236),
    )
    image = image.filter(ImageFilter.GaussianBlur(radius=0.18))
    pixels = image.load()
    for _ in range(2400):
        x = rng.randrange(image.width)
        y = rng.randrange(image.height)
        shade = rng.randrange(205, 241)
        pixels[x, y] = (shade, shade, shade)

    target.parent.mkdir(parents=True, exist_ok=True)
    suffix = target.suffix.lower()
    if suffix == ".jpg":
        image.save(
            target,
            "JPEG",
            quality=88,
            optimize=False,
            progressive=False,
            dpi=(180, 180),
        )
    elif suffix == ".png":
        image.save(target, "PNG", compress_level=6, dpi=(180, 180))
    elif suffix == ".pdf":
        image.save(target, "PDF", resolution=180.0, quality=90)
    else:
        raise ValueError(f"unsupported scan output: {target}")


def generate_case(case: dict, output_root: Path = GENERATED_DIR) -> list[Path]:
    validate_cases(load_cases())
    case_dir = output_root / case["case_id"]
    case_dir.mkdir(parents=True, exist_ok=True)
    generated: list[Path] = []
    scan_kinds = {
        ("case-02", "delivery_docket"),
        ("case-03", "invoice"),
        ("case-03", "delivery_docket"),
    }

    for index, (kind, filename) in enumerate(case["outputs"].items(), start=1):
        target = case_dir / filename
        if (case["case_id"], kind) in scan_kinds:
            with tempfile.TemporaryDirectory() as temporary:
                source = Path(temporary) / f"{kind}.pdf"
                render_text_pdf(case, kind, source)
                render_scan(
                    source,
                    target,
                    seed=1000 + index + int(case["case_id"][-1]) * 100,
                )
        else:
            render_text_pdf(case, kind, target)
        generated.append(target)
    return generated


def generate_all(
    output_root: Path = GENERATED_DIR,
    manifest_path: Path = MANIFEST_PATH,
) -> list[Path]:
    cases = load_cases()
    validate_cases(cases)
    output_root.mkdir(parents=True, exist_ok=True)

    paths = [path for case in cases for path in generate_case(case, output_root)]
    expected = {path.resolve() for path in paths}
    actual = {path.resolve() for path in output_root.rglob("*") if path.is_file()}
    unexpected = sorted(str(path) for path in actual - expected)
    if unexpected:
        raise ValueError(f"unexpected generated files: {unexpected}")

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    write_manifest(cases, manifest_path)
    return paths


def main() -> None:
    paths = generate_all()
    print(f"Generated {len(paths)} synthetic documents across 3 cases.")


if __name__ == "__main__":
    main()
