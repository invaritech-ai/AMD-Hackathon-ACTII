import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-interaction)] ease-[var(--ease-emphasized)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[0_8px_20px_rgb(246_166_35_/_0.16)] hover:bg-[var(--color-primary-hover)] hover:shadow-[0_10px_24px_rgb(246_166_35_/_0.24)]",
        secondary:
          "border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-foreground)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-hover)]",
        ghost:
          "text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)]",
        danger:
          "border border-[rgb(241_100_100_/_0.32)] bg-[rgb(241_100_100_/_0.1)] text-[var(--color-destructive)] hover:bg-[rgb(241_100_100_/_0.16)]",
        link: "text-[var(--color-accent)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[11px] tracking-[0.04em]",
        md: "h-9 px-3.5 text-[13px] tracking-[0.01em]",
        lg: "h-11 px-5 text-sm tracking-[0.01em]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
