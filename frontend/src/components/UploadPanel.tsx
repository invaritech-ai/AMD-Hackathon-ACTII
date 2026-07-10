import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, Sparkles } from "lucide-react";
import { Button, Card, CardContent, Spinner, cn } from "@claims/ui";
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

  const handleUpload = () => {
    if (files.length === 0) return;
    upload.mutate(files, {
      onSuccess: (data) => {
        setRunId(data.run_id);
        toast.success("Pipeline Started", `Processing ${files.length} file(s)`);
      },
      onError: (error) => {
        toast.error("Upload Failed", error.message);
      },
    });
  };

  if (runId) {
    return (
      <Card>
        <CardContent className="py-8">
          <PipelineStepper runId={runId} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex w-full cursor-pointer flex-col items-center justify-center min-h-[320px] px-8 py-20 transition-all duration-200 rounded-lg",
          dragOver
            ? "marching-ants bg-[rgb(245_158_11_/_0.05)]"
            : "border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface)]"
        )}
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
        <p className="text-sm text-[var(--color-foreground)] font-medium">
          Drop invoice PDFs here
        </p>
        <p className="text-xs text-[var(--color-foreground-subtle)] mt-1 font-[var(--font-mono)]">
          or click to browse — PDF, image, or spreadsheet
        </p>
        <input
          ref={inputRef}
          type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.tiff,.tif"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-5 py-3"
            >
              <FileText className="h-4 w-4 shrink-0 text-[var(--color-foreground-subtle)]" />
              <span className="flex-1 text-sm text-[var(--color-foreground)] truncate">{file.name}</span>
              <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-foreground-subtle)]">
                {(file.size / 1024).toFixed(0)}KB
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="text-[var(--color-foreground-subtle)] hover:text-[var(--color-destructive)] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <Button onClick={handleUpload} disabled={upload.isPending} className="w-full" size="lg" variant="primary">
            {upload.isPending ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" />
                Initializing recovery pipeline...
              </>
            ) : (
              `Run Recovery Pipeline — ${files.length} file${files.length > 1 ? "s" : ""}`
            )}
          </Button>

          {upload.isError && (
            <div className="border border-[rgb(239_68_68_/_0.25)] bg-[rgb(239_68_68_/_0.1)] rounded px-5 py-4 mt-4">
              <p className="text-xs text-[var(--color-destructive)] font-[var(--font-mono)]">
                {(upload.error as Error).message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
