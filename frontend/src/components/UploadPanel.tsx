import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Badge, Button, Card, CardContent, ScrollArea, Spinner, cn } from "@claims/ui";
import { useUpload } from "@/hooks/useUpload";
import { PipelineStepper } from "./PipelineStepper";
import { useToast } from "@/store/toastStore";

export function UploadPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUpload();
  const toast = useToast();

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const accepted = Array.from(newFiles).filter((f) => {
      const mime = f.type;
      return (
        mime === "application/pdf" ||
        mime.includes("word") ||
        mime.includes("spreadsheet") ||
        mime.includes("excel") ||
        mime === "text/csv" ||
        mime.startsWith("image/")
      );
    });
    setFiles((prev) => [...prev, ...accepted]);
  }, []);

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));
  const openFilePicker = () => inputRef.current?.click();

  const handleUpload = () => {
    if (files.length === 0) return;
    const fileCount = files.length;
    upload.mutate(files, {
      onSuccess: (data) => {
        setRunId(data.run_id);
        toast.success("Pipeline Started", `Processing ${fileCount} file(s)`);
      },
      onError: (error) => {
        toast.error("Upload Failed", error.message);
      },
    });
    setFiles([]);
  };

  if (runId) {
    return (
      <Card className="rounded-xl">
        <CardContent className="py-8">
          <PipelineStepper runId={runId} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card
        className={cn(
          "overflow-hidden rounded-xl border-dashed transition-all duration-200",
          dragOver
            ? "border-[var(--color-primary)] bg-[rgb(245_158_11_/_0.05)] shadow-[0_0_0_1px_rgb(245_158_11_/_0.18)]"
            : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
        )}
      >
        <CardContent
          role="button"
          tabIndex={0}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={openFilePicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openFilePicker();
            }
          }}
          aria-label="Select documents to upload"
          className="relative flex min-h-[320px] w-full cursor-pointer flex-col items-center justify-center px-8 py-20 text-center"
        >
          <div
          className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-full border mb-6 transition-all duration-200",
            dragOver
              ? "border-[var(--color-primary)] bg-[rgb(245_158_11_/_0.1)] scale-110"
              : "border-[var(--color-border)] bg-[var(--color-surface)]"
          )}
        >
          <Upload
            className={cn(
              "h-8 w-8 transition-all duration-200",
              dragOver
                ? "text-[var(--color-primary)]"
                : "text-[var(--color-foreground-subtle)]"
            )}
          />
        </div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            Drag and drop invoice PDFs here
          </p>
          <p className="mt-1 text-xs font-[var(--font-mono)] text-[var(--color-foreground-subtle)]">
            or click to browse — PDF, image, or spreadsheet
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Badge variant="neutral">PDF</Badge>
            <Badge variant="neutral">Word</Badge>
            <Badge variant="neutral">Spreadsheet</Badge>
            <Badge variant="neutral">CSV</Badge>
            <Badge variant="neutral">Images</Badge>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.tiff,.tif"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card className="overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <div>
              <p className="text-label">Upload batch</p>
              <p className="mt-0.5 text-sm font-medium text-[var(--color-foreground)]">
                {files.length} file{files.length === 1 ? "" : "s"} ready for preprocessing
              </p>
            </div>
            <Badge variant="neutral">{files.length}</Badge>
          </div>

          <ScrollArea className="max-h-72">
            <div className="space-y-3 p-4">
              {files.map((file, i) => (
                <Card
                  key={`${file.name}-${file.size}-${i}`}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-none"
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <FileText className="h-4 w-4 shrink-0 text-[var(--color-foreground-subtle)]" />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm text-[var(--color-foreground)]"
                        aria-label={`File name ${file.name}`}
                      >
                        {file.name}
                      </p>
                      <p className="mt-1 text-[11px] font-[var(--font-mono)] text-[var(--color-foreground-subtle)]">
                        {(file.size / 1024).toFixed(0)}KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                      className="h-8 px-2"
                      aria-label={`Remove ${file.name} from upload list`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <CardContent className="space-y-4 border-t border-[var(--color-border)] pt-4">
            <Button
              onClick={handleUpload}
              disabled={upload.isPending}
              className="w-full"
              size="lg"
              variant="primary"
              aria-label={
                upload.isPending
                  ? `Uploading ${files.length} file${files.length === 1 ? "" : "s"}`
                  : `Start analysis for ${files.length} file${files.length === 1 ? "" : "s"}`
              }
            >
              {upload.isPending ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Uploading {files.length} file{files.length > 1 ? "s" : ""}...
                </>
              ) : (
                `Start Analysis — ${files.length} file${files.length > 1 ? "s" : ""}`
              )}
            </Button>

            {upload.isError && (
              <Card className="rounded-lg border-[rgb(239_68_68_/_0.25)] bg-[rgb(239_68_68_/_0.08)] shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="high">Upload error</Badge>
                    <span className="text-[10px] font-[var(--font-mono)] text-[var(--color-destructive)]">
                      Retry required
                    </span>
                  </div>
                  <p
                    className="mt-2 text-xs font-[var(--font-mono)] text-[var(--color-destructive)]"
                    aria-label={`Upload error ${(upload.error as Error).message}`}
                  >
                    {(upload.error as Error).message}
                  </p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
