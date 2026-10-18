import type { Issue } from "@beads-desk/bd/issue";
import {
  BaseEdge,
  ControlButton,
  Controls,
  type EdgeProps,
  Handle,
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
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { StageProgress } from "@/client/modules/graph/domain/epicPlan";
import { workState } from "@/client/modules/issues/domain/workState";
import { workStateTone } from "@/client/ui/issues/issueLabels";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import {
  auxiliaryEdgeLook,
  blocksEdgeLook,
  type EdgeLook,
  EdgeMarkers,
  edgeMarkerId,
  edgeStyle,
} from "./edgeLook";
import { type GraphLayout, NODE_WIDTH, type Point } from "./graphLayout";
import {
  focusViewport,
  initialGraphViewport,
  issueFocus,
  STAGE_LABEL_HEIGHT,
  stageFocus,
} from "./graphViewport";
import { IssueCard, type PlanMarks } from "./IssueCard";

type IssueNodeData = { issue: Issue; href: string; plan?: PlanMarks; center: boolean };
type IssueNode = Node<IssueNodeData, "issue">;
/** 배치 엔진이 정한 꺾임점을 그대로 잇는 간선입니다. */
type GraphEdge = Edge<{ points: Point[]; look: EdgeLook }, "route">;

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
};

/**
 * 배치 엔진이 정한 노드 좌표와 간선 꺾임점을 React Flow로 그립니다. 경로는 여기서 계산하지 않습니다.
 * 좌표는 직접 정하므로 노드를 끌거나 잇지 못하게 합니다.
 */
export function IssueGraph({ layout, issueHref, plan, centerId, ready = true }: Props) {
  const containerRef = useRef<HTMLElement>(null);
  const flowRef = useRef<ReactFlowInstance<IssueNode, GraphEdge> | null>(null);
  const focus = useMemo(
    () =>
      plan
        ? stageFocus(layout, plan.stages)
        : centerId === undefined
          ? undefined
          : issueFocus(layout, centerId),
    [layout, plan, centerId],
  );
  const viewRef = useRef({ layout, focus });
  const viewportChosen = useRef(false);
  const preserveViewport = () => {
    viewportChosen.current = true;
  };
  useLayoutEffect(() => {
    viewRef.current = { layout, focus };
  }, [layout, focus]);
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
          viewRef.current.layout,
          container.clientWidth,
          container.clientHeight,
          planned,
          viewRef.current.focus,
        ),
      );
    };
    const observer = new ResizeObserver(center);
    observer.observe(container);
    return () => observer.disconnect();
  }, [initialized, planned]);
  const messages = useMessages();
  const focusLabel = !plan
    ? messages.graph.focusIssue
    : plan.stages.current === null
      ? messages.graph.focusLastStage
      : messages.graph.focusStage;
  const showFocus = () => {
    const flow = flowRef.current;
    const container = containerRef.current;
    if (!flow || !container || !focus) return;
    preserveViewport();
    void flow.setViewport(
      focusViewport(focus, container.clientWidth, container.clientHeight, flow.getZoom()),
    );
  };
  const markerPrefix = `edge${useId().replace(/\W/g, "")}`;
  const { nodes, edges } = useMemo(() => {
    const gates = new Set(
      layout.nodes.filter(({ issue }) => issue.issueType === "gate").map(({ issue }) => issue.id),
    );
    return {
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
        ...layout.edges.map(({ from, to, points }): GraphEdge => {
          const look = blocksEdgeLook(layout, { from, to });
          // 이슈 중심 보기는 gate와 이어진 간선을 대기 조건으로 읽어 줍니다. 에픽 계획 보기는 실행 순서로 읽습니다.
          const condition = !plan && [from, to].some((id) => gates.has(id));
          return {
            id: `${from}->${to}`,
            type: "route",
            source: from,
            target: to,
            data: { points, look },
            markerEnd: edgeMarkerId(markerPrefix, look),
            ariaLabel: condition
              ? messages.graph.conditionEdge(from, to)
              : messages.graph.edgeLabel(from, to),
          };
        }),
        ...layout.auxiliary.map(({ from, to, type, points }): GraphEdge => {
          const look = auxiliaryEdgeLook(type);
          return {
            id: `${type}:${from}->${to}`,
            type: "route",
            source: from,
            target: to,
            data: { points, look },
            markerEnd: edgeMarkerId(markerPrefix, look),
            ariaLabel:
              type === "related"
                ? messages.graph.relatedEdge(from, to)
                : messages.graph.discoveredEdge(from, to),
          };
        }),
      ],
    };
  }, [layout, issueHref, plan, centerId, messages, markerPrefix]);

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
      <EdgeMarkers idPrefix={markerPrefix} />
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
              initialGraphViewport(
                layout,
                container.clientWidth,
                container.clientHeight,
                planned,
                focus,
              ),
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
          {plan && <StageLabels stages={plan.stages} columns={layout.columns} />}
          <Controls
            showInteractive={false}
            onZoomIn={preserveViewport}
            onZoomOut={preserveViewport}
            onFitView={preserveViewport}
          >
            {focus && (
              <ControlButton onClick={showFocus} title={focusLabel} aria-label={focusLabel}>
                <FocusIcon />
              </ControlButton>
            )}
          </Controls>
          <MiniMap pannable zoomable maskStrokeWidth={2} nodeClassName={miniMapNodeClassName} />
        </ReactFlow>
      )}
    </section>
  );
}

