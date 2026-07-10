import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

interface SlideOverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SlideOverContext = React.createContext<SlideOverContextValue>({ open: false, setOpen: () => {} });

function SlideOver({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const value = React.useMemo(
    () => ({
      open: open ?? internalOpen,
      setOpen: onOpenChange ?? setInternalOpen,
    }),
    [open, internalOpen, onOpenChange]
  );
  return <SlideOverContext.Provider value={value}>{children}</SlideOverContext.Provider>;
}

function useSlideOver() {
  return React.useContext(SlideOverContext);
}

function SlideOverTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("cursor-pointer", className)}>{children}</div>;
}

function SlideOverContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open, setOpen } = useSlideOver();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-[var(--color-background)]/85" onClick={() => setOpen(false)} />
      <div className={cn("fixed right-0 top-0 h-full w-full max-w-xl bg-[var(--color-surface)] border-l border-[var(--color-border)]", className)}>
        <div className="flex items-center justify-between px-8 py-5">
          <button
            onClick={() => setOpen(false)}
            className="ml-auto text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-8" style={{ maxHeight: "calc(100vh - 57px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function SlideOverHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2", className)} {...props} />;
}
function SlideOverTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold tracking-[0.05em] text-[var(--color-foreground)]", className)} {...props} />;
}
function SlideOverDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--color-foreground-subtle)]", className)} {...props} />;
}
function SlideOverFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center space-x-3 px-8 py-5", className)} {...props} />;
}

export { SlideOver, SlideOverTrigger, SlideOverContent, SlideOverHeader, SlideOverTitle, SlideOverDescription, SlideOverFooter, useSlideOver };
