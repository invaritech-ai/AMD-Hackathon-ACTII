import { useMemo, useState } from "react";
import { FileSearch, Search, Trash2, X } from "lucide-react";
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
    <Card className="flex min-h-[620px] flex-col rounded-xl">
      <div className="border-b border-[var(--color-border)] p-4">
        <p className="text-label">Files library</p>
        <p className="mt-0.5 text-sm font-medium text-[var(--color-foreground)]">Every uploaded document</p>

        <div className="mt-3 flex items-stretch rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20">
          <span className="flex items-center pl-3 text-[var(--color-foreground-subtle)]">
            <Search className="h-3.5 w-3.5" />
          </span>
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:border-0 focus-visible:ring-0"
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
              className="h-11 w-11 rounded-l-none rounded-r-lg p-0 text-[var(--color-foreground-subtle)]"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div className="h-11 w-11" aria-hidden="true" />
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Tabs value={type} onValueChange={(value) => onTypeChange(value as DocType | "all")}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
              {documentTypes.map((filter) => (
                <TabsTrigger
                  key={filter}
                  value={filter}
                  className={cn(
                    "h-8 rounded-md px-2.5 text-[10px] font-[var(--font-mono)] tracking-normal",
                    "border border-transparent data-[state=active]:border-[var(--color-border)]",
                    filter === "all"
                      ? "data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-[var(--color-primary-foreground)]"
                      : "data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-foreground)]"
                  )}
                >
                  {filter === "all" ? "All types" : typeLabels[filter]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            type="button"
            variant={unassignedOnly ? "primary" : "secondary"}
            size="sm"
            onClick={() => onUnassignedChange(!unassignedOnly)}
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

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4">
          {isLoading && <Spinner className="mx-auto my-12 h-5 w-5" />}
          {isError && <p className="py-10 text-center text-xs text-[var(--color-destructive)]">The file library could not be loaded.</p>}
          {!isLoading && !isError && documents?.length === 0 && (
            <p className="py-10 text-center text-xs leading-relaxed text-[var(--color-foreground-subtle)]">No files match these filters.</p>
          )}

          {documents?.map((document) => (
            <article key={document.id} className="group border-b border-[var(--color-border)] py-3 last:border-b-0">
              <div className="flex items-start gap-2">
                <FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-foreground-subtle)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-foreground)]" title={document.filename}>
                    {document.filename}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-[var(--font-mono)] uppercase tracking-[0.08em]", typeColors[document.type])}>
                      {typeLabels[document.type]}
                    </span>
                    <Badge variant="neutral" className="whitespace-nowrap">
                      {formatBytes(document.size_bytes)}
                    </Badge>
                    <span className="text-[10px] font-[var(--font-mono)] text-[var(--color-foreground-subtle)]">
                      {formatDate(document.created_at)}
                    </span>
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
                  disabled={deleteDocument.isPending}
                  onClick={() => setPendingDeleteDocument(document)}
                  aria-label={`Permanently remove ${document.filename}`}
                  title="Remove permanently from the library and all cases"
                  className="h-8 w-8 rounded-md p-0 text-[var(--color-foreground-subtle)] hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-[var(--color-border)] px-4 py-3">
        <p className="text-[10px] leading-relaxed text-[var(--color-foreground-subtle)]">
          Attach and detach controls stay unavailable until the curation API ships. Removing a file deletes its source and every case association.
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

