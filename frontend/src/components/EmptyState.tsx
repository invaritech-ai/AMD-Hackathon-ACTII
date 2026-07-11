import {
  Activity,
  AlertTriangle,
  FileText,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { Button, cn } from "@claims/ui";

type EmptyStateIcon = "pipeline" | "discrepancies" | "claims" | "ledger";

const emptyStateIcons: Record<EmptyStateIcon, LucideIcon> = {
  pipeline: Activity,
  discrepancies: AlertTriangle,
  claims: FileText,
  ledger: BarChart3,
};

const emptyStateIconColor: Record<EmptyStateIcon, string> = {
  pipeline: "text-[var(--color-primary)]",
  discrepancies: "text-[var(--color-warning)]",
  claims: "text-[var(--color-accent)]",
  ledger: "text-[var(--color-success)]",
};

interface EmptyStateProps {
  icon: EmptyStateIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  const Icon = emptyStateIcons[icon];
  const iconColor = emptyStateIconColor[icon];

  return (
    <div
      className={cn(
        "workspace-bezel w-full rounded-xl",
        "flex flex-col items-center justify-center text-center",
        "min-h-[300px] px-8 py-12",
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
        <Icon className={cn("h-6 w-6", iconColor)} />
      </div>
      <h2 className="mb-2 text-base font-semibold text-[var(--color-foreground)]">
        {title}
      </h2>
      {description && (
        <p className="max-w-sm text-[13px] leading-5 text-[var(--color-foreground-muted)]">
          {description}
        </p>
      )}
      {action && (
        <Button type="button" variant="secondary" size="sm" className="mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
