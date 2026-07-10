import { useParams, useNavigate } from "react-router-dom";
import { Copy, Printer } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from "@claims/ui";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useClaims } from "@/hooks/useClaims";

export function ClaimsRoute() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { data: claim, run, isLoading, isError } = useClaims(runId);

  const handleCopy = () => {
    if (claim?.draft_text) navigator.clipboard.writeText(claim.draft_text);
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
          claim ? (
            <>
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4" /> Print
              </Button>
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
          action={{ label: "Retry", onClick: () => window.location.reload() }}
        />
      ) : !claim ? (
        <EmptyState
          icon="claims"
          title="No claim drafted"
          description="This run has not generated a recovery claim."
        />
      ) : (
        <Card>
          <CardHeader>
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
                  <span className="mx-2 text-[var(--color-border)]">|</span>
                  <span>PO {claim.po_number}</span>
                </p>
              </div>
              <Badge
                variant={claim.status === "PAID" ? "success" : claim.status === "SUBMITTED" ? "info" : "neutral"}
              >
                {claim.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border border-[var(--color-border)] p-6 mb-8 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)] mb-1">
                  TOTAL CLAIM AMOUNT
                </p>
                <p className="text-3xl font-[var(--font-mono)] font-semibold text-[var(--color-accent)] tracking-tight">
                  ${claim.total_claim_amount.toFixed(2)}
                </p>
              </div>
            </div>

            {claim.draft_text ? (
              <div className="border border-[var(--color-border)] p-8">
                <pre className="whitespace-pre-wrap font-[var(--font-mono)] text-sm leading-relaxed text-[var(--color-foreground-subtle)]">
                  {claim.draft_text}
                </pre>
              </div>
            ) : (
              run && run.discrepancies.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)]">
                    CLAIM LINE ITEMS
                  </p>
                  {run.discrepancies.map((d, i) => (
                    <div
                      key={i}
                      className="border border-[var(--color-border)] p-5 flex items-start justify-between hover:border-[var(--color-accent)]/20 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <p className="text-sm text-[var(--color-foreground)]/90">{d.item_description}</p>
                        <p className="text-xs text-[var(--color-foreground-subtle)] font-[var(--font-mono)]">
                          {d.discrepancy_type.replace("_", " ")} — Expected ${(d.expected_unit_price ?? 0).toFixed(2)} → Actual ${(d.actual_unit_price ?? 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right space-y-1.5">
                        <Badge variant={d.severity === "HIGH" ? "high" : d.severity === "MEDIUM" ? "medium" : "low"}>
                          {d.severity}
                        </Badge>
                        <p className="text-sm font-[var(--font-mono)] text-[var(--color-destructive)] tracking-wider">
                          +${d.difference_amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
