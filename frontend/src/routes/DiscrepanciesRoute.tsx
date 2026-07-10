import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, Skeleton } from "@claims/ui";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useDiscrepancies } from "@/hooks/useDiscrepancies";
import { DiscrepancyTable } from "@/components/DiscrepancyTable";
import { DiscrepancyDetail } from "@/components/DiscrepancyDetail";

export function DiscrepanciesRoute() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { data: discrepancies, run, isLoading, isError } = useDiscrepancies(runId);

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
          action={{ label: "Retry", onClick: () => window.location.reload() }}
        />
      ) : discrepancies.length === 0 ? (
        <EmptyState
          icon="discrepancies"
          title="No anomalies detected"
          description="This run completed with no discrepancies."
        />
      ) : (
        <div className="space-y-8">
          <DiscrepancyTable discrepancies={discrepancies} />
          <DiscrepancyDetail discrepancies={discrepancies} />
        </div>
      )}
    </PageContainer>
  );
}
