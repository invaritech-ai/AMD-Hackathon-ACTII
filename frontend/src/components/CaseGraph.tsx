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
  invoice: "#F6A623",
  purchase_order: "#6AA8FF",
  contract: "#2BCB88",
  delivery_docket: "#44C4E0",
  unknown: "#71819A",
};

const typeColorBg: Record<DocType, string> = {
  invoice: "rgb(246 166 35 / 0.14)",
  purchase_order: "rgb(106 168 255 / 0.14)",
  contract: "rgb(43 203 136 / 0.14)",
  delivery_docket: "rgb(68 196 224 / 0.14)",
  unknown: "rgb(113 129 154 / 0.14)",
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
      className="min-w-[168px] rounded-xl border px-4 py-3 text-center shadow-[0_12px_28px_rgb(0_0_0_/_0.18)]"
      style={{
        background: "var(--color-surface)",
        borderColor: color,
        boxShadow: `0 0 0 1px ${bg}`,
      }}
    >
      <p className="mb-1.5 max-w-[140px] truncate text-[11px] font-semibold" style={{ color }}>
        {data.filename}
      </p>
      <span
        className="rounded-[4px] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]"
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
      <div className="workspace-bezel flex min-h-[560px] w-full flex-col items-center justify-center gap-3 rounded-xl">
        <Spinner className="h-5 w-5" />
        <p className="text-sm text-[var(--color-foreground-subtle)] font-[var(--font-mono)]">Loading graph</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="workspace-bezel flex min-h-[560px] w-full items-center justify-center rounded-xl">
        <p className="text-sm text-[var(--color-destructive)] font-[var(--font-mono)]">Failed to load document graph.</p>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="workspace-bezel flex min-h-[560px] w-full items-center justify-center rounded-xl">
        <p className="text-sm text-[var(--color-foreground-subtle)] font-[var(--font-mono)]">
          This case has no resolved documents yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="workspace-bezel relative w-full overflow-hidden rounded-xl" style={{ height: 560 }}>
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
          <Background color="#263650" gap={22} />
          <Controls className="!rounded-md !border-[var(--color-border)] !bg-[var(--color-surface-raised)] !shadow-lg [&_button]:!border-[var(--color-border)] [&_button]:!bg-[var(--color-surface-raised)] [&_button]:!text-[var(--color-foreground-muted)] [&_button:hover]:!bg-[var(--color-surface-hover)]" />
        </ReactFlow>
      </div>
      <DocumentDetailPanel documentId={selectedDocId} onClose={() => setSelectedDocId(null)} />
    </>
  );
}
