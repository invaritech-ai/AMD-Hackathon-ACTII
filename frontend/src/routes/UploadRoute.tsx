import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { UploadPanel } from "@/components/UploadPanel";

export function UploadRoute() {
  return (
    <PageContainer>
      <PageHeader
        title="Claims Recovery Engine"
        label="Pipeline"
        labelColor="bg-[var(--color-primary)]"
        description="Drop PDF, images, and spreadsheets. AI agents cross-reference against purchase orders and pricing contracts to surface discrepancies and draft recovery claims."
      />
      <UploadPanel />
    </PageContainer>
  );
}
