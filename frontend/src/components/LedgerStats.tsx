import { BarChart3, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import { Card, CardContent } from "@claims/ui";
import { cn } from "@claims/ui";

interface LedgerStatsProps {
  totalClaimValue: number;
  totalDiscrepancies: number;
  completedRuns: number;
  totalRuns: number;
}

const stats = [
  {
    key: "claimValue",
    title: "Total Claim Value",
    icon: DollarSign,
    color: "text-[var(--color-accent)]",
    bg: "bg-[rgb(139_92_246_/_0.1)] border-[rgb(139_92_246_/_0.2)]",
    format: (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    value: (p: LedgerStatsProps) => p.totalClaimValue,
  },
  {
    key: "discrepancies",
    title: "Anomalies Found",
    icon: AlertTriangle,
    color: "text-[var(--color-warning)]",
    bg: "bg-[rgb(245_158_11_/_0.1)] border-[rgb(245_158_11_/_0.2)]",
    format: (v: number) => v.toString(),
    value: (p: LedgerStatsProps) => p.totalDiscrepancies,
  },
  {
    key: "completedRuns",
    title: "Invoices Processed",
    icon: TrendingUp,
    color: "text-[var(--color-success)]",
    bg: "bg-[rgb(16_185_129_/_0.1)] border-[rgb(16_185_129_/_0.2)]",
    format: (v: number) => v.toString(),
    value: (p: LedgerStatsProps) => p.completedRuns,
  },
  {
    key: "recoveryRate",
    title: "Recovery Rate",
    icon: BarChart3,
    color: "text-[var(--color-primary)]",
    bg: "bg-[rgb(245_158_11_/_0.1)] border-[rgb(245_158_11_/_0.2)]",
    format: (v: number) => `${v.toFixed(0)}%`,
    value: (p: LedgerStatsProps) => (p.totalRuns > 0 ? (p.completedRuns / p.totalRuns) * 100 : 0),
  },
] as const;

export function LedgerStats({ totalClaimValue, totalDiscrepancies, completedRuns, totalRuns }: LedgerStatsProps) {
  const props = { totalClaimValue, totalDiscrepancies, completedRuns, totalRuns };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const val = stat.value(props);
        return (
          <Card key={stat.key}>
            <CardContent className="pt-8">
              <div className="flex items-center gap-4">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-full border", stat.bg)}>
                  <Icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div>
                  <p className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)]">
                    {stat.title}
                  </p>
                  <p className="text-xl font-[var(--font-mono)] font-medium text-[var(--color-foreground)] tracking-tight">
                    {stat.format(val)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
