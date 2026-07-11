import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { UploadPanel } from "@/components/UploadPanel";

export function UploadRoute() {
  return (
    <PageContainer>
      <PageHeader
        title="Document Processing"
        label="Pipeline"
        labelColor="bg-[var(--color-primary)]"
        description="Upload invoices, purchase orders, and contracts. The system cross-references documents against agreements to detect discrepancies and generate recovery claims."
      />
      <UploadPanel />
    </PageContainer>
  );
}
