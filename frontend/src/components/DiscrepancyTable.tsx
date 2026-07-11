import { useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, cn } from "@claims/ui";
import { useUIStore } from "@/store/uiStore";
import type { Discrepancy } from "@claims/shared";

function severityVariant(severity: string) {
  return severity === "HIGH" ? "high" : severity === "MEDIUM" ? "medium" : "low";
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    PRICE_MISMATCH: "Price Gap",
    QTY_MISMATCH: "Qty Gap",
    OVERCHARGE: "Overcharge",
    UNDERCHARGE: "Undercharge",
    DUPLICATE: "Duplicate",
    UNAUTHORIZED_CHARGE: "Unauthorized",
  };
  return map[type] ?? type;
}

interface DiscrepancyTableProps {
  discrepancies: Discrepancy[];
}

const dataValueClass = "font-[var(--font-mono)] text-xs text-[var(--color-foreground-subtle)]";
const impactClass = "font-[var(--font-mono)] text-sm text-[var(--color-destructive)] tracking-wider";

export function DiscrepancyTable({ discrepancies }: DiscrepancyTableProps) {
  const [sortKey, setSortKey] = useState<keyof Discrepancy>("difference_amount");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { setSelectedDiscrepancyId } = useUIStore();

  const sorted = [...discrepancies].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    }
    return sortDir === "desc"
      ? String(bVal).localeCompare(String(aVal))
      : String(aVal).localeCompare(String(bVal));
  });

  const toggleSort = (key: keyof Discrepancy) => {
    setSortKey(key);
    setSortDir((d) => (sortKey === key && d === "desc" ? "asc" : "desc"));
  };

  const totalImpact = discrepancies.reduce((sum, d) => sum + d.difference_amount, 0);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4 border-b border-[var(--color-border)] pb-3">
        <div>
          <p className="text-label">Review queue</p>
          <p className="mt-1 text-[13px] text-[var(--color-foreground-muted)]">Select a row to inspect the source comparison.</p>
        </div>
        <Badge variant="high">
          <span className="font-[var(--font-mono)] tracking-wider">+${totalImpact.toFixed(2)}</span>
        </Badge>
      </div>

      <div className="max-h-[calc(100dvh-330px)] overflow-auto rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("expected_unit_price")}>
              Expected {sortKey === "expected_unit_price" ? (sortDir === "desc" ? "↓" : "↑") : ""}
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("actual_unit_price")}>
              Actual {sortKey === "actual_unit_price" ? (sortDir === "desc" ? "↓" : "↑") : ""}
            </TableHead>
            <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("difference_amount")}>
              Impact {sortKey === "difference_amount" ? (sortDir === "desc" ? "↓" : "↑") : ""}
            </TableHead>
            <TableHead className="text-right">Severity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((d, i) => (
            <TableRow
              key={`${d.invoice_number}-${i}`}
              className="cursor-pointer group"
              onClick={() => setSelectedDiscrepancyId(`${d.invoice_number}-${i}`)}
            >
              <TableCell className="font-medium max-w-56 truncate text-sm text-[var(--color-foreground)]">
                {d.item_description}
              </TableCell>
              <TableCell>
                <Badge variant="neutral">{typeLabel(d.discrepancy_type)}</Badge>
              </TableCell>
              <TableCell>
                <span className={cn(dataValueClass, "transition-colors group-hover:text-[var(--color-foreground)]")}>
                  {(d.expected_quantity ?? 0) > 0 ? `${d.expected_quantity} × $${(d.expected_unit_price ?? 0).toFixed(2)}` : "-"}
                </span>
              </TableCell>
              <TableCell>
                <span className={cn(dataValueClass, "transition-colors group-hover:text-[var(--color-foreground)]")}>
                  {(d.actual_quantity ?? 0) > 0 ? `${d.actual_quantity} × $${(d.actual_unit_price ?? 0).toFixed(2)}` : "-"}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span className={impactClass}>
                  +${d.difference_amount.toFixed(2)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={severityVariant(d.severity)}>{d.severity}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </section>
  );
}
