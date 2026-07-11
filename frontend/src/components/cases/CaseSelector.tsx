import { useNavigate } from "react-router-dom";
import type { CaseSummary } from "@claims/shared";
import { caseLabel } from "@/lib/caseLabel";
import { caseScopedPath, type CasePage } from "@/lib/caseRoutes";

interface CaseSelectorProps {
  cases?: CaseSummary[];
  currentCaseId: string;
  isLoading: boolean;
  // URL-scoped pages (discrepancies/claims) navigate on change; the graph page
  // is state-driven, so it passes onSelect instead of a page.
  page?: CasePage;
  onSelect?: (caseId: string) => void;
}

export function CaseSelector({ cases, currentCaseId, page, onSelect, isLoading }: CaseSelectorProps) {
  const navigate = useNavigate();

  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-foreground-subtle)]">
        Case
      </span>
      <select
        aria-label="Select case"
        value={currentCaseId}
        disabled={isLoading || !cases?.length}
        onChange={(event) =>
          onSelect ? onSelect(event.target.value) : page && navigate(caseScopedPath(event.target.value, page))
        }
        className="h-9 min-w-44 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-[12px] font-semibold text-[var(--color-foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgb(246_166_35_/_0.16)] disabled:opacity-50"
      >
        {cases?.map((caseItem, index) => (
          <option key={caseItem.case_id} value={caseItem.case_id}>
            {caseLabel(caseItem, index).title}
          </option>
        ))}
      </select>
    </label>
  );
}
