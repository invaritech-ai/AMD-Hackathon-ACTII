import type { CaseSummary, ReconciliationResponse } from "@claims/shared";
import { Badge, Button, cn } from "@claims/ui";
import { caseLabel } from "@/lib/caseLabel";

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

  return (
    <div className="mb-4 flex min-h-14 items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-label">Current case</p>
          {label && (
            <span className="font-[var(--font-mono)] text-[10px] tracking-[0.06em] text-[var(--color-foreground-subtle)]">#{label.ref}</span>
          )}
        </div>
        <h2 className="mt-1 truncate text-xl font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">{title}</h2>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
