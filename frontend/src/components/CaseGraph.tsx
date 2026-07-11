import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useInternalNode,
  useNodesState,
  type Node,
  type Edge,
  type EdgeProps,
  type InternalNode,
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
  remittance_advice: "#B79BFF",
  promo_agreement: "#8CB9FF",
  unknown: "#71819A",
};

const typeColorBg: Record<DocType, string> = {
  invoice: "rgb(246 166 35 / 0.14)",
  purchase_order: "rgb(106 168 255 / 0.14)",
  contract: "rgb(43 203 136 / 0.14)",
  delivery_docket: "rgb(68 196 224 / 0.14)",
  remittance_advice: "rgb(183 155 255 / 0.14)",
  promo_agreement: "rgb(140 185 255 / 0.14)",
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
    type: "floating",
    animated: false,
    style: { stroke: "var(--color-border-light)", strokeWidth: 1.5 },
    data: { label: e.shared_ids.join(", ") },
  }));

  return { nodes, edges };
}

// Center of a node in flow coordinates.
function nodeCenter(node: InternalNode) {
  const { x, y } = node.internals.positionAbsolute;
  return { x: x + (node.measured.width ?? 0) / 2, y: y + (node.measured.height ?? 0) / 2 };
}

// Floating edge: draws a straight line between node centers (the opaque node
// bodies mask the overlapping ends). This keeps every shared-evidence link
// visible regardless of where the circular layout places the nodes — a fixed
// top/bottom handle would route edges awkwardly across the ring.
function FloatingEdge({ id, source, target, style, data }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;

  const s = nodeCenter(sourceNode);
  const t = nodeCenter(targetNode);
  const [path, labelX, labelY] = getStraightPath({ sourceX: s.x, sourceY: s.y, targetX: t.x, targetY: t.y });
  const label = (data as { label?: string } | undefined)?.label;

  return (
    <>
      <BaseEdge id={id} path={path} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded bg-[var(--color-surface)] px-1.5 py-0.5 font-[var(--font-mono)] text-[9px] tracking-[0.02em] text-[var(--color-foreground-subtle)]"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { floating: FloatingEdge };

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
      {/* Hidden handles: the floating edge computes its own geometry, but React
          Flow still needs a handle on each end to register the connection. */}
      <Handle type="target" position={Position.Top} isConnectable={false} className="!h-0 !w-0 !min-w-0 !border-0 !bg-transparent" />
      <p className="mb-1.5 max-w-[140px] truncate text-[11px] font-semibold" style={{ color }}>
        {data.filename}
      </p>
      <span
        className="rounded-[4px] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]"
        style={{ background: bg, color }}
      >
        {data.docType}
      </span>
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="!h-0 !w-0 !min-w-0 !border-0 !bg-transparent" />
    </div>
  );
}

const nodeTypes = { documentNode: DocumentNode };

interface CaseGraphProps {
  graph?: GraphResponse;
  isLoading: boolean;
  isError: boolean;
  caseId?: string | null;
  compact?: boolean;
}

export function CaseGraph({ graph, isLoading, isError, caseId, compact = false }: CaseGraphProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const { initialNodes, edges } = useMemo(() => {
    if (!graph) return { initialNodes: [] as Node[], edges: [] as Edge[] };
    const laid = layoutNodes(graph.nodes, graph.edges);
    return { initialNodes: laid.nodes, edges: laid.edges };
  }, [graph]);

  // Nodes live in state so drags stick; the floating edges recompute from these
  // live positions, so moving a node re-routes its connections automatically.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);

  useEffect(() => {
    setNodes(initialNodes);
    setSelectedDocId(null);
  }, [initialNodes, setNodes]);

  if (isLoading) {
    return (
      <div className={compact ? "workspace-bezel flex h-full min-h-0 w-full flex-col items-center justify-center gap-3 rounded-xl" : "workspace-bezel flex min-h-[440px] w-full flex-col items-center justify-center gap-3 rounded-xl 2xl:min-h-[560px]"}>
        <Spinner className="h-5 w-5" />
        <p className="text-sm text-[var(--color-foreground-subtle)] font-[var(--font-mono)]">Loading graph</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={compact ? "workspace-bezel flex h-full min-h-0 w-full items-center justify-center rounded-xl" : "workspace-bezel flex min-h-[440px] w-full items-center justify-center rounded-xl 2xl:min-h-[560px]"}>
        <p className="text-sm text-[var(--color-destructive)] font-[var(--font-mono)]">Failed to load document graph.</p>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className={compact ? "workspace-bezel flex h-full min-h-0 w-full items-center justify-center rounded-xl" : "workspace-bezel flex min-h-[440px] w-full items-center justify-center rounded-xl 2xl:min-h-[560px]"}>
        <p className="text-sm text-[var(--color-foreground-subtle)] font-[var(--font-mono)]">
          This case has no resolved documents yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={compact ? "workspace-bezel relative h-full min-h-0 w-full overflow-hidden rounded-xl" : "workspace-bezel relative w-full overflow-hidden rounded-xl"} style={{ height: compact ? "100%" : "clamp(440px, calc(100dvh - 240px), 560px)" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={(_event, node) => setSelectedDocId(node.id)}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          defaultEdgeOptions={{ animated: false }}
          nodesConnectable={false}
          edgesReconnectable={false}
          zoomOnScroll={false}
          minZoom={0.4}
          maxZoom={1.75}
        >
          <Background color="#263650" gap={22} />
          <Controls className="!rounded-md !border-[var(--color-border)] !bg-[var(--color-surface-raised)] !shadow-lg [&_button]:!border-[var(--color-border)] [&_button]:!bg-[var(--color-surface-raised)] [&_button]:!text-[var(--color-foreground-muted)] [&_button:hover]:!bg-[var(--color-surface-hover)]" />
        </ReactFlow>
      </div>
      <DocumentDetailPanel documentId={selectedDocId} caseId={caseId} onClose={() => setSelectedDocId(null)} />
    </>
  );
}
