import { cn } from "../lib/utils";

function Spinner({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]",
        className
      )}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
}

export { Spinner };
