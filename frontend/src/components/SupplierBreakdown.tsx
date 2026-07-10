import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@claims/ui";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { RunSummary } from "@claims/shared";

interface SupplierBreakdownProps {
  runs: RunSummary[];
}

const BAR_COLORS = ["#F59E0B", "#8B5CF6", "#10B981", "#06B6D4", "#EF4444", "#64748B", "#F97316"];

export function SupplierBreakdown({ runs }: SupplierBreakdownProps) {
  const data = useMemo(() => {
    const supplierMap = new Map<string, number>();
    runs
      .filter((r) => r.status === "completed" || r.status === "done")
      .forEach((r) => {
        const name = r.supplier_name ?? "Unknown";
        supplierMap.set(name, (supplierMap.get(name) || 0) + (r.total_claim_value ?? 0));
      });
    return Array.from(supplierMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [runs]);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-80">
          <p className="text-xs text-[var(--color-foreground-subtle)] font-[var(--font-mono)] tracking-widest">NO DATA</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim Value by Supplier</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
            <XAxis type="number" stroke="var(--color-foreground-subtle)" fontSize={10} fontFamily="Fira Code, ui-monospace, monospace" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" stroke="var(--color-foreground-subtle)" fontSize={11} fontFamily="Fira Sans, ui-sans-serif, sans-serif" width={130} tick={{ fill: "var(--color-foreground)" }} />
            <Tooltip contentStyle={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-foreground)", fontSize: "12px", fontFamily: "Fira Code, monospace", borderRadius: "4px" }} formatter={(value: number) => [`$${value.toFixed(2)}`, "Claim Value"]} cursor={{ fill: "rgb(139 92 246 / 0.06)" }} />
            <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={22}>
              {data.map((_, i) => (<Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
