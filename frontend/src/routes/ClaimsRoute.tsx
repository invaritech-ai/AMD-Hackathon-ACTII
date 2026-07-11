import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Copy } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

function formatAmount(value: string | null, currency: string | null) {
  return value === null ? "-" : `${currency ? `${currency} ` : ""}${value}`;
}

export function ClaimsRoute() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const casesQuery = useCases();
  const reconciliation = useCaseReconciliation(caseId ?? null);
  const runReconciliation = useRunReconciliation();

  if (!caseId) return <Navigate to="/graph" replace />;

  const defaultCaseId = casesQuery.data?.[0]?.case_id;
  const caseExists = casesQuery.data?.some((caseItem) => caseItem.case_id === caseId) ?? false;

  if (!casesQuery.isLoading && defaultCaseId && !caseExists) {
    return <Navigate to={caseScopedPath(defaultCaseId, "claims")} replace />;
  }
  if (!casesQuery.isLoading && !defaultCaseId) {
    return <Navigate to="/graph" replace />;
  }

  const response = reconciliation.data;
  const claim = response?.claim;
  const contributingExceptions = (response?.exceptions ?? []).filter((exception) => Number(exception.delta ?? "0") > 0);
  const copyDraft = () => {
    if (claim?.draft_text) void navigator.clipboard.writeText(claim.draft_text);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Case claim"
        label="Recovery claim"
        labelColor="bg-[var(--color-primary)]"
        description={`Case ${caseId}`}
        onBack={() => navigate("/graph")}
        actions={
          <>
            <CaseSelector
              cases={casesQuery.data}
              currentCaseId={caseId}
              page="claims"
              isLoading={casesQuery.isLoading}
            />
            <Button variant="secondary" size="sm" disabled={runReconciliation.isPending} onClick={() => runReconciliation.mutate(caseId)}>
              {runReconciliation.isPending ? "Checking..." : "Reconcile"}
            </Button>
            {claim?.draft_text && (
              <Button variant="secondary" size="sm" onClick={copyDraft}>
                <Copy className="h-4 w-4" /> Copy draft
              </Button>
            )}
          </>
        }
      />

      {reconciliation.isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      ) : reconciliation.isError || !response ? (
        <EmptyState
          icon="claims"
          title="Claim unavailable"
          description="The latest case reconciliation could not be loaded."
          action={{ label: "Retry", onClick: () => void reconciliation.refetch() }}
        />
      ) : !claim ? (
        <EmptyState
          icon="claims"
          title="No claim drafted"
          description={response.summary ?? "Run reconciliation once this case has sufficient supporting evidence."}
          action={{ label: "Run reconciliation", onClick: () => runReconciliation.mutate(caseId) }}
        />
      ) : (
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-[var(--color-border)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-label">Claim {claim.id}</p>
                  <CardTitle className="mt-1">Case {caseId}</CardTitle>
                </div>
                <Badge variant="neutral">{claim.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
              <div className="rounded-xl border border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] p-5">
                <p className="text-label">Total claim amount</p>
                <p className="mt-3 font-[var(--font-mono)] text-3xl font-semibold text-[var(--color-primary)]">
                  {formatAmount(claim.total_amount, claim.currency ?? response.currency)}
                </p>
                <p className="mt-3 text-[12px] text-[var(--color-foreground-muted)]">Claim status: {claim.status}</p>
              </div>
              <div>
                <p className="text-label">Draft letter</p>
                <pre className="workspace-bezel mt-3 max-h-64 overflow-auto rounded-lg p-4 whitespace-pre-wrap font-[var(--font-mono)] text-[13px] leading-6 text-[var(--color-foreground-muted)]">
                  {claim.draft_text ?? "No draft letter was returned."}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-[var(--color-border)]">
              <CardTitle className="text-base">Exceptions contributing to this claim</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {contributingExceptions.length === 0 ? (
                <p className="p-5 text-[13px] text-[var(--color-foreground-muted)]">No recoverable exception rows were returned.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exception</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Check</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recoverable delta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributingExceptions.map((exception) => (
                      <TableRow key={exception.id}>
                        <TableCell className="font-[var(--font-mono)] text-xs">{exception.id}</TableCell>
                        <TableCell className="font-[var(--font-mono)] text-xs">{exception.document_id ?? "-"}</TableCell>
                        <TableCell><Badge variant="neutral">{exception.check_type.replaceAll("_", " ")}</Badge></TableCell>
                        <TableCell className="capitalize">{exception.status}</TableCell>
                        <TableCell className="font-[var(--font-mono)] text-xs text-[var(--color-destructive)]">{formatAmount(exception.delta, exception.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
