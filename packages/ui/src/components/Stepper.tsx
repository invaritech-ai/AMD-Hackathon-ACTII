import { Check, X, Loader2, Circle } from "lucide-react";
import { cn } from "../lib/utils";

export interface Step {
  id: number;
  label: string;
}

export interface StepperProps {
  steps: Step[];
  activeStep: number;
  stepStatus: Record<number, "pending" | "processing" | "done" | "error">;
  className?: string;
}

function StepIcon({ status }: { status: StepperProps["stepStatus"][number] }) {
  if (status === "done") return <Check className="h-4 w-4 text-[var(--color-success)]" />;
  if (status === "error") return <X className="h-4 w-4 text-[var(--color-destructive)]" />;
  if (status === "processing") return <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />;
  return <Circle className="h-3 w-3 text-[var(--color-foreground-subtle)]" />;
}

export function Stepper({ steps, activeStep, stepStatus, className }: StepperProps) {
  return (
    <div className={cn("flex items-center gap-0", className)}>
      {steps.map((step, i) => {
        const status = stepStatus[step.id] || "pending";
        const isActive = step.id === activeStep;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200",
                  status === "done" && "bg-[rgb(16_185_129_/_0.1)] border border-[rgb(16_185_129_/_0.3)]",
                  status === "processing" && "bg-[rgb(245_158_11_/_0.1)] border border-[rgb(245_158_11_/_0.3)]",
                  status === "error" && "bg-[rgb(239_68_68_/_0.1)] border border-[rgb(239_68_68_/_0.3)]",
                  status === "pending" && isActive && "bg-[var(--color-surface)] border border-[var(--color-border-light)]",
                  status === "pending" && !isActive && "border border-[var(--color-border)] bg-transparent"
                )}
              >
                <StepIcon status={status} />
              </div>
              <span
                className={cn(
                  "text-[9px] tracking-[0.15em] whitespace-nowrap transition-colors duration-200",
                  status === "done" && "text-[var(--color-success)]",
                  status === "processing" && "text-[var(--color-primary)] font-semibold",
                  status === "error" && "text-[var(--color-destructive)]",
                  status === "pending" && "text-[var(--color-foreground-subtle)]"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-4 mt-[-1.25rem]">
                <div
                  className={cn(
                    "h-[1.5px] transition-all duration-200",
                    status === "done"
                      ? "bg-[var(--color-success)]"
                      : "bg-[var(--color-border)]"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
