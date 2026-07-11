import {
  Badge,
  Button,
  Card,
  CardContent,
  SlideOver,
  SlideOverContent,
  SlideOverDescription,
  SlideOverFooter,
  SlideOverHeader,
  SlideOverTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@claims/ui";
import { useUIStore } from "@/store/uiStore";
import type { Discrepancy } from "@claims/shared";

function severityVariant(severity: string) {
  return severity === "HIGH" ? "high" : severity === "MEDIUM" ? "medium" : "low";
}

function formatMoney(value: number | null | undefined) {
  return `$${(value ?? 0).toFixed(2)}`;
}

function formatQuantityPrice(quantity: number | null | undefined, unitPrice: number | null | undefined) {
  return (quantity ?? 0) > 0 ? `${quantity} × ${formatMoney(unitPrice)}` : "N/A";
}

function typeLabel(value: string) {
  return value.replaceAll("_", " ");
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
        <div className="space-y-6">
          <SlideOverHeader className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)]" />
              <p className="text-[9px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)] uppercase">
                Anomaly Detail
              </p>
            </div>
            <SlideOverTitle className="font-[var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
              {d.item_description}
            </SlideOverTitle>
            <SlideOverDescription className="text-xs font-[var(--font-mono)] text-[var(--color-foreground-subtle)]">
              Invoice {d.invoice_number} · PO {d.po_number}
            </SlideOverDescription>
            <div className="flex flex-wrap gap-2">
              <Badge variant={severityVariant(d.severity)}>{d.severity}</Badge>
              <Badge variant="neutral">{typeLabel(d.discrepancy_type)}</Badge>
            </div>
          </SlideOverHeader>

          <Tabs defaultValue="pricing" className="space-y-4">
            <TabsList className={d.explanation ? "grid w-full grid-cols-3" : "grid w-full grid-cols-2"}>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="references">References</TabsTrigger>
              {d.explanation ? <TabsTrigger value="analysis">Analysis</TabsTrigger> : null}
            </TabsList>

            <TabsContent value="pricing" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="space-y-2 pt-6">
                    <p className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)]">
                      EXPECTED
                    </p>
                    <p className="text-lg font-[var(--font-mono)] text-[var(--color-foreground)]">
                      {formatQuantityPrice(d.expected_quantity, d.expected_unit_price)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-[var(--color-destructive)]/20">
                  <CardContent className="space-y-2 pt-6">
                    <p className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)]">
                      ACTUAL (INVOICE)
                    </p>
                    <p className="text-lg font-[var(--font-mono)] text-[var(--color-destructive)]">
                      {formatQuantityPrice(d.actual_quantity, d.actual_unit_price)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-[var(--color-destructive)]/20">
                <CardContent className="space-y-2 pt-6">
                  <p className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)]">
                    FINANCIAL IMPACT
                  </p>
                  <p className="text-4xl font-[var(--font-mono)] font-semibold tracking-tight text-[var(--color-destructive)]">
                    +{formatMoney(d.difference_amount)}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="references" className="space-y-4">
              <Card>
                <CardContent className="space-y-4 pt-6 font-[var(--font-mono)] text-xs">
                  <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                    <span className="text-[var(--color-foreground-subtle)]">Invoice</span>
                    <span className="text-right text-[var(--color-foreground)]">{d.invoice_number}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                    <span className="text-[var(--color-foreground-subtle)]">Purchase order</span>
                    <span className="text-right text-[var(--color-foreground)]">{d.po_number}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                    <span className="text-[var(--color-foreground-subtle)]">Discrepancy type</span>
                    <span className="text-right text-[var(--color-foreground)]">{typeLabel(d.discrepancy_type)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[var(--color-foreground-subtle)]">Unit delta</span>
                    <span className="text-right text-[var(--color-foreground)]">
                      {formatMoney(d.actual_unit_price)} vs {formatMoney(d.expected_unit_price)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {d.explanation ? (
              <TabsContent value="analysis">
                <Card className="border-[var(--color-accent)]/20 bg-[var(--color-surface)]/50">
                  <CardContent className="space-y-3 pt-6">
                    <p className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-accent)]">
                      Analysis
                    </p>
                    <p className="text-sm leading-relaxed text-[var(--color-foreground)]/80">{d.explanation}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            ) : null}
          </Tabs>

          <SlideOverFooter className="border-t border-[var(--color-border)] pt-4">
            <Button variant="secondary" onClick={() => setSelectedDiscrepancyId(null)}>
              Close
            </Button>
          </SlideOverFooter>
        </div>
      </SlideOverContent>
    </SlideOver>
  );
}
