import { useEffect, useState } from "react";
import type { ClaimLedgerStatus, LedgerCase } from "@claims/shared";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  cn,
} from "@claims/ui";
import { useUpdateCaseLedger } from "@/hooks/useLedger";
import { STATUS_LABEL, STATUS_VARIANT, formatMoney, nextStatuses } from "@/lib/claimStatus";

interface ClaimStatusDialogProps {
  ledgerCase: LedgerCase | null;
  onClose: () => void;
}

export function ClaimStatusDialog({ ledgerCase, onClose }: ClaimStatusDialogProps) {
  const update = useUpdateCaseLedger();
  const [target, setTarget] = useState<ClaimLedgerStatus | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  // Reset the form each time a different claim is opened.
  useEffect(() => {
    setTarget(null);
    setAmount("");
    setNote("");
    update.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerCase?.claim_id]);

  const options = ledgerCase ? nextStatuses(ledgerCase.status) : [];
  const claimTotal = ledgerCase ? Number(ledgerCase.claim_amount) : 0;
  const partial = target === "partially_recovered";
  const amountValue = Number(amount);
  const amountValid = !partial || (amount !== "" && amountValue > 0 && amountValue < claimTotal);
  const canSubmit = Boolean(ledgerCase && target && amountValid && !update.isPending);

  const submit = () => {
    if (!ledgerCase || !target) return;
    update.mutate(
      {
        caseId: ledgerCase.case_id,
        status: target,
        recovered_amount: partial ? amountValue : null,
        note: note.trim() || null,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open={Boolean(ledgerCase)} onOpenChange={(open) => !open && !update.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update claim status</DialogTitle>
          <DialogDescription>
            {ledgerCase
              ? `${ledgerCase.title?.trim() || `Case ${ledgerCase.case_id}`} — ${formatMoney(ledgerCase.claim_amount, ledgerCase.currency)} claimed`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {ledgerCase && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[var(--color-foreground-subtle)]">Current</span>
              <Badge variant={STATUS_VARIANT[ledgerCase.status]}>{STATUS_LABEL[ledgerCase.status]}</Badge>
            </div>

            <div className="space-y-2">
              <p className="text-label">Advance to</p>
              <div className="flex flex-wrap gap-2">
                {options.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setTarget(status)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                      target === status
                        ? "border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] text-[var(--color-foreground)]"
                        : "border-[var(--color-border)] text-[var(--color-foreground-muted)] hover:border-[var(--color-border-light)] hover:text-[var(--color-foreground)]"
                    )}
                  >
                    {STATUS_LABEL[status]}
                  </button>
                ))}
              </div>
            </div>

            {partial && (
              <div className="space-y-1.5">
                <p className="text-label">Recovered amount ({ledgerCase.currency})</p>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={claimTotal}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={`0 – ${claimTotal}`}
                  aria-label="Recovered amount"
                />
                {amount !== "" && !amountValid && (
                  <p className="text-[11px] text-[var(--color-destructive)]">
                    Must be greater than 0 and less than {formatMoney(ledgerCase.claim_amount, ledgerCase.currency)}.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-label">Note <span className="font-normal normal-case tracking-normal text-[var(--color-foreground-subtle)]">(optional)</span></p>
              <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reason or reference" aria-label="Note" />
            </div>

            {update.isError && (
              <p className="text-xs text-[var(--color-destructive)]">
                {update.error instanceof Error ? update.error.message : "Update failed."}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={update.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {update.isPending ? "Updating..." : "Update status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
