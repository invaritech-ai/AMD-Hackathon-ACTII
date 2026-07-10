import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] font-semibold",
        secondary:
          "bg-transparent border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-light)]",
        ghost:
          "text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)]",
        danger:
          "bg-[rgb(239_68_68_/_0.1)] border border-[rgb(239_68_68_/_0.25)] text-[var(--color-destructive)] hover:bg-[rgb(239_68_68_/_0.15)]",
        link: "text-[var(--color-accent)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs tracking-[0.05em]",
        md: "h-10 px-4 text-sm tracking-[0.05em]",
        lg: "h-12 px-6 text-base tracking-[0.05em]",
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