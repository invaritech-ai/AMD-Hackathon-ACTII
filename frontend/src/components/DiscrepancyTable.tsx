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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)]" />
          <p className="text-xs font-[var(--font-mono)] tracking-[0.15em] text-[var(--color-foreground-subtle)] uppercase">
            {discrepancies.length} Items Flagged
          </p>
        </div>
        <Badge variant="high">
          <span className="font-[var(--font-mono)] tracking-wider">+${totalImpact.toFixed(2)}</span>
        </Badge>
      </div>

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
                <span className={cn(dataValueClass, "group-hover:text-[var(--color-foreground)] transition-colors")}>
                  {d.expected_quantity > 0 ? `${d.expected_quantity} × $${d.expected_unit_price.toFixed(2)}` : "—"}
                </span>
              </TableCell>
              <TableCell>
                <span className={cn(dataValueClass, "group-hover:text-[var(--color-foreground)] transition-colors")}>
                  {d.actual_quantity > 0 ? `${d.actual_quantity} × $${d.actual_unit_price.toFixed(2)}` : "—"}
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
  );
}
