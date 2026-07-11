import { useMemo, useState } from "react";
import { FileText, Search, Trash2, X } from "lucide-react";
import type { DocType, DocumentSummary } from "@claims/shared";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
} from "@claims/ui";
import { useDeleteDocument } from "@/hooks/useDocuments";

const typeLabels: Record<DocType, string> = {
  invoice: "Invoice",
  purchase_order: "Purchase order",
  contract: "Contract",
  delivery_docket: "Delivery docket",
  unknown: "Unknown",
};

const typeColors: Record<DocType, string> = {
  invoice: "border-[rgb(246_166_35_/_0.3)] bg-[rgb(246_166_35_/_0.1)] text-[var(--color-warning)]",
  purchase_order: "border-[rgb(106_168_255_/_0.3)] bg-[rgb(106_168_255_/_0.1)] text-[#8CB9FF]",
  contract: "border-[rgb(43_203_136_/_0.3)] bg-[rgb(43_203_136_/_0.1)] text-[var(--color-success)]",
  delivery_docket: "border-[rgb(68_196_224_/_0.3)] bg-[rgb(68_196_224_/_0.1)] text-[#67D6F2]",
  unknown: "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-foreground-muted)]",
};

const filterLabels: Record<DocType | "all", string> = {
  all: "All",
  unknown: "Other",
  invoice: "Invoice",
  purchase_order: "PO",
  contract: "Contract",
  delivery_docket: "Docket",
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

interface FilesLibraryProps {
  documents?: DocumentSummary[];
  isLoading: boolean;
  isError: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  type: DocType | "all";
  onTypeChange: (value: DocType | "all") => void;
  unassignedOnly: boolean;
  onUnassignedChange: (value: boolean) => void;
}

export function FilesLibrary({
  documents,
  isLoading,
  isError,
  search,
  onSearchChange,
  type,
  onTypeChange,
  unassignedOnly,
  onUnassignedChange,
}: FilesLibraryProps) {
  const deleteDocument = useDeleteDocument();
  const [pendingDeleteDocument, setPendingDeleteDocument] = useState<DocumentSummary | null>(null);

  const documentTypes = useMemo(
    () => ["all", "unknown", "invoice", "purchase_order", "contract", "delivery_docket"] as const,
    []
  );

  const handleDelete = () => {
    if (!pendingDeleteDocument) return;
    deleteDocument.mutate(pendingDeleteDocument.id, {
      onSuccess: () => setPendingDeleteDocument(null),
    });
  };

  return (
    <Card className="flex min-h-[440px] flex-col overflow-hidden 2xl:min-h-[560px]">
      <div className="border-b border-[var(--color-border)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-label">Files library</p>
            <p className="mt-1 text-[13px] font-semibold text-[var(--color-foreground)]">Every uploaded document</p>
          </div>
          <Badge variant="neutral">{documents?.length ?? 0}</Badge>
        </div>

        <div className="mt-4 flex items-stretch rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
          <span className="flex items-center pl-3 text-[var(--color-foreground-subtle)]">
            <Search className="h-3.5 w-3.5" />
          </span>
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-9 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:border-0 focus-visible:ring-0"
            placeholder="Search files"
            aria-label="Search files"
          />
          {search ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="h-9 w-9 rounded-l-none rounded-r-md p-0 text-[var(--color-foreground-subtle)]"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div className="h-9 w-9" aria-hidden="true" />
          )}
        </div>

        <div className="mt-4">
          <p className="mb-2 text-label">File type</p>
          <Tabs value={type} onValueChange={(value) => onTypeChange(value as DocType | "all")}>
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-lg bg-[var(--color-surface-raised)] p-1">
              {documentTypes.map((filter) => (
                <TabsTrigger
                  key={filter}
                  value={filter}
                  title={filter === "all" ? "All document types" : typeLabels[filter]}
                  className={cn(
                    "h-7 rounded-[4px] border border-transparent px-1.5 text-[10px] font-medium tracking-[0.02em] text-[var(--color-foreground-muted)]",
                    "data-[state=active]:border-[var(--color-primary-border)] data-[state=active]:bg-[var(--color-primary-soft)] data-[state=active]:text-[var(--color-foreground)]"
                  )}
                >
                  {filterLabels[filter]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onUnassignedChange(!unassignedOnly)}
            className={cn(
              "mt-3 h-8 w-full justify-between rounded-md border px-2.5 text-[11px]",
              unassignedOnly
                ? "border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] text-[var(--color-foreground)]"
                : "border-[var(--color-border)] text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
            )}
          >
            <span>Only unassigned</span>
            <span className={cn("h-1.5 w-1.5 rounded-full", unassignedOnly ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-light)]")} />
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4">
          {isLoading && <Spinner className="mx-auto my-12 h-5 w-5" />}
          {isError && <p className="py-10 text-center text-xs text-[var(--color-destructive)]">The file library could not be loaded.</p>}
          {!isLoading && !isError && documents?.length === 0 && (
            <p className="py-10 text-center text-xs leading-relaxed text-[var(--color-foreground-subtle)]">No files match these filters.</p>
          )}

          {documents?.map((document) => (
            <article key={document.id} className="group border-b border-[var(--color-border)] py-3.5 last:border-b-0">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-foreground-muted)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--color-foreground)]" title={document.filename}>
                    {document.filename}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded-[4px] border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.07em]", typeColors[document.type])}>
                      {typeLabels[document.type]}
                    </span>
                    <span className="text-[11px] text-[var(--color-foreground-subtle)]">{formatBytes(document.size_bytes)}</span>
                    <span className="text-[11px] text-[var(--color-foreground-subtle)]">{formatDate(document.created_at)}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[var(--color-foreground-subtle)]">
                    {document.case_ids.length ? `In ${document.case_ids.length} case${document.case_ids.length === 1 ? "" : "s"}` : "Unassigned"}
                    {document.ids.length ? ` / ${document.ids.length} evidence id${document.ids.length === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={deleteDocument.isPending}
                  onClick={() => setPendingDeleteDocument(document)}
                  aria-label={`Permanently remove ${document.filename}`}
                  title="Remove permanently from the library and all cases"
                  className="h-8 w-8 rounded-md p-0 text-[var(--color-foreground-subtle)] hover:bg-[rgb(241_100_100_/_0.1)] hover:text-[var(--color-destructive)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3">
        <p className="text-[11px] leading-relaxed text-[var(--color-foreground-subtle)]">
          Removing a document deletes its source and every case association.
        </p>
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
            <Button variant="secondary" onClick={() => setPendingDeleteDocument(null)} disabled={deleteDocument.isPending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteDocument.isPending}>
              {deleteDocument.isPending ? "Removing..." : "Remove permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
