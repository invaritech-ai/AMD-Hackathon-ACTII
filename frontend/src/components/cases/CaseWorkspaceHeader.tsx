import type { CaseSummary } from "@claims/shared";
import { Badge, cn } from "@claims/ui";

interface CaseWorkspaceHeaderProps {
  caseItem: CaseSummary | null;
  isLoading?: boolean;
}

export function CaseWorkspaceHeader({ caseItem, isLoading }: CaseWorkspaceHeaderProps) {
  const title = caseItem?.title?.trim() || (caseItem ? `Case ${caseItem.case_id}` : isLoading ? "Loading case" : "Select a case");

  return (
    <div className="mb-3 flex min-h-12 items-center justify-between gap-3 px-1">
      <div className="min-w-0">
        <p className="text-label">Current case</p>
        <h2 className="mt-0.5 truncate text-lg text-[var(--color-foreground)]">{title}</h2>
        {!caseItem && !isLoading && (
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-foreground-subtle)]">
            Select a case to inspect its scoped document graph.
          </p>
        )}
      </div>
      {caseItem && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-right">
          <Badge variant="neutral" className={cn("whitespace-nowrap")}>
            {caseItem.document_count} docs
          </Badge>
          <Badge variant="info" className="whitespace-nowrap">
            {caseItem.shared_ids.length} shared ids
          </Badge>
          <Badge variant="neutral" className="whitespace-nowrap">
            {caseItem.status}
          </Badge>
        </div>
      )}
    </div>
  );
}

