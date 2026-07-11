import { useQuery } from "@tanstack/react-query";
import { marked } from "marked";
import { SlideOver, SlideOverContent, Badge, Spinner } from "@claims/ui";
import { api } from "@/lib/api";
import type { DocType } from "@claims/shared";

const typeColors: Record<DocType, string> = {
  invoice: "#F59E0B",
  purchase_order: "#8B5CF6",
  contract: "#10B981",
  delivery_docket: "#06B6D4",
  unknown: "#64748B",
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Backend emits GitHub-flavored Markdown (often with embedded HTML tables).
// marked converts markdown syntax and passes raw HTML through untouched, so a
// single path handles both. The sandboxed iframe neutralizes any injected
// scripts, so no separate sanitizer is needed.
// ponytail: sandbox="" is the sanitizer; add DOMPurify only if we ever drop the iframe.
function renderMarkdown(text: string): string {
  return marked.parse(text, { gfm: true, async: false }) as string;
}

function buildHtmlPreview(html: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        padding: 20px;
        background: #ffffff;
        color: #111827;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 14px;
        line-height: 1.5;
      }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th, td { border: 1px solid #cbd5e1; padding: 8px 10px; vertical-align: top; }
      th { background: #f1f5f9; font-weight: 700; }
      img { max-width: 100%; height: auto; }
      * { box-sizing: border-box; }
    </style>
  </head>
  <body>${html}</body>
</html>`;
}

function humanizeKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (isRecord(value)) return JSON.stringify(value, null, 2);
  return String(value);
}

function StructuredData({ data }: { data: JsonRecord }) {
  const lineItems = Array.isArray(data.line_items) ? data.line_items.filter(isRecord) : [];
  const topLevel = Object.entries(data).filter(([, value]) => {
    if (Array.isArray(value)) return false;
    if (isRecord(value)) return false;
    return value !== null && value !== undefined && value !== "";
  });
  const nestedRecords = Object.entries(data).filter(([, value]) => isRecord(value));

  return (
    <div className="space-y-5">
      {topLevel.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {topLevel.map(([key, value]) => (
            <div key={key} className="rounded border border-[var(--color-border)] bg-[var(--color-background)]/30 p-3">
              <p className="mb-1 text-[9px] font-[var(--font-mono)] uppercase tracking-[0.18em] text-[var(--color-foreground-subtle)]">
                {humanizeKey(key)}
              </p>
              <p className="break-words text-sm font-medium text-[var(--color-foreground)]">
                {formatValue(value)}
              </p>
            </div>
          ))}
        </div>
      )}

      {nestedRecords.map(([key, value]) => (
        <div key={key} className="rounded border border-[var(--color-border)] bg-[var(--color-background)]/30 p-4">
          <p className="mb-3 text-[9px] font-[var(--font-mono)] uppercase tracking-[0.18em] text-[var(--color-foreground-subtle)]">
            {humanizeKey(key)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(value as JsonRecord).map(([nestedKey, nestedValue]) => (
              <div key={nestedKey} className="flex justify-between gap-4 border-b border-[var(--color-border)] py-2 text-xs">
                <span className="text-[var(--color-foreground-subtle)]">{humanizeKey(nestedKey)}</span>
                <span className="text-right font-[var(--font-mono)] text-[var(--color-foreground)]">{formatValue(nestedValue)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {lineItems.length > 0 && (
        <div className="overflow-hidden rounded border border-[var(--color-border)]">
          <div className="border-b border-[var(--color-border)] bg-[var(--color-background)]/30 px-4 py-3">
            <p className="text-[9px] font-[var(--font-mono)] uppercase tracking-[0.18em] text-[var(--color-foreground-subtle)]">
              Line Items
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-border)] text-[var(--color-foreground-subtle)]">
                <tr>
                  {Object.keys(lineItems[0]).map((key) => (
                    <th key={key} className="px-4 py-3 font-[var(--font-mono)] font-medium uppercase tracking-[0.12em]">
                      {humanizeKey(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={index} className="border-b border-[var(--color-border)] last:border-0">
                    {Object.keys(lineItems[0]).map((key) => (
                      <td key={key} className="px-4 py-3 text-[var(--color-foreground)]">
                        {formatValue(item[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface DocumentDetailPanelProps {
  documentId: string | null;
  onClose: () => void;
}

export function DocumentDetailPanel({ documentId, onClose }: DocumentDetailPanelProps) {
  const { data: doc, isLoading, isError } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => api.getDocument(documentId!),
    enabled: !!documentId,
  });

  const extractedText = doc?.extracted_text?.trim() ?? "";
  const extractedData = isRecord(doc?.extracted_json) ? doc.extracted_json : null;
  const hasPreview = extractedText.length > 0;

  return (
    <SlideOver open={!!documentId} onOpenChange={(open: boolean) => !open && onClose()}>
      <SlideOverContent className="max-w-3xl">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-12">
            <Spinner className="h-5 w-5" />
            <span className="text-sm font-[var(--font-mono)] text-[var(--color-foreground-subtle)]">
              Loading document
            </span>
          </div>
        ) : isError || !doc ? (
          <div className="py-12 text-center">
            <p className="text-sm font-[var(--font-mono)] text-[var(--color-destructive)]">
              Failed to load document details.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: typeColors[doc.type] }} />
                <p className="text-[9px] font-[var(--font-mono)] uppercase tracking-[0.2em] text-[var(--color-foreground-subtle)]">
                  Document Detail
                </p>
              </div>
              <div className="space-y-2">
                <h2 className="break-words font-[var(--font-display)] text-2xl font-semibold text-[var(--color-foreground)]">
                  {doc.filename}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="neutral">{doc.type}</Badge>
                  <Badge variant={doc.status === "classified" ? "success" : "info"}>{doc.status}</Badge>
                </div>
              </div>
            </div>

            {hasPreview && (
              <section className="space-y-3">
                <p className="text-[10px] font-[var(--font-mono)] uppercase tracking-[0.2em] text-[var(--color-foreground-subtle)]">
                  Rendered Preview
                </p>
                <iframe
                  title="Extracted document preview"
                  sandbox=""
                  srcDoc={buildHtmlPreview(renderMarkdown(extractedText))}
                  className="h-[420px] w-full rounded border border-[var(--color-border)] bg-white"
                />
              </section>
            )}

            {extractedData && (
              <section className="space-y-3">
                <p className="text-[10px] font-[var(--font-mono)] uppercase tracking-[0.2em] text-[var(--color-foreground-subtle)]">
                  Extracted Data
                </p>
                <StructuredData data={extractedData} />
              </section>
            )}

            {hasPreview && (
              <details className="rounded border border-[var(--color-border)] bg-[var(--color-background)]/30 p-4">
                <summary className="cursor-pointer text-[10px] font-[var(--font-mono)] uppercase tracking-[0.2em] text-[var(--color-foreground-subtle)]">
                  Source (Markdown)
                </summary>
                <pre className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap font-[var(--font-mono)] text-xs leading-relaxed text-[var(--color-foreground)]/70">
                  {extractedText}
                </pre>
              </details>
            )}

            {!extractedText && !extractedData && (
              <div className="rounded border border-dashed border-[var(--color-border)] p-8 text-center">
                <p className="text-sm font-[var(--font-mono)] text-[var(--color-foreground-subtle)]">
                  No extracted content available.
                </p>
              </div>
            )}
          </div>
        )}
      </SlideOverContent>
    </SlideOver>
  );
}
