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
        title="Anomaly Analysis"
        label="Discrepancies"
        labelColor="bg-[var(--color-warning)]"
        description={
          run
            ? `${run.invoice_number} — ${run.supplier_name}`
            : "Review invoice discrepancies and overcharges."
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
          description="Upload an invoice and run the recovery pipeline to detect discrepancies and pricing anomalies."
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
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="space-y-3 pt-6">
                <p className="text-[10px] font-[var(--font-mono)] tracking-[0.18em] text-[var(--color-foreground-subtle)] uppercase">
                  Flagged lines
                </p>
                <div className="flex items-end justify-between gap-3">
                  <p className="text-3xl font-[var(--font-mono)] font-semibold tracking-tight text-[var(--color-foreground)]">
                    {discrepancies.length}
                  </p>
                  <Badge variant="neutral">Run scope</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 pt-6">
                <p className="text-[10px] font-[var(--font-mono)] tracking-[0.18em] text-[var(--color-foreground-subtle)] uppercase">
                  Total exposure
                </p>
                <div className="flex items-end justify-between gap-3">
                  <p className="text-3xl font-[var(--font-mono)] font-semibold tracking-tight text-[var(--color-destructive)]">
                    +${totalImpact.toFixed(2)}
                  </p>
                  <Badge variant="high">Recovery</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 pt-6">
                <p className="text-[10px] font-[var(--font-mono)] tracking-[0.18em] text-[var(--color-foreground-subtle)] uppercase">
                  Needs review
                </p>
                <div className="flex items-end justify-between gap-3">
                  <p className="text-3xl font-[var(--font-mono)] font-semibold tracking-tight text-[var(--color-foreground)]">
                    {reviewCount}
                  </p>
                  <Badge variant={highSeverityCount > 0 ? "high" : "neutral"}>
                    {highSeverityCount} high severity
                  </Badge>
                </div>
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
