import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Badge, Button, Card, CardContent, ScrollArea, Spinner, cn } from "@claims/ui";
import { useUpload } from "@/hooks/useUpload";
import { useToast } from "@/store/toastStore";

export function UploadPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [submittedCount, setSubmittedCount] = useState<number | null>(null);
  const [pendingUploadCount, setPendingUploadCount] = useState<number | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
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
    setPendingUploadCount(fileCount);
    setUploadErrorMessage(null);
    upload.mutate(files, {
      onSuccess: (data) => {
        setSubmittedCount(data.document_count);
        toast.success("Documents queued", `${fileCount} file(s) are now being processed`);
        setPendingUploadCount(null);
      },
      onError: (error) => {
        setUploadErrorMessage(error.message);
        toast.error("Upload Failed", error.message);
        setPendingUploadCount(null);
      },
    });
    setFiles([]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <Card
          className={cn(
            "overflow-hidden border-dashed transition-[background-color,border-color,box-shadow] duration-[var(--duration-interaction)] ease-[var(--ease-emphasized)]",
            dragOver
              ? "border-[var(--color-primary)] bg-[rgb(246_166_35_/_0.06)] shadow-[0_0_0_1px_rgb(246_166_35_/_0.2)]"
              : "hover:border-[var(--color-border-light)]"
          )}
        >
          <CardContent
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            className="relative flex min-h-[344px] w-full flex-col items-center justify-center px-6 py-10 text-center sm:px-10"
          >
            <div
              className={cn(
                "relative mb-5 flex h-14 w-14 items-center justify-center rounded-xl border transition-[background-color,border-color,transform] duration-[var(--duration-interaction)] ease-[var(--ease-emphasized)]",
                dragOver
                  ? "scale-105 border-[var(--color-primary)] bg-[rgb(246_166_35_/_0.12)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface-raised)]"
              )}
            >
              <Upload
                className={cn(
                  "h-6 w-6 transition-colors duration-[var(--duration-interaction)]",
                  dragOver
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-foreground-muted)]"
                )}
              />
            </div>
            <p className="text-label">Secure evidence intake</p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.015em] text-[var(--color-foreground)]">
              Drop documents here, or choose files
            </h2>
            <p className="mt-2 max-w-md text-[13px] leading-5 text-[var(--color-foreground-muted)]">
              Files are validated first, then passed to the recovery agents for extraction and classification.
            </p>
            <Button type="button" variant="secondary" className="mt-5" onClick={openFilePicker}>
              Choose files
            </Button>
            <div className="mt-5 flex flex-wrap justify-center gap-1.5">
              <Badge variant="neutral">PDF</Badge>
              <Badge variant="neutral">Spreadsheets</Badge>
              <Badge variant="neutral">Documents</Badge>
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

        <Card className="bg-[var(--color-surface-raised)]">
          <CardContent className="flex h-full flex-col p-5">
            <p className="text-label">What happens next</p>
            <div className="mt-5 space-y-5">
              {[
                ["01", "Validate", "Check file type and prepare each document for extraction."],
                ["02", "Extract", "Read key evidence from invoices, orders, and agreements."],
                ["03", "Connect", "Make the evidence available to case and graph review."],
              ].map(([number, title, description]) => (
                <div key={number} className="flex gap-3">
                  <span className="mt-0.5 font-[var(--font-mono)] text-[11px] font-semibold text-[var(--color-primary)]">
                    {number}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--color-foreground)]">{title}</p>
                    <p className="mt-1 text-[12px] leading-5 text-[var(--color-foreground-muted)]">{description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto border-t border-[var(--color-border)] pt-4">
              <p className="text-[11px] leading-4 text-[var(--color-foreground-subtle)]">
                Supported: PDF, Office documents, CSV, spreadsheets, and common image formats.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {upload.isPending && pendingUploadCount !== null && (
        <Card className="border-[rgb(68_196_224_/_0.28)] bg-[rgb(68_196_224_/_0.06)] shadow-none">
          <CardContent className="flex items-center gap-3 p-4" aria-live="polite">
            <Spinner className="h-4 w-4 text-[#67D6F2]" />
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-foreground)]">
                Uploading {pendingUploadCount} file{pendingUploadCount === 1 ? "" : "s"}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--color-foreground-muted)]">
                Documents are being monitored through validation and classification.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {submittedCount !== null && !upload.isPending && (
        <Card className="border-[rgb(43_203_136_/_0.28)] bg-[rgb(43_203_136_/_0.06)] shadow-none">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="success">Queued</Badge>
                <p className="text-[13px] font-semibold text-[var(--color-foreground)]">
                  {submittedCount} document{submittedCount === 1 ? "" : "s"} submitted
                </p>
              </div>
              <p className="mt-2 text-[12px] text-[var(--color-foreground-muted)]">
                Processing status remains available while the backend agents classify the evidence.
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSubmittedCount(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {uploadErrorMessage && (
        <Card className="border-[rgb(241_100_100_/_0.3)] bg-[rgb(241_100_100_/_0.08)] shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant="high">Upload error</Badge>
              <span className="text-[11px] text-[var(--color-destructive)]">Action required</span>
            </div>
            <p
              className="mt-2 text-[12px] leading-5 text-[var(--color-destructive)]"
              aria-label={`Upload error ${uploadErrorMessage}`}
            >
              {uploadErrorMessage}
            </p>
          </CardContent>
        </Card>
      )}

      {files.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <div>
              <p className="text-label">Ready to submit</p>
              <p className="mt-1 text-[13px] font-semibold text-[var(--color-foreground)]">
                {files.length} file{files.length === 1 ? "" : "s"} prepared for processing
              </p>
            </div>
            <Badge variant="neutral">{files.length}</Badge>
          </div>

          <ScrollArea className="max-h-72">
            <div className="space-y-2 p-3">
              {files.map((file, i) => (
                <Card
                  key={`${file.name}-${file.size}-${i}`}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-none"
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    <FileText className="h-4 w-4 shrink-0 text-[var(--color-foreground-muted)]" />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-[13px] font-medium text-[var(--color-foreground)]"
                        aria-label={`File name ${file.name}`}
                      >
                        {file.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--color-foreground-subtle)]">
                        {(file.size / 1024).toFixed(0)} KB
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

          <CardContent className="border-t border-[var(--color-border)] pt-4">
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
                `Start processing ${files.length} file${files.length > 1 ? "s" : ""}`
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
