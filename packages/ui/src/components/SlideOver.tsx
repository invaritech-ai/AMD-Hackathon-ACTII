import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

const SlideOver = DialogPrimitive.Root;
const SlideOverTrigger = DialogPrimitive.Trigger;

const SlideOverContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ children, className, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-[var(--color-background)]/85" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 right-0 z-[90] flex h-dvh w-[min(760px,calc(100vw-2rem))] max-w-xl flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] outline-none shadow-2xl",
        className
      )}
      {...props}
    >
      <div className="flex h-14 flex-shrink-0 items-center justify-end border-b border-[var(--color-border)] px-6">
        <DialogPrimitive.Close className="text-[var(--color-foreground-subtle)] transition-colors hover:text-[var(--color-foreground)] focus:outline-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-8">
        {children}
      </div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SlideOverContent.displayName = DialogPrimitive.Content.displayName;

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

export { SlideOver, SlideOverTrigger, SlideOverContent, SlideOverHeader, SlideOverTitle, SlideOverDescription, SlideOverFooter };
