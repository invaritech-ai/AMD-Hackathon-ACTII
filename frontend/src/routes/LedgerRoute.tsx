import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardContent, Skeleton } from "@claims/ui";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useLedger } from "@/hooks/useLedger";
import { SupplierBreakdown } from "@/components/SupplierBreakdown";
import { ClaimTimeline } from "@/components/ClaimTimeline";
import { LedgerStats } from "@/components/LedgerStats";
import type { RunSummary } from "@claims/shared";

export function LedgerRoute() {
  const { data, isLoading, isError, isFetching, refetch } = useLedger();
  const navigate = useNavigate();
  const runs: RunSummary[] = data ?? [];
  const totalClaimValue = runs.reduce((sum, run) => sum + (run.total_claim_value || 0), 0);
  const totalDiscrepancies = runs.reduce((sum, run) => sum + (run.total_discrepancies || 0), 0);
  const completedRuns = runs.filter((run) => run.status === "completed" || run.status === "done").length;
  const supplierTotals = runs.reduce<Record<string, number>>((acc, run) => {
    if (run.status !== "completed" && run.status !== "done") return acc;
    const supplier = run.supplier_name ?? "Unknown";
    acc[supplier] = (acc[supplier] ?? 0) + (run.total_claim_value || 0);
    return acc;
  }, {});
  const topSupplier = Object.entries(supplierTotals).sort((a, b) => b[1] - a[1])[0];

  return (
    <PageContainer>
      <PageHeader
        title="Recovery Ledger"
        label="Ledger"
        labelColor="bg-[var(--color-success)]"
        description="Cross-run metrics and recovery performance."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? "Refreshing..." : "Refresh"}
          </Button>
        }
      />

      {isError && (
        <EmptyState
          icon="ledger"
          title="Unable to load ledger"
          description="Make sure the backend server is running at localhost:8000."
          action={{
            label: "Retry",
            onClick: () => void refetch(),
          }}
        />
      )}

      {!isError && !isLoading && runs.length === 0 && (
        <EmptyState
          icon="ledger"
          title="No recovery data yet"
          description="Upload and process invoices to start tracking recovery metrics."
          action={{
            label: "Go to Pipeline",
            onClick: () => navigate("/"),
          }}
        />
      )}

      {!isError && isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-8">
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-8">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-8">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!isError && !isLoading && runs.length > 0 && (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                  <p className="text-[10px] font-[var(--font-mono)] tracking-[0.18em] text-[var(--color-foreground-subtle)] uppercase">
                    Recovery snapshot
                  </p>
                </div>
                <p className="text-sm text-[var(--color-foreground-subtle)]">
                  {completedRuns} processed invoices have produced ${totalClaimValue.toFixed(2)} in recoverable value across {Object.keys(supplierTotals).length} suppliers.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">{totalDiscrepancies} discrepancies</Badge>
                {topSupplier ? (
                  <Badge variant="neutral">
                    Top supplier: {topSupplier[0]} (${topSupplier[1].toFixed(2)})
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <LedgerStats
            totalClaimValue={totalClaimValue}
            totalDiscrepancies={totalDiscrepancies}
            completedRuns={completedRuns}
            totalRuns={runs.length}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SupplierBreakdown runs={runs} />
            <ClaimTimeline runs={runs} />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
