import { useParams, useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardContent, Skeleton } from "@claims/ui";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useDiscrepancies } from "@/hooks/useDiscrepancies";
import { DiscrepancyTable } from "@/components/DiscrepancyTable";
import { DiscrepancyDetail } from "@/components/DiscrepancyDetail";

export function DiscrepanciesRoute() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { data: discrepancies, run, isLoading, isError, isFetching, refetch } = useDiscrepancies(runId);
  const totalImpact = discrepancies.reduce((sum, discrepancy) => sum + discrepancy.difference_amount, 0);
  const highSeverityCount = discrepancies.filter((discrepancy) => discrepancy.severity === "HIGH").length;
  const reviewCount = discrepancies.filter((discrepancy) => discrepancy.severity !== "LOW").length;

  return (
    <PageContainer>
      <PageHeader
        title="Discrepancy Analysis"
        label="Discrepancies"
        labelColor="bg-[var(--color-warning)]"
        description={
          run
            ? `${run.invoice_number} — ${run.supplier_name}`
            : "Inspect the recovery exposure found in a completed processing run."
        }
        onBack={runId ? () => navigate("/") : undefined}
        actions={
          runId ? (
            <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? "Refreshing..." : "Refresh"}
            </Button>
          ) : undefined
        }
      />

      {!runId ? (
        <EmptyState
          icon="discrepancies"
          title="No pipeline run selected"
          description="Upload and process an invoice through the pipeline to detect discrepancies."
          action={{ label: "Go to Pipeline", onClick: () => navigate("/") }}
        />
      ) : isLoading ? (
        <Card>
          <CardContent className="space-y-3 pt-8">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : isError ? (
        <EmptyState
          icon="discrepancies"
          title="Failed to load discrepancies"
          description="Check that the backend is running, then try again."
          action={{ label: "Retry", onClick: () => void refetch() }}
        />
      ) : discrepancies.length === 0 ? (
        <EmptyState
          icon="discrepancies"
          title="No anomalies detected"
          description="This run completed with no discrepancies."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
            <Card className="border-[rgb(241_100_100_/_0.3)]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-label">Recoverable exposure</p>
                  <Badge variant="high">Priority</Badge>
                </div>
                <p className="mt-3 font-[var(--font-mono)] text-[30px] font-semibold leading-none tracking-[-0.03em] text-[var(--color-destructive)]">
                  ${totalImpact.toFixed(2)}
                </p>
                <p className="mt-2 text-[12px] text-[var(--color-foreground-muted)]">Potential recovery across this run.</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <p className="text-label">Flagged lines</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="font-[var(--font-mono)] text-[28px] font-semibold leading-none text-[var(--color-foreground)]">{discrepancies.length}</p>
                  <Badge variant="neutral">Run scope</Badge>
                </div>
                <p className="mt-2 text-[12px] text-[var(--color-foreground-muted)]">Evidence rows requiring comparison.</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <p className="text-label">Review priority</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="font-[var(--font-mono)] text-[28px] font-semibold leading-none text-[var(--color-foreground)]">{reviewCount}</p>
                  <Badge variant={highSeverityCount > 0 ? "high" : "neutral"}>{highSeverityCount} high</Badge>
                </div>
                <p className="mt-2 text-[12px] text-[var(--color-foreground-muted)]">Medium and high findings to validate.</p>
              </CardContent>
            </Card>
          </div>

          <DiscrepancyTable discrepancies={discrepancies} />
          <DiscrepancyDetail discrepancies={discrepancies} />
        </div>
      )}
    </PageContainer>
  );
}
