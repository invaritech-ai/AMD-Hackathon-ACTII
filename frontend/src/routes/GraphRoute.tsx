import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSearch, FolderOpen, Search, Trash2, X } from "lucide-react";
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  cn,
  Spinner,
} from "@claims/ui";
import type { CaseSummary, DocType, DocumentSummary } from "@claims/shared";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { CaseGraph } from "@/components/CaseGraph";
import { api } from "@/lib/api";

const typeLabels: Record<DocType, string> = {
  invoice: "Invoice",
  purchase_order: "Purchase order",
  contract: "Contract",
  delivery_docket: "Delivery docket",
  unknown: "Unknown",
};

const typeColors: Record<DocType, string> = {
  invoice: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  purchase_order: "text-violet-300 bg-violet-500/10 border-violet-500/20",
  contract: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  delivery_docket: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
  unknown: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Unknown date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function formatBytes(value: number) {
  if (!value) return "Seed document";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function CaseRail({
  cases,
  activeCaseId,
  onSelect,
  isLoading,
}: {
  cases?: CaseSummary[];
  activeCaseId: string | null;
  onSelect: (caseId: string) => void;
  isLoading: boolean;
}) {
  return (
    <Card className="rounded-xl p-3 xl:min-h-[620px]">
      <div className="flex items-center justify-between px-1 pb-3">
        <div>
          <p className="text-label">Case folders</p>
          <p className="mt-0.5 text-sm font-medium text-[var(--color-foreground)]">Active investigations</p>
        </div>
        <span className="text-data text-xs text-[var(--color-foreground-subtle)]">{cases?.length ?? 0}</span>
      </div>
      <div className="space-y-1">
        {isLoading && <Spinner className="mx-auto my-8 h-5 w-5" />}
        {!isLoading && !cases?.length && (
          <p className="px-2 py-8 text-center text-xs leading-relaxed text-[var(--color-foreground-subtle)]">
            Cases appear when processed documents share evidence.
          </p>
        )}
        {cases?.map((caseItem) => {
          const active = caseItem.case_id === activeCaseId;
          return (
            <Button
              key={caseItem.case_id}
              type="button"
              variant={active ? "primary" : "ghost"}
              size="sm"
              onClick={() => onSelect(caseItem.case_id)}
              className={cn(
                "h-auto w-full justify-start rounded-lg px-3 py-2.5 text-left",
                active
                  ? "text-[var(--color-primary-foreground)]"
                  : "text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
              )}
            >
              <div className="flex items-start gap-2">
                <FolderOpen className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{caseItem.title?.trim() || `Case ${caseItem.case_id}`}</span>
                  <span className={cn("mt-1 block text-[10px] font-[var(--font-mono)] uppercase tracking-[0.08em]", active ? "text-[var(--color-primary-foreground)]/70" : "text-[var(--color-foreground-subtle)]")}>
                    {caseItem.document_count} document{caseItem.document_count === 1 ? "" : "s"} · {caseItem.status}
                  </span>
                </span>
              </div>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}

function LibraryRow({ document, onDelete, deleting }: { document: DocumentSummary; onDelete: (document: DocumentSummary) => void; deleting: boolean }) {
  return (
    <article className="group border-b border-[var(--color-border)] py-3 last:border-b-0">
      <div className="flex items-start gap-2">
        <FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-foreground-subtle)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--color-foreground)]" title={document.filename}>{document.filename}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-[var(--font-mono)] uppercase tracking-[0.08em]", typeColors[document.type])}>
              {typeLabels[document.type]}
            </span>
            <span className="text-[10px] font-[var(--font-mono)] text-[var(--color-foreground-subtle)]">{formatBytes(document.size_bytes)} · {formatDate(document.created_at)}</span>
          </div>
          <p className="mt-1.5 text-[10px] text-[var(--color-foreground-subtle)]">
            {document.case_ids.length ? `In ${document.case_ids.length} case${document.case_ids.length === 1 ? "" : "s"}` : "Unassigned"}
            {document.ids.length ? ` · ${document.ids.length} evidence id${document.ids.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={deleting}
          onClick={() => onDelete(document)}
          aria-label={`Permanently remove ${document.filename}`}
          title="Remove permanently from the library and all cases"
          className="h-8 w-8 rounded-md p-0 text-[var(--color-foreground-subtle)] hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </article>
  );
}

export function GraphRoute() {
  const queryClient = useQueryClient();
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<DocType | "all">("all");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [pendingDeleteDocument, setPendingDeleteDocument] = useState<DocumentSummary | null>(null);

  const casesQuery = useQuery({ queryKey: ["cases"], queryFn: api.getCases });

  useEffect(() => {
    const cases = casesQuery.data;
    if (!cases?.length) {
      setActiveCaseId(null);
      return;
    }
    setActiveCaseId((current) =>
      current && cases.some((caseItem) => caseItem.case_id === current) ? current : cases[0].case_id
    );
  }, [casesQuery.data]);

  const graphQuery = useQuery({
    queryKey: ["case-graph", activeCaseId],
    queryFn: () => api.getCaseGraph(activeCaseId!),
    enabled: Boolean(activeCaseId),
  });

  const documentsQuery = useQuery({
    queryKey: ["documents", { search, type, unassignedOnly }],
    queryFn: () => api.getDocuments({ query: search || undefined, type: type === "all" ? undefined : type, unassigned: unassignedOnly || undefined }),
  });

  const deleteDocument = useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case-graph"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["graph"] });
    },
  });

  const activeCase = casesQuery.data?.find((caseItem) => caseItem.case_id === activeCaseId);
  const libraryError = documentsQuery.isError ? "The file library could not be loaded." : null;

  const handleDelete = (document: DocumentSummary) => {
    setPendingDeleteDocument(document);
  };

  const confirmDelete = () => {
    if (!pendingDeleteDocument) return;
    deleteDocument.mutate(pendingDeleteDocument.id, {
      onSuccess: () => setPendingDeleteDocument(null),
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Case Command Center"
        label="Cases"
        labelColor="bg-[var(--color-accent)]"
        description="Review one evidence case at a time, then clean the shared upload library."
      />
      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_340px]">
        <CaseRail
          cases={casesQuery.data}
          activeCaseId={activeCaseId}
          onSelect={setActiveCaseId}
          isLoading={casesQuery.isLoading}
        />

        <section className="min-w-0">
          <div className="mb-3 flex min-h-12 items-center justify-between gap-3 px-1">
            <div className="min-w-0">
              <p className="text-label">Current case</p>
              <h2 className="mt-0.5 truncate text-lg text-[var(--color-foreground)]">
                {activeCase?.title?.trim() || (activeCase ? `Case ${activeCase.case_id}` : "Select a case")}
              </h2>
            </div>
            {activeCase && (
              <div className="shrink-0 text-right">
                <p className="text-data text-sm text-[var(--color-foreground)]">{activeCase.document_count} docs</p>
                <p className="text-[10px] font-[var(--font-mono)] text-[var(--color-foreground-subtle)]">{activeCase.shared_ids.length} shared ids</p>
              </div>
            )}
          </div>
          {activeCaseId ? (
            <CaseGraph data={graphQuery.data} isLoading={graphQuery.isLoading} isError={graphQuery.isError} />
          ) : (
            <div className="surface flex min-h-[500px] items-center justify-center rounded-xl px-6 text-center">
              <p className="max-w-xs text-sm leading-relaxed text-[var(--color-foreground-subtle)]">
                Process related documents to create the first evidence case.
              </p>
            </div>
          )}
        </section>

        <Card className="flex min-h-[620px] flex-col rounded-xl">
          <div className="border-b border-[var(--color-border)] p-4">
            <p className="text-label">Files library</p>
            <p className="mt-0.5 text-sm font-medium text-[var(--color-foreground)]">Every uploaded document</p>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-foreground-subtle)]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 rounded-lg pr-10 text-sm"
                style={{ paddingLeft: "2.5rem" }}
                placeholder="Search files"
                aria-label="Search files"
              />
              {search && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md p-0 text-[var(--color-foreground-subtle)]">
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(["all", "unknown", "invoice", "purchase_order", "contract", "delivery_docket"] as const).map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  variant={type === filter ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setType(filter)}
                  className={cn(
                    "h-8 rounded-md px-2.5 text-[10px] font-[var(--font-mono)] tracking-normal",
                    type === filter
                      ? "text-[var(--color-primary-foreground)]"
                      : "text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground)]"
                  )}
                >
                  {filter === "all" ? "All types" : typeLabels[filter]}
                </Button>
              ))}
              <Button
                type="button"
                variant={unassignedOnly ? "primary" : "secondary"}
                size="sm"
                onClick={() => setUnassignedOnly((current) => !current)}
                className={cn(
                  "h-8 rounded-md px-2.5 text-[10px] font-[var(--font-mono)] tracking-normal",
                  unassignedOnly
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent)]/90"
                    : "text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground)]"
                )}
              >
                Unassigned
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            {documentsQuery.isLoading && <Spinner className="mx-auto my-12 h-5 w-5" />}
            {libraryError && <p className="py-10 text-center text-xs text-[var(--color-destructive)]">{libraryError}</p>}
            {!documentsQuery.isLoading && !libraryError && documentsQuery.data?.length === 0 && (
              <p className="py-10 text-center text-xs leading-relaxed text-[var(--color-foreground-subtle)]">No files match these filters.</p>
            )}
            {documentsQuery.data?.map((document) => (
              <LibraryRow
                key={document.id}
                document={document}
                onDelete={handleDelete}
                deleting={deleteDocument.isPending && deleteDocument.variables === document.id}
              />
            ))}
          </div>
          <div className="border-t border-[var(--color-border)] px-4 py-3">
            <p className="text-[10px] leading-relaxed text-[var(--color-foreground-subtle)]">
              Removing a file deletes its source and every case association. Case attach and detach controls activate when the curation API lands.
            </p>
          </div>
        </Card>
      </div>
      <Dialog open={Boolean(pendingDeleteDocument)} onOpenChange={(open) => !open && !deleteDocument.isPending && setPendingDeleteDocument(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this file permanently?</DialogTitle>
            <DialogDescription>
              {pendingDeleteDocument
                ? `“${pendingDeleteDocument.filename}” will be removed from storage and every case. This action cannot be undone.`
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {deleteDocument.isError && <p className="text-sm text-[var(--color-destructive)]">The file could not be removed. Try again.</p>}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPendingDeleteDocument(null)} disabled={deleteDocument.isPending}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleteDocument.isPending}>
              {deleteDocument.isPending ? "Removing..." : "Remove permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
