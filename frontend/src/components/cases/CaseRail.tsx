import type { CaseSummary } from "@claims/shared";
import { Badge, Button, Card, ScrollArea, Spinner, cn } from "@claims/ui";
import { caseLabel } from "@/lib/caseLabel";

interface CaseRailProps {
  cases?: CaseSummary[];
  activeCaseId: string | null;
  onSelect: (caseId: string) => void;
  isLoading: boolean;
  compact?: boolean;
}

export function CaseRail({ cases, activeCaseId, onSelect, isLoading, compact = false }: CaseRailProps) {
  return (
    <Card className={cn("flex flex-col overflow-hidden", compact ? "h-full min-h-0" : "min-h-[440px] 2xl:min-h-[560px]")}>
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3.5">
        <p className="text-label">Cases</p>
        <Badge variant="neutral">{cases?.length ?? 0}</Badge>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-2.5">
          {isLoading && <Spinner className="mx-auto my-8 h-5 w-5" />}
          {!isLoading && !cases?.length && (
            <p className="px-2 py-8 text-center text-xs leading-relaxed text-[var(--color-foreground-subtle)]">
              Cases appear when processed documents share evidence.
            </p>
          )}

          {cases?.map((caseItem, index) => {
            const active = caseItem.case_id === activeCaseId;
            const { title, anchor } = caseLabel(caseItem, index);

            return (
              <Button
                key={caseItem.case_id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelect(caseItem.case_id)}
                className={cn(
                  "group/case h-auto w-full flex-col items-stretch gap-2 rounded-lg border px-3 py-2.5 text-left",
                  active
                    ? "border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] text-[var(--color-foreground)] shadow-[inset_2px_0_0_var(--color-primary)]"
                    : "border-transparent text-[var(--color-foreground-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      active ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-light)] group-hover/case:bg-[var(--color-foreground-subtle)]"
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{title}</span>
                  <span className="shrink-0 font-[var(--font-mono)] text-[11px] tabular-nums text-[var(--color-foreground-subtle)]">
                    {caseItem.document_count}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pl-3.5">
                  {anchor ? (
                    <span className="truncate rounded-[3px] bg-[var(--color-surface-raised)] px-1.5 py-0.5 font-[var(--font-mono)] text-[10px] tracking-[0.02em] text-[var(--color-foreground-muted)]">
                      {anchor}
                    </span>
                  ) : (
                    <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--color-foreground-subtle)]">
                      No shared evidence
                    </span>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
