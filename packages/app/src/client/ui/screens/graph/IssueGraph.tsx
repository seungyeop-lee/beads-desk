import type { Issue } from "@beads-desk/bd/issue";
import {
  BaseEdge,
  Controls,
  type EdgeProps,
  getBezierPath,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  ViewportPortal,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import type { StageProgress } from "@/client/modules/graph/domain/epicPlan";
import { workState } from "@/client/modules/issues/domain/workState";
import { workStateTone } from "@/client/ui/issues/issueLabels";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { COLUMN_STEP, type GraphLayout, NODE_WIDTH, type PassingSegment } from "./graphLayout";
import { IssueCard, type PlanMarks } from "./IssueCard";

type IssueNodeData = { issue: Issue; href: string; plan?: PlanMarks; center: boolean };
type IssueNode = Node<IssueNodeData, "issue">;
type BlocksEdge = Edge<{ passes: PassingSegment[] }, "blocks">;

/** 에픽 계획 보기가 단계 이름과 노드 표시를 그리는 데 쓰는 값입니다. 이슈 중심 보기는 넘기지 않습니다. */
export type GraphPlan = {
  stages: StageProgress;
  outside: ReadonlySet<string>;
  waiters: ReadonlyMap<string, number>;
};

type Props = {
  layout: GraphLayout;
  issueHref: (issueId: string) => string;
  plan?: GraphPlan;
  /** 이슈 중심 보기의 기준 이슈입니다. 이 노드만 다른 노드와 구분되게 그립니다. */
  centerId?: string;
};

/** 노드 위에 단계 이름을 두는 높이입니다. 처음 보이는 위치를 이만큼 내려 단계 이름이 잘리지 않게 합니다. */
const STAGE_LABEL_HEIGHT = 32;
const VIEWPORT_MARGIN = 24;

/** blocks 실행 순서로 배치한 이슈를 React Flow로 그립니다. 좌표는 직접 정하므로 노드를 끌거나 잇지 못하게 합니다. */
export function IssueGraph({ layout, issueHref, plan, centerId }: Props) {
  const messages = useMessages();
  const { nodes, edges } = useMemo(
    () => ({
      nodes: layout.nodes.map(({ issue, x, y }): IssueNode => ({
        id: issue.id,
        type: "issue",
        position: { x, y },
        width: NODE_WIDTH,
        height: layout.nodeHeight,
        data: {
          issue,
          href: issueHref(issue.id),
          center: issue.id === centerId,
          ...(plan && {
            plan: { outside: plan.outside.has(issue.id), waiters: plan.waiters.get(issue.id) ?? 0 },
          }),
        },
      })),
      edges: layout.edges.map(({ from, to, passes }): BlocksEdge => ({
        id: `${from}->${to}`,
        type: "blocks",
        source: from,
        target: to,
        data: { passes },
        markerEnd: { type: MarkerType.ArrowClosed },
        ariaLabel: messages.graph.edgeLabel(from, to),
      })),
    }),
    [layout, issueHref, plan, centerId, messages],
  );

  return (
    <section
      aria-label={messages.graph.canvas}
      className="min-h-64 flex-1 overflow-hidden rounded-box border border-base-300 bg-base-100"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        // 묶음이 많을 때 전체를 한 화면에 맞추면 글자를 읽을 수 없을 만큼 작아지므로, 왼쪽 위부터 원래 크기로 보입니다.
        defaultViewport={{
          x: VIEWPORT_MARGIN,
          y: VIEWPORT_MARGIN + (plan ? STAGE_LABEL_HEIGHT : 0),
          zoom: 1,
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
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable maskStrokeWidth={2} nodeClassName={miniMapNodeTone} />
      </ReactFlow>
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
      <Handle type="target" position={Position.Left} isConnectable={false} className="opacity-0" />
      <IssueCard issue={issue} href={href} plan={plan} center={center} />
      <Handle type="source" position={Position.Right} isConnectable={false} className="opacity-0" />
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
  return <BaseEdge path={path} markerEnd={markerEnd} />;
}

const EDGE_TYPES = { blocks: BlocksEdgeView };

/** 미니맵 노드도 그래프 노드의 상태 점과 같은 tone class로 칠해, 상태별 이슈가 어디에 몰려 있는지 보이게 합니다. */
function miniMapNodeTone(node: IssueNode): string {
  return workStateTone(workState(node.data.issue));
}
