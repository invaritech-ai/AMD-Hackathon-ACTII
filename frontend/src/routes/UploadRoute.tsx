import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { UploadPanel } from "@/components/UploadPanel";

export function UploadRoute() {
  return (
    <PageContainer>
      <PageHeader
        title="Bring evidence into review"
        label="Document intake"
        labelColor="bg-[var(--color-primary)]"
        description="Start a case-ready processing run with the invoices, purchase orders, contracts, and delivery evidence that matter."
      />
      <section className="mb-7 flex flex-col gap-3 border-y border-[var(--color-border)] py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-label">Pipeline status</p>
          <p className="mt-1 text-[13px] text-[var(--color-foreground-muted)]">
            Every submitted file remains traceable through validation, extraction, and case review.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-md border border-[rgb(43_203_136_/_0.28)] bg-[rgb(43_203_136_/_0.08)] px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.04em] text-[var(--color-success)] sm:self-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
          Intake ready
        </div>
      </section>
      <UploadPanel />
    </PageContainer>
  );
}
