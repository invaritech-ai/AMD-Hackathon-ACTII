import { ArrowLeft } from "lucide-react";
import { Button, cn } from "@claims/ui";

interface PageHeaderProps {
  title: string;
  label: string;
  labelColor?: string;
  description?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  label,
  labelColor = "bg-[var(--color-foreground-subtle)]",
  description,
  onBack,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-6 mb-10">
      <div className="flex items-start gap-4 min-w-0">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="mt-1 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", labelColor)} />
            <span className="text-[10px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)] uppercase">
              {label}
            </span>
          </div>
          <h1 className="font-[var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-[var(--color-foreground-subtle)] max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 no-print">{actions}</div>}
    </div>
  );
}
