import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[10px] font-semibold leading-4 tracking-[0.08em]",
  {
    variants: {
      variant: {
        high: "border-[rgb(241_100_100_/_0.34)] bg-[rgb(241_100_100_/_0.1)] text-[var(--color-destructive)]",
        medium: "border-[rgb(246_166_35_/_0.34)] bg-[rgb(246_166_35_/_0.1)] text-[var(--color-warning)]",
        low: "border-[rgb(43_203_136_/_0.34)] bg-[rgb(43_203_136_/_0.1)] text-[var(--color-success)]",
        neutral: "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-foreground-muted)]",
        success: "border-[rgb(43_203_136_/_0.34)] bg-[rgb(43_203_136_/_0.1)] text-[var(--color-success)]",
        info: "border-[rgb(68_196_224_/_0.34)] bg-[rgb(68_196_224_/_0.1)] text-[#67D6F2]",
        phosphor: "border-[rgb(162_124_255_/_0.32)] bg-[rgb(162_124_255_/_0.1)] text-[#B79BFF]",
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
