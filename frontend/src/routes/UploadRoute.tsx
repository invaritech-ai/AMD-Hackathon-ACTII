import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { UploadPanel } from "@/components/UploadPanel";
import { Badge, Card, CardContent } from "@claims/ui";

export function UploadRoute() {
  return (
    <PageContainer>
      <PageHeader
        title="Document Processing"
        label="Pipeline"
        labelColor="bg-[var(--color-primary)]"
        description="Upload invoices, purchase orders, and contracts. The system cross-references documents against agreements to detect discrepancies and generate recovery claims."
      />
      <Card className="mb-6 rounded-xl">
        <CardContent className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-label">Persistent queue</p>
            <p className="mt-1 text-sm text-[var(--color-foreground-subtle)]">
              Picker selections clear after submission, while the processing queue stays visible across route changes.
            </p>
          </div>
          <Badge variant="info">Live upload feedback</Badge>
        </CardContent>
      </Card>
      <UploadPanel />
    </PageContainer>
  );
}
