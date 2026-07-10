"""Slice 3 — id linker + case graph checks."""

from claims_recovery.services.linker import build_graph, normalize_id


def _doc(doc_id, dtype, **ids):
    return {"id": doc_id, "type": dtype, "filename": f"{doc_id}.pdf", "ids": ids}


def test_normalize_absorbs_separators_and_case():
    assert normalize_id("INV-2231") == normalize_id("inv 2231") == "INV2231"


def test_shared_id_links_docs_into_one_case():
    # Invoice references PO-8890; the PO carries it as its own number.
    docs = [
        _doc("d1", "invoice", invoice_number="INV-2231", po_number="PO-8890"),
        _doc("d2", "purchase_order", po_number="po 8890"),
    ]
    g = build_graph(docs)
    assert len(g["cases"]) == 1
    assert g["cases"][0]["document_ids"] == ["d1", "d2"]
    assert "PO8890" in g["cases"][0]["shared_ids"]
    assert len(g["edges"]) == 1


def test_unrelated_docs_are_separate_cases():
    docs = [
        _doc("d1", "invoice", invoice_number="INV-1"),
        _doc("d2", "invoice", invoice_number="INV-2"),
    ]
    g = build_graph(docs)
    assert len(g["cases"]) == 2
    assert g["edges"] == []


def test_transitive_chain_is_one_case():
    # PO <- invoice -> delivery docket: two shared ids, still one component.
    docs = [
        _doc("po", "purchase_order", po_number="PO-1"),
        _doc("inv", "invoice", invoice_number="INV-9", po_number="PO-1", delivery_note_number="DN-5"),
        _doc("dn", "delivery_docket", delivery_note_number="dn5"),
    ]
    g = build_graph(docs)
    assert len(g["cases"]) == 1
    assert sorted(g["cases"][0]["document_ids"]) == ["dn", "inv", "po"]
