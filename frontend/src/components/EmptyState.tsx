import {
  Activity,
  AlertTriangle,
  FileText,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@claims/ui";

export type EmptyStateIcon = "pipeline" | "discrepancies" | "claims" | "ledger";

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
        "w-full border border-dashed border-[var(--color-border)] rounded-lg",
        "flex flex-col items-center justify-center text-center",
        "px-8 py-20 min-h-[320px]",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-5">
        <Icon className={cn("h-6 w-6", iconColor)} />
      </div>
      <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-2">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-[var(--color-foreground-subtle)] max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 text-sm text-[var(--color-primary)] hover:underline underline-offset-4 font-medium"
        >
          {action.label} →
        </button>
      )}
    </div>
  );
}
