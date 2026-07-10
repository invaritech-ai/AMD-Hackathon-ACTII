import { SlideOver, SlideOverContent, Badge, cn } from "@claims/ui";
import { useUIStore } from "@/store/uiStore";
import type { Discrepancy } from "@claims/shared";

function severityVariant(severity: string) {
  return severity === "HIGH" ? "high" : severity === "MEDIUM" ? "medium" : "low";
}

interface DiscrepancyDetailProps {
  discrepancies: Discrepancy[];
}

export function DiscrepancyDetail({ discrepancies }: DiscrepancyDetailProps) {
  const { selectedDiscrepancyId, setSelectedDiscrepancyId } = useUIStore();

  if (!selectedDiscrepancyId) return null;

  const [, idx] = selectedDiscrepancyId.split("-");
  const d = discrepancies[Number(idx)];

  if (!d) return null;

  return (
    <SlideOver open={!!selectedDiscrepancyId} onOpenChange={(open: boolean) => !open && setSelectedDiscrepancyId(null)}>
      <SlideOverContent className="max-w-2xl">
        <div className="space-y-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)]" />
              <p className="text-[9px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)] uppercase">
                Anomaly Detail
              </p>
            </div>
            <h2 className="font-[var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
              {d.item_description}
            </h2>
            <div className="flex gap-2">
              <Badge variant={severityVariant(d.severity)}>{d.severity}</Badge>
              <Badge variant="neutral">{d.discrepancy_type.replace("_", " ")}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="border border-[var(--color-border)] p-5 space-y-2">
              <p className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)]">
                EXPECTED
              </p>
              <p className="text-lg font-[var(--font-mono)] text-[var(--color-foreground)]">
                {(d.expected_quantity ?? 0) > 0 ? `${d.expected_quantity} × $${(d.expected_unit_price ?? 0).toFixed(2)}` : "N/A"}
              </p>
            </div>
            <div className="border border-[var(--color-destructive)]/20 p-5 space-y-2">
              <p className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)]">
                ACTUAL (INVOICE)
              </p>
              <p className="text-lg font-[var(--font-mono)] text-[var(--color-destructive)]">
                {(d.actual_quantity ?? 0) > 0 ? `${d.actual_quantity} × $${(d.actual_unit_price ?? 0).toFixed(2)}` : "N/A"}
              </p>
            </div>
          </div>

          <div className="border border-[var(--color-destructive)]/20 p-6 space-y-2">
            <p className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)]">
              FINANCIAL IMPACT
            </p>
            <p className="text-4xl font-[var(--font-mono)] font-semibold text-[var(--color-destructive)] tracking-tight">
              +${d.difference_amount.toFixed(2)}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)]">
              REFERENCES
            </p>
            <div className="space-y-2 font-[var(--font-mono)] text-xs">
              <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-foreground-subtle)]">Invoice</span>
                <span className="text-[var(--color-foreground)]">{d.invoice_number}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--color-foreground-subtle)]">Purchase Order</span>
                <span className="text-[var(--color-foreground)]">{d.po_number}</span>
              </div>
            </div>
          </div>

          {d.explanation && (
            <div className="border border-[var(--color-accent)]/20 p-6 space-y-3 bg-[var(--color-surface)]/50">
              <p className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-accent)]">
                AI ANALYSIS
              </p>
              <p className="text-sm text-[var(--color-foreground)]/80 leading-relaxed">{d.explanation}</p>
            </div>
          )}
        </div>
      </SlideOverContent>
    </SlideOver>
  );
}
