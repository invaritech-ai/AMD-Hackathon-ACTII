import { useParams, useNavigate } from "react-router-dom";
import { Copy, Printer } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
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
import { useClaims } from "@/hooks/useClaims";

function claimStatusVariant(status: string) {
  return status === "PAID" ? "success" : status === "SUBMITTED" ? "info" : "neutral";
}

function severityVariant(severity: string) {
  return severity === "HIGH" ? "high" : severity === "MEDIUM" ? "medium" : "low";
}

function typeLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function ClaimsRoute() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { data: claim, run, isLoading, isError, isFetching, refetch } = useClaims(runId);

  const handleCopy = () => {
    if (claim?.draft_text) void navigator.clipboard.writeText(claim.draft_text);
  };

  const handlePrint = () => window.print();

  return (
    <PageContainer>
      <PageHeader
        title="Recovery Claim"
        label="Claim Document"
        labelColor="bg-[var(--color-accent)]"
        description={
          run
            ? `${run.invoice_number} — ${run.supplier_name}`
            : "Review generated recovery claims."
        }
        onBack={runId ? () => navigate("/") : undefined}
        actions={
          runId ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={isFetching}>
                {isFetching ? "Refreshing..." : "Refresh"}
              </Button>
              {claim ? (
                <>
                  <Button variant="secondary" size="sm" onClick={handleCopy}>
                    <Copy className="h-4 w-4" /> Copy
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4" /> Print
                  </Button>
                </>
              ) : null}
            </>
          ) : undefined
        }
      />

      {!runId ? (
        <EmptyState
          icon="claims"
          title="No pipeline run selected"
          description="Upload an invoice and run the recovery pipeline to generate a claim draft."
          action={{ label: "Go to Pipeline", onClick: () => navigate("/") }}
        />
      ) : isLoading ? (
        <Card>
          <CardContent className="space-y-3 pt-8">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ) : isError ? (
        <EmptyState
          icon="claims"
          title="Failed to load claim"
          description="Check that the backend is running, then try again."
          action={{ label: "Retry", onClick: () => void refetch() }}
        />
      ) : !claim ? (
        <EmptyState
          icon="claims"
          title="No claim drafted"
          description="This run has not generated a recovery claim."
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-[var(--color-border)]">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-accent)]/60 uppercase">
                    {claim.claim_number}
                  </span>
                </div>
                <CardTitle>{claim.invoice_number}</CardTitle>
                <p className="text-xs text-[var(--color-foreground-subtle)] font-[var(--font-mono)]">
                  <span>{claim.claim_date}</span>
                  <span className="mx-2 text-[var(--color-border)]">/</span>
                  <span>PO {claim.po_number}</span>
                </p>
              </div>
              <Badge variant={claimStatusVariant(claim.status)}>{claim.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <Card className="border-[var(--color-primary-border)] bg-[var(--color-primary-soft)]">
                <CardContent className="space-y-2 p-5">
                  <p className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)]">
                    TOTAL CLAIM AMOUNT
                  </p>
                  <p className="text-3xl font-[var(--font-mono)] font-semibold tracking-tight text-[var(--color-primary)]">
                    ${claim.total_claim_amount.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[var(--color-surface-raised)]">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base">Claim metadata</CardTitle>
                  <CardDescription>Recovered against the original invoice record.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 p-5 pt-0 font-[var(--font-mono)] text-xs">
                  <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                    <span className="text-[var(--color-foreground-subtle)]">Claim number</span>
                    <span className="text-right text-[var(--color-foreground)]">{claim.claim_number}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                    <span className="text-[var(--color-foreground-subtle)]">Invoice</span>
                    <span className="text-right text-[var(--color-foreground)]">{claim.invoice_number}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[var(--color-foreground-subtle)]">Purchase order</span>
                    <span className="text-right text-[var(--color-foreground)]">{claim.po_number}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {claim.draft_text ? (
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-[var(--color-border)]">
                  <CardTitle className="text-base">Draft recovery letter</CardTitle>
                  <CardDescription>Generated claim text for supplier outreach.</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="workspace-bezel max-h-[230px] overflow-auto rounded-lg p-4 whitespace-pre-wrap font-[var(--font-mono)] text-[13px] leading-6 text-[var(--color-foreground-muted)]">
                    {claim.draft_text}
                  </pre>
                </CardContent>
              </Card>
            ) : (
              run && run.discrepancies.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader className="border-b border-[var(--color-border)]">
                    <CardTitle className="text-base">Claim line items</CardTitle>
                    <CardDescription>Every discrepancy contributing to this recovery request.</CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-[calc(100dvh-430px)] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Expected</TableHead>
                          <TableHead>Actual</TableHead>
                          <TableHead className="text-right">Impact</TableHead>
                          <TableHead className="text-right">Severity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {run.discrepancies.map((discrepancy, index) => (
                          <TableRow key={`${discrepancy.invoice_number}-${index}`}>
                            <TableCell className="max-w-64 truncate font-medium text-[var(--color-foreground)]">
                              {discrepancy.item_description}
                            </TableCell>
                            <TableCell>
                              <Badge variant="neutral">{typeLabel(discrepancy.discrepancy_type)}</Badge>
                            </TableCell>
                            <TableCell className="font-[var(--font-mono)] text-xs text-[var(--color-foreground-subtle)]">
                              ${(discrepancy.expected_unit_price ?? 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="font-[var(--font-mono)] text-xs text-[var(--color-foreground-subtle)]">
                              ${(discrepancy.actual_unit_price ?? 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-[var(--font-mono)] text-sm text-[var(--color-destructive)]">
                              +${discrepancy.difference_amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={severityVariant(discrepancy.severity)}>{discrepancy.severity}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )
            )}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
