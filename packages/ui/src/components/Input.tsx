import * as React from "react";
import { cn } from "../lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-foreground)] transition-[background-color,border-color,box-shadow,color] duration-[var(--duration-interaction)] ease-[var(--ease-emphasized)] placeholder:text-[var(--color-foreground-subtle)] hover:border-[var(--color-border-light)] focus-visible:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(246_166_35_/_0.16)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
