import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Loader2, X } from "lucide-react";
import { cn } from "@claims/ui";
import { useProcessingQueueStore, type ProcessingStage } from "@/store/processingQueueStore";

const stageDetails: Record<ProcessingStage, { label: string; progress: number; tone: string }> = {
  uploading: { label: "Uploading", progress: 0, tone: "text-[var(--color-primary)]" },
  queued: { label: "Queued for preprocessing", progress: 10, tone: "text-[var(--color-foreground-subtle)]" },
  extracting: { label: "Extracting document data", progress: 45, tone: "text-[var(--color-primary)]" },
  analyzing: { label: "Analyzing and classifying", progress: 80, tone: "text-[var(--color-accent)]" },
  classified: { label: "Ready for analysis", progress: 100, tone: "text-[var(--color-success)]" },
  failed: { label: "Processing failed", progress: 100, tone: "text-[var(--color-destructive)]" },
};

export function ProcessingQueue() {
  const items = useProcessingQueueStore((state) => state.items);
  const dismissItem = useProcessingQueueStore((state) => state.dismissItem);
  const [expanded, setExpanded] = useState(true);

  if (items.length === 0) return null;

  const activeCount = items.filter((item) => !["classified", "failed"].includes(item.stage)).length;

  return (
    <section className="fixed bottom-6 right-6 z-40 w-[min(30rem,calc(100vw-3rem))] border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-2xl">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[var(--color-surface-hover)]"
      >
        <span className="flex items-center gap-3">
          {activeCount > 0 ? <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" /> : <FileText className="h-4 w-4 text-[var(--color-success)]" />}
          <span>
            <span className="block text-xs font-semibold tracking-[0.08em] text-[var(--color-foreground)] uppercase">Processing queue</span>
            <span className="block text-[10px] font-[var(--font-mono)] text-[var(--color-foreground-subtle)]">{activeCount > 0 ? `${activeCount} processing` : "All documents ready"} · {items.length} total</span>
          </span>
        </span>
        {expanded ? <ChevronDown className="h-4 w-4 text-[var(--color-foreground-subtle)]" /> : <ChevronUp className="h-4 w-4 text-[var(--color-foreground-subtle)]" />}
      </button>

      {expanded && (
        <div className="max-h-80 overflow-y-auto border-t border-[var(--color-border)]">
          {items.map((item) => {
            const details = stageDetails[item.stage];
            const progress = item.stage === "uploading" ? item.progress : details.progress;
            const terminal = item.stage === "classified" || item.stage === "failed";
            return (
              <div key={item.id} className="border-b border-[var(--color-border)] px-5 py-4 last:border-b-0">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-foreground-subtle)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm text-[var(--color-foreground)]">{item.filename}</p>
                      <span className={cn("text-[10px] font-[var(--font-mono)]", details.tone)}>{Math.round(progress)}%</span>
                    </div>
                    <p className={cn("mt-1 text-[10px] font-[var(--font-mono)]", details.tone)}>{item.error ?? details.label}</p>
                    <div className="mt-2 h-1 overflow-hidden bg-[var(--color-background)]">
                      <div className={cn("h-full transition-all duration-300", item.stage === "failed" ? "bg-[var(--color-destructive)]" : item.stage === "classified" ? "bg-[var(--color-success)]" : "bg-[var(--color-primary)]")} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  {terminal && (
                    <button type="button" onClick={() => dismissItem(item.id)} className="text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground)]" aria-label={`Dismiss ${item.filename}`}>
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
