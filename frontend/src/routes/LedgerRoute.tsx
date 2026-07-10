import { useNavigate } from "react-router-dom";
import { Card, CardContent, Skeleton } from "@claims/ui";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useLedger } from "@/hooks/useLedger";
import { SupplierBreakdown } from "@/components/SupplierBreakdown";
import { ClaimTimeline } from "@/components/ClaimTimeline";
import { LedgerStats } from "@/components/LedgerStats";
import type { RunSummary } from "@claims/shared";

export function LedgerRoute() {
  const { data, isLoading, isError } = useLedger();
  const navigate = useNavigate();
  const runs: RunSummary[] = data ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="Recovery Ledger"
        label="Ledger"
        labelColor="bg-[var(--color-success)]"
        description="Cross-run metrics and recovery performance."
      />

      {isError && (
        <EmptyState
          icon="ledger"
          title="Unable to load ledger"
          description="Make sure the backend server is running at localhost:8000."
          action={{
            label: "Retry",
            onClick: () => window.location.reload(),
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
          <LedgerStats
            totalClaimValue={runs.reduce((sum, r) => sum + (r.total_claim_value || 0), 0)}
            totalDiscrepancies={runs.reduce((sum, r) => sum + (r.total_discrepancies || 0), 0)}
            completedRuns={runs.filter((r) => r.status === "done").length}
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
