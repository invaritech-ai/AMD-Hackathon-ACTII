import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { CaseGraph } from "@/components/CaseGraph";

export function GraphRoute() {
  return (
    <PageContainer>
      <PageHeader
        title="Document Graph"
        label="Cases"
        labelColor="bg-[var(--color-accent)]"
        description="Documents auto-organized into cases. Drag to link/unlink."
      />
      <CaseGraph />
    </PageContainer>
  );
}
