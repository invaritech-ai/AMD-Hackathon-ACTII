import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@claims/ui";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { CaseSelector } from "@/components/cases/CaseSelector";
import { useCaseReconciliation, useCases, useRunReconciliation } from "@/hooks/useCases";
import { caseScopedPath } from "@/lib/caseRoutes";

function severityVariant(severity: string) {
  return severity.toLowerCase() === "high" ? "high" : severity.toLowerCase() === "medium" ? "medium" : "low";
}

function formatAmount(value: string | null, currency: string | null) {
  return value === null ? "-" : `${currency ? `${currency} ` : ""}${value}`;
}

export function DiscrepanciesRoute() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const casesQuery = useCases();
  const reconciliation = useCaseReconciliation(caseId ?? null);
  const runReconciliation = useRunReconciliation();

  if (!caseId) return <Navigate to="/graph" replace />;

  const defaultCaseId = casesQuery.data?.[0]?.case_id;
  const caseExists = casesQuery.data?.some((caseItem) => caseItem.case_id === caseId) ?? false;

  if (!casesQuery.isLoading && defaultCaseId && !caseExists) {
    return <Navigate to={caseScopedPath(defaultCaseId, "discrepancies")} replace />;
  }
  if (!casesQuery.isLoading && !defaultCaseId) {
    return <Navigate to="/graph" replace />;
  }

  const response = reconciliation.data;
  const exceptions = response?.exceptions ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="Case discrepancies"
        label="Reconciliation"
        labelColor="bg-[var(--color-warning)]"
        description={`Case ${caseId}`}
        onBack={() => navigate("/graph")}
        actions={
          <>
            <CaseSelector
              cases={casesQuery.data}
              currentCaseId={caseId}
              page="discrepancies"
              isLoading={casesQuery.isLoading}
            />
            <Button variant="secondary" size="sm" disabled={runReconciliation.isPending} onClick={() => runReconciliation.mutate(caseId)}>
              {runReconciliation.isPending ? "Checking..." : "Reconcile"}
            </Button>
          </>
        }
      />

      {reconciliation.isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      ) : reconciliation.isError || !response ? (
        <EmptyState
          icon="discrepancies"
          title="Reconciliation unavailable"
          description="The latest case reconciliation could not be loaded."
          action={{ label: "Retry", onClick: () => void reconciliation.refetch() }}
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <Card className={response.status === "exceptions_found" ? "border-[rgb(241_100_100_/_0.3)]" : "border-[rgb(43_203_136_/_0.3)]"}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-label">Reconciliation status</p>
                  <Badge variant={response.status === "exceptions_found" ? "high" : "success"}>{response.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-3 text-[13px] leading-5 text-[var(--color-foreground-muted)]">{response.summary ?? "No reconciliation summary available."}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-label">Total recoverable</p>
                <p className="mt-3 font-[var(--font-mono)] text-2xl font-semibold text-[var(--color-destructive)]">
                  {formatAmount(response.total_recoverable, response.currency)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-label">Exceptions</p>
                <p className="mt-3 font-[var(--font-mono)] text-2xl font-semibold text-[var(--color-foreground)]">{exceptions.length}</p>
              </CardContent>
            </Card>
          </div>

          {exceptions.length === 0 ? (
            <EmptyState icon="discrepancies" title="No exceptions found" description="This case has no recoverable exceptions in its latest reconciliation." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exception</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Check</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Actual deduction</TableHead>
                  <TableHead>Recoverable delta</TableHead>
                  <TableHead>Explanation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions.map((exception) => (
                  <TableRow key={exception.id}>
                    <TableCell className="font-[var(--font-mono)] text-xs">{exception.id}</TableCell>
                    <TableCell className="font-[var(--font-mono)] text-xs">{exception.document_id ?? "-"}</TableCell>
                    <TableCell><Badge variant="neutral">{exception.check_type.replaceAll("_", " ")}</Badge></TableCell>
                    <TableCell className="capitalize">{exception.status}</TableCell>
                    <TableCell><Badge variant={severityVariant(exception.severity)}>{exception.severity}</Badge></TableCell>
                    <TableCell className="font-[var(--font-mono)] text-xs">{formatAmount(exception.expected_value, exception.currency)}</TableCell>
                    <TableCell className="font-[var(--font-mono)] text-xs">{formatAmount(exception.actual_value, exception.currency)}</TableCell>
                    <TableCell className="font-[var(--font-mono)] text-xs text-[var(--color-destructive)]">{formatAmount(exception.delta, exception.currency)}</TableCell>
                    <TableCell className="min-w-72 text-[12px] leading-5 text-[var(--color-foreground-muted)]">{exception.explanation ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </PageContainer>
  );
}
