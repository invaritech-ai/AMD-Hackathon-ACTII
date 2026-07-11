import { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import type { DocType } from "@claims/shared";
import { Button, SlideOver, SlideOverContent, SlideOverDescription, SlideOverTitle } from "@claims/ui";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { CaseGraph } from "@/components/CaseGraph";
import { CaseSelector } from "@/components/cases/CaseSelector";
import { CaseWorkspaceHeader } from "@/components/cases/CaseWorkspaceHeader";
import { FilesLibrary } from "@/components/cases/FilesLibrary";
import { useCaseGraph, useCaseReconciliation, useCases, useRunReconciliation } from "@/hooks/useCases";
import { useDocuments } from "@/hooks/useDocuments";

const bezel = "workspace-bezel flex h-full min-h-0 items-center justify-center rounded-xl px-6 text-center";

export function GraphRoute() {
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [filesOpen, setFilesOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<DocType | "all">("all");
  const [unassignedOnly, setUnassignedOnly] = useState(false);

  const casesQuery = useCases();

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

  const graphQuery = useCaseGraph(activeCaseId);
  const reconciliationQuery = useCaseReconciliation(activeCaseId);
  const runReconciliation = useRunReconciliation();
  const documentsQuery = useDocuments({
    query: search,
    type: type === "all" ? undefined : type,
    unassigned: unassignedOnly || undefined,
  });

  const activeIndex = casesQuery.data?.findIndex((caseItem) => caseItem.case_id === activeCaseId) ?? -1;
  const activeCase = activeIndex >= 0 ? casesQuery.data?.[activeIndex] : undefined;
  const fileCount = documentsQuery.data?.length ?? 0;

  return (
    <PageContainer className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col">
      <PageHeader
        title="Case Command Center"
        label="Cases"
        labelColor="bg-[var(--color-accent)]"
        actions={
          <>
            <CaseSelector
              cases={casesQuery.data}
              currentCaseId={activeCaseId ?? ""}
              onSelect={setActiveCaseId}
              isLoading={casesQuery.isLoading}
            />
            <Button variant="secondary" size="sm" onClick={() => setFilesOpen(true)}>
              <FolderOpen className="h-4 w-4" />
              Files
              <span className="ml-1 rounded-[4px] bg-[var(--color-surface-hover)] px-1.5 py-0.5 font-[var(--font-mono)] text-[10px] tabular-nums text-[var(--color-foreground-muted)]">
                {fileCount}
              </span>
            </Button>
          </>
        }
      />

      <CaseWorkspaceHeader
        caseItem={activeCase ?? null}
        index={activeIndex < 0 ? 0 : activeIndex}
        isLoading={casesQuery.isLoading}
        reconciliation={reconciliationQuery.data}
        isReconciling={runReconciliation.isPending}
        onReconcile={activeCaseId ? () => runReconciliation.mutate(activeCaseId) : undefined}
      />

      <div className="min-h-0 flex-1">
        {casesQuery.isLoading ? (
          <div className={bezel}>
            <p className="max-w-xs text-[13px] leading-relaxed text-[var(--color-foreground-muted)]">Loading cases...</p>
          </div>
        ) : casesQuery.isError ? (
          <div className={bezel}>
            <p className="max-w-xs text-[13px] leading-relaxed text-[var(--color-destructive)]">Cases could not be loaded.</p>
          </div>
        ) : activeCaseId ? (
          <CaseGraph graph={graphQuery.data} isLoading={graphQuery.isLoading} isError={graphQuery.isError} caseId={activeCaseId} compact />
        ) : (
          <div className={bezel}>
            <p className="max-w-xs text-[13px] leading-relaxed text-[var(--color-foreground-muted)]">
              Process related documents to create the first evidence case.
            </p>
          </div>
        )}
      </div>

      <SlideOver open={filesOpen} onOpenChange={setFilesOpen}>
        <SlideOverContent className="max-w-2xl">
          <SlideOverTitle className="sr-only">Files library</SlideOverTitle>
          <SlideOverDescription className="sr-only">Search, filter, and attach every uploaded document.</SlideOverDescription>
          <FilesLibrary
            documents={documentsQuery.data}
            isLoading={documentsQuery.isLoading}
            isError={documentsQuery.isError}
            search={search}
            onSearchChange={setSearch}
            type={type}
            onTypeChange={setType}
            unassignedOnly={unassignedOnly}
            onUnassignedChange={setUnassignedOnly}
            activeCaseId={activeCaseId}
          />
        </SlideOverContent>
      </SlideOver>
    </PageContainer>
  );
}
