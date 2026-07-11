import { FolderOpen } from "lucide-react";
import type { CaseSummary } from "@claims/shared";
import { Badge, Button, Card, ScrollArea, Spinner, cn } from "@claims/ui";

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
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-4">
        <div>
          <p className="text-label">Case folders</p>
          <p className="mt-1 text-[13px] font-semibold text-[var(--color-foreground)]">Active investigations</p>
        </div>
        <Badge variant="neutral">{cases?.length ?? 0}</Badge>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1.5 p-3">
          {isLoading && <Spinner className="mx-auto my-8 h-5 w-5" />}
          {!isLoading && !cases?.length && (
            <p className="px-2 py-8 text-center text-xs leading-relaxed text-[var(--color-foreground-subtle)]">
              Cases appear when processed documents share evidence.
            </p>
          )}

          {cases?.map((caseItem) => {
            const active = caseItem.case_id === activeCaseId;
            const title = caseItem.title?.trim() || `Case ${caseItem.case_id}`;

            return (
              <Button
                key={caseItem.case_id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelect(caseItem.case_id)}
                className={cn(
                  "h-auto w-full justify-start rounded-lg border px-3 py-3 text-left",
                  active
                    ? "border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] text-[var(--color-foreground)] shadow-[inset_3px_0_0_var(--color-primary),0_8px_20px_rgb(246_166_35_/_0.08)]"
                    : "border-transparent text-[var(--color-foreground-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]"
                )}
              >
                <div className="flex items-start gap-2">
                  <FolderOpen className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{title}</span>
                    <span
                      className={cn(
                        "mt-1 block text-[10px] font-[var(--font-mono)] uppercase tracking-[0.08em]",
                        active ? "text-[var(--color-primary)]" : "text-[var(--color-foreground-subtle)]"
                      )}
                    >
                      {caseItem.document_count} document{caseItem.document_count === 1 ? "" : "s"} / {caseItem.status}
                    </span>
                  </span>
                  <Badge
                    variant="neutral"
                    className={cn(active && "border-[var(--color-primary-border)] bg-[rgb(246_166_35_/_0.1)] text-[var(--color-primary)]")}
                  >
                    {caseItem.document_count}
                  </Badge>
                </div>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
