import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import type { LedgerCase } from "@claims/shared";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ClaimStatusDialog } from "@/components/ClaimStatusDialog";
import { useLedger } from "@/hooks/useLedger";
import { STATUS_LABEL, STATUS_VARIANT, TERMINAL, formatMoney } from "@/lib/claimStatus";

export function LedgerRoute() {
  const { data, isLoading, isError, isFetching, refetch } = useLedger();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<LedgerCase | null>(null);

  const summaries = data?.summaries ?? [];
  const cases = data?.cases ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="Recovery Ledger"
        label="Ledger"
        labelColor="bg-[var(--color-success)]"
        description="Every open claim with its lifecycle status, recovery progress, and outstanding balance."
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
          action={{ label: "Retry", onClick: () => void refetch() }}
        />
      )}

      {!isError && isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-8">
                  <Skeleton className="mb-4 h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!isError && !isLoading && cases.length === 0 && (
        <EmptyState
          icon="ledger"
          title="No claims yet"
          description="Reconcile a case with recoverable exceptions to open a claim in the ledger."
          action={{ label: "Go to Cases", onClick: () => navigate("/graph") }}
        />
      )}

      {!isError && !isLoading && cases.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map((summary) => (
              <Card key={summary.currency}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-label">{summary.currency} exposure</p>
                    <Badge variant="neutral">{summary.claim_count} claim{summary.claim_count === 1 ? "" : "s"}</Badge>
                  </div>
                  <div>
                    <p className="font-[var(--font-mono)] text-2xl font-semibold tabular-nums text-[var(--color-destructive)]">
                      {formatMoney(summary.total_outstanding, summary.currency)}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--color-foreground-subtle)]">outstanding</p>
                  </div>
                  <div className="flex justify-between border-t border-[var(--color-border)] pt-3 text-xs">
                    <span className="text-[var(--color-foreground-subtle)]">
                      Claimed <span className="ml-1 font-[var(--font-mono)] text-[var(--color-foreground)]">{formatMoney(summary.total_claimed, summary.currency)}</span>
                    </span>
                    <span className="text-[var(--color-foreground-subtle)]">
                      Recovered <span className="ml-1 font-[var(--font-mono)] text-[var(--color-success)]">{formatMoney(summary.total_recovered, summary.currency)}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Claimed</TableHead>
                <TableHead className="text-right">Recovered</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Exceptions</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((ledgerCase) => {
                const terminal = TERMINAL.has(ledgerCase.status);
                return (
                  <TableRow key={ledgerCase.claim_id}>
                    <TableCell>
                      <p className="font-medium text-[var(--color-foreground)]">
                        {ledgerCase.title?.trim() || `Case ${ledgerCase.case_id}`}
                      </p>
                      <p className="font-[var(--font-mono)] text-[11px] text-[var(--color-foreground-subtle)]">#{ledgerCase.case_id}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[ledgerCase.status]}>{STATUS_LABEL[ledgerCase.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-[var(--font-mono)] text-xs tabular-nums">{formatMoney(ledgerCase.claim_amount, ledgerCase.currency)}</TableCell>
                    <TableCell className="text-right font-[var(--font-mono)] text-xs tabular-nums text-[var(--color-success)]">{formatMoney(ledgerCase.recovered_amount, ledgerCase.currency)}</TableCell>
                    <TableCell className="text-right font-[var(--font-mono)] text-xs tabular-nums text-[var(--color-destructive)]">{formatMoney(ledgerCase.outstanding_amount, ledgerCase.currency)}</TableCell>
                    <TableCell className="text-right font-[var(--font-mono)] text-xs tabular-nums">{ledgerCase.exception_count}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={terminal}
                        onClick={() => setSelected(ledgerCase)}
                        title={terminal ? "This claim is in a final state" : "Advance claim status"}
                      >
                        {terminal ? "Closed" : "Update"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ClaimStatusDialog ledgerCase={selected} onClose={() => setSelected(null)} />
    </PageContainer>
  );
}
