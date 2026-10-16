import type { Issue } from "@beads-desk/bd/issue";
import {
  BaseEdge,
  Controls,
  type EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
  ViewportPortal,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AuxiliaryEdge } from "@/client/modules/graph/domain/centerGraph";
import type { StageProgress } from "@/client/modules/graph/domain/epicPlan";
import { workState } from "@/client/modules/issues/domain/workState";
import { workStateTone } from "@/client/ui/issues/issueLabels";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { COLUMN_STEP, type GraphLayout, NODE_WIDTH, type PlacedEdge } from "./graphLayout";
import { initialGraphViewport, STAGE_LABEL_HEIGHT } from "./graphViewport";
import { IssueCard, type PlanMarks } from "./IssueCard";

type IssueNodeData = { issue: Issue; href: string; plan?: PlanMarks; center: boolean };
type IssueNode = Node<IssueNodeData, "issue">;
type AuxiliaryFlowEdge = Edge<
  { relation: AuxiliaryEdge["type"]; sourcePosition: Position; targetPosition: Position },
  "auxiliary"
>;
type GraphEdge = BlocksEdge | AuxiliaryFlowEdge;
type BlocksEdge = Edge<Pick<PlacedEdge, "passes" | "bypassX">, "blocks">;

/** 에픽 계획 보기가 단계 이름과 노드 표시를 그리는 데 쓰는 값입니다. 이슈 중심 보기는 넘기지 않습니다. */
export type GraphPlan = {
  stages: StageProgress;
  outside: ReadonlySet<string>;
  waiters: ReadonlyMap<string, number>;
};

type Props = {
  layout: GraphLayout;
  ready?: boolean;
  issueHref: (issueId: string) => string;
  plan?: GraphPlan;
  /** 이슈 중심 보기의 기준 이슈입니다. 이 노드만 다른 노드와 구분되게 그립니다. */
  centerId?: string;
  auxiliary?: AuxiliaryEdge[];
};

/** blocks 실행 순서로 배치한 이슈를 React Flow로 그립니다. 좌표는 직접 정하므로 노드를 끌거나 잇지 못하게 합니다. */
export function IssueGraph({
  layout,
  issueHref,
  plan,
  centerId,
  auxiliary = [],
  ready = true,
}: Props) {
  const containerRef = useRef<HTMLElement>(null);
  const flowRef = useRef<ReactFlowInstance<IssueNode, GraphEdge> | null>(null);
  const layoutRef = useRef(layout);
  const viewportChosen = useRef(false);
  const preserveViewport = () => {
    viewportChosen.current = true;
  };
  useLayoutEffect(() => {
    layoutRef.current = layout;
  }, [layout]);
  const [initialized, setInitialized] = useState(false);
  if (ready && !initialized) setInitialized(true);
  const planned = !!plan;
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !initialized) return;
    const center = () => {
      if (viewportChosen.current) return;
      void flowRef.current?.setViewport(
        initialGraphViewport(
          layoutRef.current,
          container.clientWidth,
          container.clientHeight,
          planned,
        ),
      );
    };
    const observer = new ResizeObserver(center);
    observer.observe(container);
    return () => observer.disconnect();
  }, [initialized, planned]);
  const messages = useMessages();
  const { nodes, edges } = useMemo(
    () => ({
      nodes: layout.nodes.map(({ issue, x, y, height }): IssueNode => ({
        id: issue.id,
        type: "issue",
        position: { x, y },
        width: NODE_WIDTH,
        height,
        data: {
          issue,
          href: issueHref(issue.id),
          center: issue.id === centerId,
          ...(plan && {
            plan: { outside: plan.outside.has(issue.id), waiters: plan.waiters.get(issue.id) ?? 0 },
          }),
        },
      })),
      edges: [
        ...auxiliary.map(({ from, to, type }): AuxiliaryFlowEdge => {
          const sourceY = layout.nodes.find(({ issue }) => issue.id === from)!.y;
          const targetY = layout.nodes.find(({ issue }) => issue.id === to)!.y;
          const sourcePosition = sourceY <= targetY ? Position.Bottom : Position.Top;
          const targetPosition = sourceY < targetY ? Position.Top : Position.Bottom;
          return {
            id: `${type}:${from}->${to}`,
            type: "auxiliary",
            source: from,
            target: to,
            sourceHandle: `${type}-${sourcePosition}`,
            targetHandle: `${type}-${targetPosition}`,
            data: { relation: type, sourcePosition, targetPosition },
            markerEnd: type === "discovered-from" ? { type: MarkerType.Arrow } : undefined,
            ariaLabel:
              type === "related"
                ? messages.graph.relatedEdge(from, to)
                : messages.graph.discoveredEdge(from, to),
          };
        }),
        ...layout.edges.map(({ from, to, passes, bypassX }): BlocksEdge => ({
          id: `${from}->${to}`,
          type: "blocks",
          source: from,
          target: to,
          sourceHandle: "blocks",
          targetHandle: bypassX === undefined ? "blocks" : "same-column",
          data: { passes, bypassX },
          markerEnd: { type: MarkerType.ArrowClosed },
          ariaLabel: messages.graph.edgeLabel(from, to),
        })),
      ],
    }),
    [layout, issueHref, plan, centerId, messages, auxiliary],
  );

  return (
    <section
      ref={containerRef}
      onWheelCapture={preserveViewport}
      onPointerDownCapture={(event) => {
        if ((event.target as Element).closest(".react-flow__minimap")) preserveViewport();
      }}
      aria-label={messages.graph.canvas}
      className="min-h-64 flex-1 overflow-hidden rounded-box border border-base-300 bg-base-100"
    >
      {initialized && (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onInit={(instance) => {
            flowRef.current = instance;
            const container = containerRef.current!;
            void instance.setViewport(
              initialGraphViewport(layout, container.clientWidth, container.clientHeight, planned),
            );
          }}
          onMoveStart={(event) => {
            if (event) preserveViewport();
          }}
          minZoom={0.2}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          ariaLabelConfig={{
            "controls.ariaLabel": messages.graph.controls,
            "controls.zoomIn.ariaLabel": messages.graph.zoomIn,
            "controls.zoomOut.ariaLabel": messages.graph.zoomOut,
            "controls.fitView.ariaLabel": messages.graph.fitView,
            "minimap.ariaLabel": messages.graph.minimap,
          }}
        >
          {plan && <StageLabels stages={plan.stages} />}
          <Controls
            showInteractive={false}
            onZoomIn={preserveViewport}
            onZoomOut={preserveViewport}
            onFitView={preserveViewport}
          />
          <MiniMap pannable zoomable maskStrokeWidth={2} nodeClassName={miniMapNodeClassName} />
        </ReactFlow>
      )}
    </section>
  );
}

