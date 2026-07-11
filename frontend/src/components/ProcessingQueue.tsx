import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Loader2, X } from "lucide-react";
import { Badge, Button, Card, Progress, ScrollArea, cn } from "@claims/ui";
import { useProcessingQueueStore, type ProcessingStage } from "@/store/processingQueueStore";

const stageDetails: Record<
  ProcessingStage,
  {
    label: string;
    badgeLabel: string;
    progress: number;
    tone: string;
    badgeVariant: "info" | "neutral" | "phosphor" | "success" | "high";
  }
> = {
  uploading: {
    label: "Uploading document",
    badgeLabel: "Uploading",
    progress: 0,
    tone: "text-[var(--color-primary)]",
    badgeVariant: "info",
  },
  queued: {
    label: "Queued for preprocessing",
    badgeLabel: "Queued",
    progress: 10,
    tone: "text-[var(--color-foreground-subtle)]",
    badgeVariant: "neutral",
  },
  extracting: {
    label: "Extracting document data",
    badgeLabel: "Extracting",
    progress: 45,
    tone: "text-[var(--color-primary)]",
    badgeVariant: "info",
  },
  analyzing: {
    label: "Analyzing and classifying",
    badgeLabel: "Analyzing",
    progress: 80,
    tone: "text-[var(--color-accent)]",
    badgeVariant: "phosphor",
  },
  classified: {
    label: "Ready for analysis",
    badgeLabel: "Ready",
    progress: 100,
    tone: "text-[var(--color-success)]",
    badgeVariant: "success",
  },
  failed: {
    label: "Processing failed",
    badgeLabel: "Failed",
    progress: 100,
    tone: "text-[var(--color-destructive)]",
    badgeVariant: "high",
  },
};

const terminalStages = new Set<ProcessingStage>(["classified", "failed"]);

export function ProcessingQueue() {
  const items = useProcessingQueueStore((state) => state.items);
  const dismissItem = useProcessingQueueStore((state) => state.dismissItem);
  const [expanded, setExpanded] = useState(true);

  if (items.length === 0) return null;

  const activeCount = items.filter((item) => !terminalStages.has(item.stage)).length;

  return (
    <Card className="fixed bottom-6 right-6 z-40 w-[min(30rem,calc(100vw-3rem))] overflow-hidden rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-2xl">
      <Button
        type="button"
        variant="ghost"
        size="md"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls="processing-queue-items"
        aria-label={expanded ? "Collapse processing queue" : "Expand processing queue"}
        className="h-auto w-full justify-between rounded-none px-5 py-4 text-left hover:bg-[var(--color-surface-hover)]"
      >
        <span className="flex items-center gap-3">
          {activeCount > 0 ? (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
          ) : (
            <FileText className="h-4 w-4 text-[var(--color-success)]" />
          )}
          <span>
            <span className="block text-xs font-semibold tracking-[0.08em] text-[var(--color-foreground)] uppercase">
              Processing queue
            </span>
            <span className="block text-[10px] font-[var(--font-mono)] text-[var(--color-foreground-subtle)]">
              {activeCount > 0 ? `${activeCount} processing` : "All documents ready"} · {items.length} total
            </span>
          </span>
        </span>
        <span className="flex items-center gap-3">
          <Badge variant={activeCount > 0 ? "info" : "success"}>
            {activeCount > 0 ? `${activeCount} active` : "Ready"}
          </Badge>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[var(--color-foreground-subtle)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--color-foreground-subtle)]" />
          )}
        </span>
      </Button>

      {expanded && (
        <ScrollArea id="processing-queue-items" className="max-h-80 border-t border-[var(--color-border)]">
          <div className="divide-y divide-[var(--color-border)]" aria-live="polite" aria-relevant="additions text">
            {items.map((item) => {
              const details = stageDetails[item.stage];
              const progress = item.stage === "uploading" ? item.progress : details.progress;
              const terminal = terminalStages.has(item.stage);
              const roundedProgress = Math.round(progress);
              const failed = item.stage === "failed";
              const progressDescription = failed ? "Processing failed before completion" : `${roundedProgress} percent complete`;

              return (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-foreground-subtle)]" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            id={`processing-queue-file-${item.id}`}
                            className="truncate text-sm text-[var(--color-foreground)]"
                            aria-label={`File name ${item.filename}`}
                          >
                            {item.filename}
                          </p>
                          <p
                            id={`processing-queue-stage-${item.id}`}
                            className={cn("mt-1 text-[10px] font-[var(--font-mono)]", details.tone)}
                            aria-label={`Stage ${details.badgeLabel}`}
                          >
                            {item.error ?? details.label}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={details.badgeVariant}>{details.badgeLabel}</Badge>
                          <span
                            className={cn("text-[10px] font-[var(--font-mono)]", details.tone)}
                            aria-label={progressDescription}
                          >
                            {failed ? "Failed" : `${roundedProgress}%`}
                          </span>
                        </div>
                      </div>

                      <Progress
                        value={failed ? null : progress}
                        className="h-1.5"
                        aria-labelledby={`processing-queue-file-${item.id}`}
                        aria-describedby={`processing-queue-meta-${item.id}`}
                      />
                      <p id={`processing-queue-meta-${item.id}`} className="sr-only">
                        File {item.filename}. Stage {details.badgeLabel}. {progressDescription}.
                        {item.error ? ` Error state: ${item.error}.` : ""}
                        {terminal ? " Remove action available." : ""}
                      </p>
                    </div>
                    {terminal && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissItem(item.id)}
                        className="mt-0.5 h-8 px-2"
                        aria-label={`Remove ${item.filename} from processing queue`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
