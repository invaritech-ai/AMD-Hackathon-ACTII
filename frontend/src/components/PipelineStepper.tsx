import { useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, Stepper, Badge, Button, Spinner, Skeleton, cn } from "@claims/ui";
import { useRunStatus } from "@/hooks/useRunStatus";
import type { AgentId, AgentStatusValue } from "@claims/shared";

const agentStepMap: Record<AgentId, number> = {
  agent1_ocr: 1,
  agent2_po_match: 2,
  agent3_contract: 3,
  agent4_aggregate: 4,
  agent5_claims: 5,
};

const AGENT_STEPS = [
  { id: 1, label: "OCR & Extract" },
  { id: 2, label: "PO Matcher" },
  { id: 3, label: "Contract Validate" },
  { id: 4, label: "Aggregate" },
  { id: 5, label: "Draft Claim" },
] as const;

function mapAgentStatus(backend: AgentStatusValue): "pending" | "processing" | "done" | "error" {
  if (backend === "completed" || backend === "skipped") return "done";
  if (backend === "running") return "processing";
  if (backend === "failed") return "error";
  return "pending";
}

interface PipelineStepperProps {
  runId: string;
}

export function PipelineStepper({ runId }: PipelineStepperProps) {
  const { data: run, isLoading, isError: isQueryError } = useRunStatus(runId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="rounded-xl">
        <CardContent className="space-y-6 py-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isQueryError || !run) {
    return (
      <Card className="rounded-xl border-[var(--color-destructive)]/20">
        <CardContent className="px-6 py-8 text-center">
          <Badge variant="high" className="mb-3">
            Pipeline unavailable
          </Badge>
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-[var(--color-destructive)]" />
          <p className="text-sm font-[var(--font-mono)] text-[var(--color-destructive)]">
            Failed to load pipeline status.
          </p>
        </CardContent>
      </Card>
    );
  }

  const stepStatus = Object.fromEntries(
    run.agents.map((a) => [agentStepMap[a.agent_id], mapAgentStatus(a.status)])
  ) as Record<number, "pending" | "processing" | "done" | "error">;

  const activeAgent = run.agents.find((a) => a.status === "running");
  const activeStep = activeAgent ? agentStepMap[activeAgent.agent_id] :
    run.agents.filter((a) => a.status === "completed").length + 1;

  const isDone = run.status === "completed";
  const hasError = run.status === "failed";
  const isRunning = run.status === "running" || run.status === "pending";

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              isDone ? "bg-[var(--color-success)]" : hasError ? "bg-[var(--color-destructive)]" : "bg-[var(--color-primary)]"
            )} />
            <p className="text-[9px] font-[var(--font-mono)] tracking-[0.2em] text-[var(--color-foreground-subtle)] uppercase">
              Run {run.id.slice(0, 8)}
            </p>
          </div>
          <h3 className="font-[var(--font-display)] text-xl font-semibold text-[var(--color-foreground)]">
            {run.supplier_name ?? "Unknown supplier"}
          </h3>
          <p className="font-[var(--font-mono)] text-xs text-[var(--color-foreground-subtle)]">
            {run.invoice_number ?? `Run ${run.id.slice(0, 8)}`}
          </p>
        </div>
        <Badge variant={isDone ? "success" : hasError ? "high" : "info"}>
          {isDone ? "Complete" : hasError ? "Failed" : "Running"}
        </Badge>
      </div>

      <Stepper steps={[...AGENT_STEPS]} activeStep={activeStep} stepStatus={stepStatus} />

      {isRunning && (
        <Card className="rounded-lg border-[var(--color-border)] bg-[var(--color-surface)] shadow-none">
          <CardContent className="flex items-center gap-3 p-4 text-sm font-[var(--font-mono)] text-[var(--color-foreground-subtle)]">
            <Spinner className="h-4 w-4" />
            <span>
              Step {activeStep}: {AGENT_STEPS[activeStep - 1]?.label} running
            </span>
          </CardContent>
        </Card>
      )}

      {hasError && (
        <Card className="rounded-lg border-[var(--color-destructive)]/20 bg-[rgb(239_68_68_/_0.05)] shadow-none">
          <CardContent className="p-5">
            <Badge variant="high">Run failed</Badge>
            <p className="mt-3 text-xs leading-relaxed text-[var(--color-destructive)] font-[var(--font-mono)]">
              {run.error_message ?? "Unknown failure — check agent logs."}
            </p>
          </CardContent>
        </Card>
      )}

      {isDone && (
        <div className="flex gap-3">
          {(run.discrepancies?.length ?? 0) > 0 && (
            <Button variant="primary" onClick={() => navigate(`/discrepancies/${runId}`)}>
              View {run.discrepancies.length} Discrepancies
            </Button>
          )}
          {(run.claims?.length ?? 0) > 0 && (
            <Button variant="secondary" onClick={() => navigate(`/claims/${runId}`)}>
              View Claim Draft
            </Button>
          )}
          {(run.discrepancies?.length ?? 0) === 0 && (run.claims?.length ?? 0) === 0 && (
            <Card className="rounded-lg border-[var(--color-success)]/20 bg-[rgb(16_185_129_/_0.05)] shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
                <div className="space-y-1">
                  <Badge variant="success">No discrepancies</Badge>
                  <p className="text-sm font-[var(--font-mono)] text-[var(--color-success)]">
                    No discrepancies detected
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