/** 열마다 위에 단계 이름을 둡니다. 끝난 단계는 흐리게, 진행 중인 단계는 강조해 보입니다. 노드와 함께 끌리고 확대됩니다. */
function StageLabels({ stages: { total, current } }: { stages: StageProgress }) {
  const messages = useMessages();
  return (
    <ViewportPortal>
      {Array.from({ length: total }, (_, stage) => {
        const name = messages.graph.stage(stage + 1);
        const [tone, label] =
          current === null || stage < current
            ? ["text-base-content/40", `${name} · ${messages.graph.stageDone}`]
            : stage === current
              ? ["text-primary", `${name} · ${messages.graph.stageCurrent}`]
              : ["text-base-content/65", name];
        return (
          <div
            key={stage}
            className={`absolute text-xs font-medium ${tone}`}
            style={{
              width: NODE_WIDTH,
              transform: `translate(${stage * COLUMN_STEP}px, -${STAGE_LABEL_HEIGHT}px)`,
            }}
          >
            {label}
          </div>
        );
      })}
    </ViewportPortal>
  );
}

function IssueNodeView({ data: { issue, href, plan, center } }: NodeProps<IssueNode>) {
  return (
    <>
      <Handle
        id="blocks"
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="opacity-0"
      />
      <Handle
        id="same-column"
        type="target"
        position={Position.Right}
        isConnectable={false}
        className="top-1/4! opacity-0"
      />
      {(["related", "discovered-from"] as const).flatMap((relation) =>
        [Position.Top, Position.Bottom].flatMap((position) =>
          (["source", "target"] as const).map((type) => (
            <Handle
              key={`${relation}-${position}-${type}`}
              id={`${relation}-${position}`}
              type={type}
              position={position}
              isConnectable={false}
              className={`${relation === "related" ? "left-1/3!" : "left-2/3!"} opacity-0`}
            />
          )),
        ),
      )}
      <IssueCard issue={issue} href={href} plan={plan} center={center} />
      <Handle
        id="blocks"
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="opacity-0"
      />
    </>
  );
}

const NODE_TYPES = { issue: IssueNodeView };

/**
 * 이웃한 layer 사이의 빈 칸은 React Flow 기본 간선과 같은 곡선으로 잇고,
 * 사이 layer에서는 배치가 비워 둔 자리를 곧은 선으로 가로질러 노드 밑으로 지나가지 않게 합니다.
 */
function BlocksEdgeView({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd,
}: EdgeProps<BlocksEdge>) {
  if (data?.bypassX !== undefined) {
    const [path] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition: Position.Right,
      targetPosition: Position.Right,
      offset: data.bypassX - sourceX,
    });
    return <BaseEdge path={path} markerEnd={markerEnd} className="graph-blocks" />;
  }
  const curve = (x1: number, y1: number, x2: number, y2: number) =>
    getBezierPath({
      sourceX: x1,
      sourceY: y1,
      sourcePosition: Position.Right,
      targetX: x2,
      targetY: y2,
      targetPosition: Position.Left,
    })[0];
  let path = "";
  let [x, y] = [sourceX, sourceY];
  for (const pass of data?.passes ?? []) {
    path += `${curve(x, y, pass.left, pass.y)} L${pass.right},${pass.y} `;
    [x, y] = [pass.right, pass.y];
  }
  path += curve(x, y, targetX, targetY);
  return <BaseEdge path={path} markerEnd={markerEnd} className="graph-blocks" />;
}

function AuxiliaryEdgeView({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd,
}: EdgeProps<AuxiliaryFlowEdge>) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: data?.sourcePosition ?? Position.Bottom,
    targetPosition: data?.targetPosition ?? Position.Top,
  });
  return (
    <BaseEdge path={path} markerEnd={markerEnd} className={`graph-auxiliary-${data?.relation}`} />
  );
}

const EDGE_TYPES = { blocks: BlocksEdgeView, auxiliary: AuxiliaryEdgeView };

/** 미니맵 노드도 그래프 노드의 상태 점과 같은 tone class로 칠해, 상태별 이슈가 어디에 몰려 있는지 보이게 합니다. */
function miniMapNodeClassName(node: IssueNode): string {
  const tone = workStateTone(workState(node.data.issue));
  return node.data.center ? `${tone} minimap-center` : tone;
}
