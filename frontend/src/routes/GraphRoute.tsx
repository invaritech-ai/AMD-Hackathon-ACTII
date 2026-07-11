import { useEffect, useState } from "react";
import type { DocType } from "@claims/shared";
import { PageContainer } from "@/components/PageContainer";
import { CaseGraph } from "@/components/CaseGraph";
import { useCaseGraph, useCases } from "@/hooks/useCases";
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
  const documentsQuery = useDocuments({
    query: search,
    type: type === "all" ? undefined : type,
    unassigned: unassignedOnly || undefined,
  });

  const activeCase = casesQuery.data?.find((caseItem) => caseItem.case_id === activeCaseId);

  return (
    <PageContainer>
      <PageHeader
        title="Case Command Center"
        label="Cases"
        labelColor="bg-[var(--color-accent)]"
        description="Review one evidence case at a time, then clean the shared upload library."
      />
      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_340px]">
        <CaseRail cases={casesQuery.data} activeCaseId={activeCaseId} onSelect={setActiveCaseId} isLoading={casesQuery.isLoading} />

        <section className="min-w-0">
          <CaseWorkspaceHeader caseItem={activeCase ?? null} isLoading={casesQuery.isLoading} />
          {casesQuery.isError ? (
            <div className="surface flex min-h-[500px] items-center justify-center rounded-xl px-6 text-center">
              <p className="max-w-xs text-sm leading-relaxed text-[var(--color-destructive)]">
                Cases could not be loaded.
              </p>
            </div>
          ) : activeCaseId ? (
            <CaseGraph graph={graphQuery.data} isLoading={graphQuery.isLoading} isError={graphQuery.isError} />
          ) : (
            <div className="surface flex min-h-[500px] items-center justify-center rounded-xl px-6 text-center">
              <p className="max-w-xs text-sm leading-relaxed text-[var(--color-foreground-subtle)]">
                Process related documents to create the first evidence case.
              </p>
            </div>
          )}
        </section>

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
        />
      </div>
    </PageContainer>
  );
}
