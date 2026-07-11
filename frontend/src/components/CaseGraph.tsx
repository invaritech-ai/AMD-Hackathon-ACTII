import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Spinner } from "@claims/ui";
import { DocumentDetailPanel } from "./DocumentDetailPanel";
import type { DocType, GraphResponse } from "@claims/shared";

const typeColor: Record<DocType, string> = {
  invoice: "#F59E0B",
  purchase_order: "#8B5CF6",
  contract: "#10B981",
  delivery_docket: "#06B6D4",
  unknown: "#64748B",
};

const typeColorBg: Record<DocType, string> = {
  invoice: "rgb(245 158 11 / 0.15)",
  purchase_order: "rgb(139 92 246 / 0.15)",
  contract: "rgb(16 185 129 / 0.15)",
  delivery_docket: "rgb(6 182 212 / 0.15)",
  unknown: "rgb(100 116 139 / 0.15)",
};

function layoutNodes(
  graphNodes: { id: string; type: DocType; filename: string; ids: string[]; case_id: string }[],
  graphEdges: { source: string; target: string; shared_ids: string[] }[]
): { nodes: Node[]; edges: Edge[] } {
  const cases = new Map<string, string[]>();
  for (const n of graphNodes) {
    const list = cases.get(n.case_id) ?? [];
    list.push(n.id);
    cases.set(n.case_id, list);
  }

  const spacing = 320;
  let caseIdx = 0;

  const nodes: Node[] = [];
  const idToPos = new Map<string, { x: number; y: number }>();

  for (const [caseId, nodeIds] of cases) {
    const cx = (caseIdx % 3) * spacing + 200;
    const cy = Math.floor(caseIdx / 3) * spacing + 150;
    const radius = Math.max(60, nodeIds.length * 25);

    nodeIds.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / nodeIds.length;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      idToPos.set(id, { x, y });
    });
    caseIdx++;
  }

  for (const n of graphNodes) {
    const pos = idToPos.get(n.id) ?? { x: 0, y: 0 };
    nodes.push({
      id: n.id,
      type: "documentNode",
      position: pos,
      data: {
        filename: n.filename,
        docType: n.type,
        ids: n.ids,
        caseId: n.case_id,
      },
    });
  }

  const edges: Edge[] = graphEdges.map((e) => ({
    id: `${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    animated: false,
    style: { stroke: "var(--color-border-light)", strokeWidth: 2 },
    label: e.shared_ids.join(", "),
    labelStyle: { fill: "var(--color-foreground-subtle)", fontSize: 10, fontFamily: "Fira Code, monospace" },
    labelBgStyle: { fill: "var(--color-surface)" },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 2,
  }));

  return { nodes, edges };
}

function DocumentNode({ data }: { data: { filename: string; docType: DocType; ids: string[]; caseId: string } }) {
  const color = typeColor[data.docType];
  const bg = typeColorBg[data.docType];
  return (
    <div
      className="px-4 py-3 rounded-lg border text-center min-w-[160px] shadow-sm"
      style={{
        background: "var(--color-surface)",
        borderColor: color,
        boxShadow: `0 0 0 1px ${bg}`,
      }}
    >
      <p className="text-[11px] font-[var(--font-mono)] mb-1 truncate max-w-[140px]" style={{ color }}>
        {data.filename}
      </p>
      <span
        className="text-[9px] font-[var(--font-mono)] uppercase tracking-[0.1em] px-2 py-0.5 rounded"
        style={{ background: bg, color }}
      >
        {data.docType}
      </span>
    </div>
  );
}

const nodeTypes = { documentNode: DocumentNode };

interface CaseGraphProps {
  graph?: GraphResponse;
  isLoading: boolean;
  isError: boolean;
}

export function CaseGraph({ graph, isLoading, isError }: CaseGraphProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };
    return layoutNodes(graph.nodes, graph.edges);
  }, [graph]);

  useEffect(() => {
    setSelectedDocId(null);
  }, [graph]);

  if (isLoading) {
    return (
      <div className="w-full border border-dashed border-[var(--color-border)] rounded-lg flex flex-col items-center justify-center min-h-[500px] gap-3">
        <Spinner className="h-5 w-5" />
        <p className="text-sm text-[var(--color-foreground-subtle)] font-[var(--font-mono)]">Loading graph</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full border border-dashed border-[var(--color-border)] rounded-lg flex items-center justify-center min-h-[500px]">
        <p className="text-sm text-[var(--color-destructive)] font-[var(--font-mono)]">Failed to load document graph.</p>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="w-full border border-dashed border-[var(--color-border)] rounded-lg flex items-center justify-center min-h-[500px]">
        <p className="text-sm text-[var(--color-foreground-subtle)] font-[var(--font-mono)]">
          This case has no resolved documents yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full border border-[var(--color-border)] rounded-lg overflow-hidden" style={{ height: 560 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_event, node) => setSelectedDocId(node.id)}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          defaultEdgeOptions={{ animated: false }}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesReconnectable={false}
        >
          <Background color="var(--color-border)" gap={20} />
          <Controls className="[&_button]:!bg-[var(--color-surface)] [&_button]:!border-[var(--color-border)] [&_button]:!text-[var(--color-foreground-subtle)]" />
        </ReactFlow>
      </div>
      <DocumentDetailPanel documentId={selectedDocId} onClose={() => setSelectedDocId(null)} />
    </>
  );
}
