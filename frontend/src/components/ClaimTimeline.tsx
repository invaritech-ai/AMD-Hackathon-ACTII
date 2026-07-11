import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@claims/ui";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RunSummary } from "@claims/shared";

interface ClaimTimelineProps {
  runs: RunSummary[];
}

export function ClaimTimeline({ runs }: ClaimTimelineProps) {
  const data = useMemo(() => {
    const sorted = [...runs]
      .filter((r) => r.status === "completed" || r.status === "done")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let cumulative = 0;
    return sorted.map((r) => {
      cumulative += r.total_claim_value ?? 0;
      return {
        date: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: r.total_claim_value ?? 0,
        cumulative: Math.round(cumulative * 100) / 100,
      };
    });
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
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Cumulative Claims Over Time</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={data} margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" stroke="var(--color-foreground-subtle)" fontSize={10} fontFamily="Fira Code, ui-monospace, monospace" tick={{ fill: "var(--color-foreground)" }} />
            <YAxis stroke="var(--color-foreground-subtle)" fontSize={10} fontFamily="Fira Code, ui-monospace, monospace" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "var(--color-foreground)" }} />
            <Tooltip contentStyle={{ backgroundColor: "var(--color-surface-raised)", border: "1px solid var(--color-border)", color: "var(--color-foreground)", fontSize: "12px", fontFamily: "Fira Code, monospace", borderRadius: "8px" }} formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name === "cumulative" ? "Cumulative" : "Claim Value"]} />
            <Area type="monotone" dataKey="cumulative" stroke="#F6A623" strokeWidth={2} fill="#F6A623" fillOpacity={0.12} dot={false} activeDot={{ r: 4, fill: "#F6A623", stroke: "var(--color-background)", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
