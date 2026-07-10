import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2.5 py-0.5 text-[10px] font-medium tracking-[0.12em]",
  {
    variants: {
      variant: {
        high: "border-[rgb(239_68_68_/_0.3)] bg-[rgb(239_68_68_/_0.1)] text-[var(--color-destructive)]",
        medium: "border-[rgb(245_158_11_/_0.3)] bg-[rgb(245_158_11_/_0.1)] text-[var(--color-warning)]",
        low: "border-[rgb(16_185_129_/_0.3)] bg-[rgb(16_185_129_/_0.1)] text-[var(--color-success)]",
        neutral: "border-[var(--color-border)] text-[var(--color-foreground-subtle)]",
        success: "border-[rgb(16_185_129_/_0.3)] bg-[rgb(16_185_129_/_0.1)] text-[var(--color-success)]",
        info: "border-[rgb(6_182_212_/_0.3)] bg-[rgb(6_182_212_/_0.1)] text-[var(--color-accent)]",
        phosphor: "border-[rgb(139_92_246_/_0.3)] bg-[rgb(139_92_246_/_0.1)] text-[var(--color-accent)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };