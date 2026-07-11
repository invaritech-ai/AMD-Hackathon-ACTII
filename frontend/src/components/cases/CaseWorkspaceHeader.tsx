import { useEffect, useState } from "react";
import type { CaseSummary, ReconciliationResponse } from "@claims/shared";
import { Badge, Button, cn } from "@claims/ui";
import { Link } from "react-router-dom";
import { Check, Pencil, X } from "lucide-react";
import { caseLabel } from "@/lib/caseLabel";
import { useRenameCase } from "@/hooks/useCases";

interface CaseWorkspaceHeaderProps {
  caseItem: CaseSummary | null;
  index: number;
  isLoading?: boolean;
  reconciliation?: ReconciliationResponse;
  onReconcile?: () => void;
  isReconciling?: boolean;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function CaseWorkspaceHeader({ caseItem, index, isLoading, reconciliation, onReconcile, isReconciling = false }: CaseWorkspaceHeaderProps) {
  const label = caseItem ? caseLabel(caseItem, index) : null;
  const title = label?.title ?? (isLoading ? "Loading case" : "Select a case");

  const renameCase = useRenameCase();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  // Drop out of edit mode whenever the selected case changes.
  useEffect(() => setEditing(false), [caseItem?.case_id]);

  const startEdit = () => {
    if (!caseItem) return;
    setDraft(caseItem.title ?? "");
    setEditing(true);
  };

  const save = () => {
    if (!caseItem) return;
    const next = draft.trim();
    setEditing(false);
    if (next === (caseItem.title ?? "")) return; // no-op, incl. clearing an already-derived name
    renameCase.mutate({ caseId: caseItem.case_id, title: next });
  };

  return (
    <div className="mb-4 flex min-h-14 items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-label">Current case</p>
          {label && (
            <span className="font-[var(--font-mono)] text-[10px] tracking-[0.06em] text-[var(--color-foreground-subtle)]">#{label.ref}</span>
          )}
        </div>
        {caseItem && editing ? (
          <div className="mt-1 flex items-center gap-1.5">
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") save();
                if (event.key === "Escape") setEditing(false);
              }}
              placeholder={label?.title}
              aria-label="Case name"
              className="w-full max-w-sm rounded-md border border-[var(--color-primary-border)] bg-[var(--color-surface-raised)] px-2 py-1 text-xl font-semibold tracking-[-0.015em] text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-foreground-subtle)]"
            />
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={save} aria-label="Save case name" className="rounded p-1 text-[var(--color-success)] hover:bg-[var(--color-surface-hover)]">
              <Check className="h-4 w-4" />
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setEditing(false)} aria-label="Cancel rename" className="rounded p-1 text-[var(--color-foreground-subtle)] hover:bg-[var(--color-surface-hover)]">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : caseItem ? (
          <button type="button" onClick={startEdit} title="Rename case" className="group mt-1 flex max-w-full items-center gap-2 text-left">
            <h2 className="truncate text-xl font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">{title}</h2>
            <Pencil className="h-3.5 w-3.5 shrink-0 text-[var(--color-foreground-subtle)] opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ) : (
          <h2 className="mt-1 truncate text-xl font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">{title}</h2>
        )}
        {caseItem ? (
          <p className="mt-1 text-[12px] text-[var(--color-foreground-muted)]">
            {label?.anchor ? (
              <>Linked by <span className="font-[var(--font-mono)] text-[var(--color-foreground)]">{label.anchor}</span> across {plural(caseItem.document_count, "document")}.</>
            ) : (
              <>Scoped evidence graph across {plural(caseItem.document_count, "document")}.</>
            )}
          </p>
        ) : (
          !isLoading && (
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-foreground-subtle)]">
              Select a case to inspect its scoped document graph.
            </p>
          )
        )}
      </div>

      {caseItem && (
        <div className="flex shrink-0 items-center gap-4 pt-0.5">
          <div className="flex items-center gap-4 text-center">
            <div>
              <p className="font-[var(--font-mono)] text-lg font-semibold leading-none tabular-nums text-[var(--color-foreground)]">{caseItem.document_count}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[var(--color-foreground-subtle)]">docs</p>
            </div>
            <div className="h-8 w-px bg-[var(--color-border)]" />
            <div>
              <p className="font-[var(--font-mono)] text-lg font-semibold leading-none tabular-nums text-[var(--color-foreground)]">{caseItem.shared_ids.length}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[var(--color-foreground-subtle)]">shared {caseItem.shared_ids.length === 1 ? "id" : "ids"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2.5 py-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", caseItem.status === "open" ? "bg-[var(--color-success)]" : "bg-[var(--color-foreground-subtle)]")} />
            <span className="text-[11px] font-medium capitalize text-[var(--color-foreground-muted)]">{caseItem.status}</span>
          </div>

          {(reconciliation || onReconcile) && (
            <div className="flex items-center gap-1.5 border-l border-[var(--color-border)] pl-4">
              {reconciliation?.status === "exceptions_found" && (
                <Badge variant="high" className="whitespace-nowrap">
                  {plural(reconciliation.exceptions.length, "exception")}
                </Badge>
              )}
              {reconciliation?.total_recoverable && reconciliation.total_recoverable !== "0" && (
                <Badge variant="medium" className="whitespace-nowrap">
                  {reconciliation.currency ?? ""} {reconciliation.total_recoverable}
                </Badge>
              )}
              {onReconcile && (
                <Button type="button" variant="secondary" size="sm" disabled={isReconciling} onClick={onReconcile}>
                  {isReconciling ? "Checking..." : reconciliation?.status === "exceptions_found" ? "Recheck" : "Reconcile"}
                </Button>
              )}
              <Button asChild type="button" variant="ghost" size="sm">
                <Link to={`/cases/${caseItem.case_id}/discrepancies`}>Exceptions</Link>
              </Button>
              {reconciliation?.claim && (
                <Button asChild type="button" variant="ghost" size="sm">
                  <Link to={`/cases/${caseItem.case_id}/claims`}>Claim</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