/**
 * 열마다 위에 단계 이름을 둡니다. 끝난 단계는 흐리게, 진행 중인 단계는 강조해 보입니다. 노드와 함께 끌리고 확대됩니다.
 * columns는 배치 결과의 열 좌표이고, 단계 번호는 gate를 뺀 열 번호와 같습니다.
 */
function StageLabels({
  stages: { total, current },
  columns,
}: {
  stages: StageProgress;
  columns: number[];
}) {
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
              transform: `translate(${columns[stage] ?? 0}px, -${STAGE_LABEL_HEIGHT}px)`,
            }}
          >
            {label}
          </div>
        );
      })}
    </ViewportPortal>
  );
}

/** React Flow는 조작 막대 단추의 svg를 글자색으로 채우므로, 선으로 그리는 원은 fill을 직접 꺼야 속이 비어 보입니다. */
function FocusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M11 0h2v5h-2zM11 19h2v5h-2zM0 11h5v2H0zM19 11h5v2h-5z" />
    </svg>
  );
}

/** 간선은 꺾임점으로 직접 그리므로, handle은 React Flow가 간선을 노드에 연결하는 데만 씁니다. */
function IssueNodeView({ data: { issue, href, plan, center } }: NodeProps<IssueNode>) {
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} className="opacity-0" />
      <IssueCard issue={issue} href={href} plan={plan} center={center} />
      <Handle type="source" position={Position.Right} isConnectable={false} className="opacity-0" />
    </>
  );
}

const NODE_TYPES = { issue: IssueNodeView };

function RouteEdgeView({ data, markerEnd }: EdgeProps<GraphEdge>) {
  if (!data) return null;
  const path = data.points.map(({ x, y }, at) => `${at === 0 ? "M" : "L"}${x},${y}`).join(" ");
  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      style={edgeStyle(data.look)}
      data-edge={data.look.kind}
    />
  );
}

const EDGE_TYPES = { route: RouteEdgeView };

/** 미니맵 노드도 그래프 노드의 상태 점과 같은 tone class로 칠해, 상태별 이슈가 어디에 몰려 있는지 보이게 합니다. */
function miniMapNodeClassName(node: IssueNode): string {
  const tone = workStateTone(workState(node.data.issue));
  return node.data.center ? `${tone} minimap-center` : tone;
}
