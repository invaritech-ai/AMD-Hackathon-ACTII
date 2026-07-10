import { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useGraph } from "@/hooks/useGraph";
import { useQueryClient } from "@tanstack/react-query";
import type { DocType } from "@claims/shared";

// ── node colors by document type ──
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

// ── case halo colors ──
const caseColors = [
  "rgb(245 158 11 / 0.08)",
  "rgb(139 92 246 / 0.08)",
  "rgb(16 185 129 / 0.08)",
  "rgb(6 182 212 / 0.08)",
  "rgb(239 68 68 / 0.08)",
];

function layoutNodes(
  graphNodes: { id: string; type: DocType; filename: string; ids: string[]; case_id: string }[],
  graphEdges: { source: string; target: string; shared_ids: string[] }[]
): { nodes: Node[]; edges: Edge[]; caseZones: { id: string; bounds: { x: number; y: number; w: number; h: number }; color: string }[] } {
  const cases = new Map<string, string[]>();
  for (const n of graphNodes) {
    const list = cases.get(n.case_id) ?? [];
    list.push(n.id);
    cases.set(n.case_id, list);
  }

  const caseZones: { id: string; bounds: { x: number; y: number; w: number; h: number }; color: string }[] = [];
  const spacing = 320;
  let caseIdx = 0;

  const nodes: Node[] = [];
  const idToPos = new Map<string, { x: number; y: number }>();

  for (const [caseId, nodeIds] of cases) {
    const cx = (caseIdx % 3) * spacing + 200;
    const cy = Math.floor(caseIdx / 3) * spacing + 150;
    const radius = Math.max(60, nodeIds.length * 25);
    const pad = 80;
    caseZones.push({
      id: caseId,
      bounds: { x: cx - radius - pad, y: cy - radius - pad, w: (radius + pad) * 2, h: (radius + pad) * 2 },
      color: caseColors[caseIdx % caseColors.length],
    });

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

  // Use edge label only for edges that are not already part of the backend data
  const edgeSet = new Set(graphEdges.map((e) => `${e.source}->${e.target}`));
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

  return { nodes, edges, caseZones };
}

// ── custom node ──
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
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <p className="text-[11px] font-[var(--font-mono)] mb-1 truncate max-w-[140px]" style={{ color }}>
        {data.filename}
      </p>
      <span
        className="text-[9px] font-[var(--font-mono)] uppercase tracking-[0.1em] px-2 py-0.5 rounded"
        style={{ background: bg, color }}
      >
        {data.docType}
      </span>
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}

const nodeTypes = { documentNode: DocumentNode };

export function CaseGraph() {
  const { data, isLoading, isError } = useGraph();
  const queryClient = useQueryClient();

  const initial = useMemo(() => {
    if (!data) return { nodes: [], edges: [], caseZones: [] };
    return layoutNodes(data.nodes, data.edges);
  }, [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  // sync when data changes
  useMemo(() => {
    if (!data) return;
    const layout = layoutNodes(data.nodes, data.edges);
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [data, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => [
        ...eds,
        {
          id: `manual-${params.source}-${params.target}`,
          source: params.source!,
          target: params.target!,
          animated: true,
          style: { stroke: "var(--color-primary)", strokeWidth: 2, strokeDasharray: "4 2" },
        },
      ]);
    },
    [setEdges]
  );

  if (isLoading) {
    return (
      <div className="w-full border border-dashed border-[var(--color-border)] rounded-lg flex items-center justify-center min-h-[500px]">
        <p className="text-sm text-[var(--color-foreground-subtle)] font-[var(--font-mono)]">Loading graph...</p>
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

  if (!data || data.nodes.length === 0) {
    return (
      <div className="w-full border border-dashed border-[var(--color-border)] rounded-lg flex items-center justify-center min-h-[500px]">
        <p className="text-sm text-[var(--color-foreground-subtle)] font-[var(--font-mono)]">
          No documents uploaded yet — drop files in the Pipeline to see the graph.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full border border-[var(--color-border)] rounded-lg overflow-hidden" style={{ height: 560 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        defaultEdgeOptions={{ animated: false }}
      >
        {/* case halos */}
        {initial.caseZones.map((zone) => (
          <div
            key={zone.id}
            className="absolute pointer-events-none rounded-xl border border-dashed"
            style={{
              left: zone.bounds.x,
              top: zone.bounds.y,
              width: zone.bounds.w,
              height: zone.bounds.h,
              background: zone.color,
              borderColor: zone.color,
            }}
          />
        ))}
        <Background color="var(--color-border)" gap={20} />
        <Controls className="[&_button]:!bg-[var(--color-surface)] [&_button]:!border-[var(--color-border)] [&_button]:!text-[var(--color-foreground-subtle)]" />
      </ReactFlow>
    </div>
  );
}
