import { useEffect, useState } from "react";
import type { DocType } from "@claims/shared";
import { PageContainer } from "@/components/PageContainer";
import { CaseGraph } from "@/components/CaseGraph";
import { useCaseGraph, useCaseReconciliation, useCases, useRunReconciliation } from "@/hooks/useCases";
import { useDocuments } from "@/hooks/useDocuments";
import { CaseRail } from "@/components/cases/CaseRail";
import { CaseWorkspaceHeader } from "@/components/cases/CaseWorkspaceHeader";
import { FilesLibrary } from "@/components/cases/FilesLibrary";
import { PageHeader } from "@/components/PageHeader";

export function GraphRoute() {
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
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

  return (
    <PageContainer className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col">
      <PageHeader
        title="Case Command Center"
        label="Cases"
        labelColor="bg-[var(--color-accent)]"
        description="Focus on one investigation at a time, then keep the shared evidence library clean and usable."
      />
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1.55fr)_minmax(0,1fr)] gap-5">
        <div className="grid min-h-0 gap-5 xl:grid-cols-[200px_minmax(0,1fr)]">
          <CaseRail cases={casesQuery.data} activeCaseId={activeCaseId} onSelect={setActiveCaseId} isLoading={casesQuery.isLoading} compact />

        <section className="flex min-w-0 min-h-0 flex-col">
          <CaseWorkspaceHeader
            caseItem={activeCase ?? null}
            index={activeIndex < 0 ? 0 : activeIndex}
            isLoading={casesQuery.isLoading}
            reconciliation={reconciliationQuery.data}
            isReconciling={runReconciliation.isPending}
            onReconcile={activeCaseId ? () => runReconciliation.mutate(activeCaseId) : undefined}
          />
          {casesQuery.isLoading ? (
            <div className="workspace-bezel flex h-full min-h-0 items-center justify-center rounded-xl px-6 text-center">
              <p className="max-w-xs text-[13px] leading-relaxed text-[var(--color-foreground-muted)]">Loading cases...</p>
            </div>
          ) : casesQuery.isError ? (
            <div className="workspace-bezel flex h-full min-h-0 items-center justify-center rounded-xl px-6 text-center">
              <p className="max-w-xs text-[13px] leading-relaxed text-[var(--color-destructive)]">
                Cases could not be loaded.
              </p>
            </div>
          ) : activeCaseId ? (
            <CaseGraph graph={graphQuery.data} isLoading={graphQuery.isLoading} isError={graphQuery.isError} compact />
          ) : (
            <div className="workspace-bezel flex h-full min-h-0 items-center justify-center rounded-xl px-6 text-center">
              <p className="max-w-xs text-[13px] leading-relaxed text-[var(--color-foreground-muted)]">
                Process related documents to create the first evidence case.
              </p>
            </div>
          )}
        </section>

        </div>

        <aside className="min-h-0">
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
            compact
          />
        </aside>
      </div>
    </PageContainer>
  );
}
