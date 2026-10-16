import type { Issue } from "@beads-desk/bd/issue";
import {
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useMemo } from "react";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import { workState } from "@/client/modules/issues/domain/workState";
import { workStateTone } from "@/client/ui/issues/issueLabels";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { type GraphLayout, NODE_HEIGHT, NODE_WIDTH } from "./graphLayout";

type IssueNodeData = { issue: Issue; href: string };
type IssueNode = Node<IssueNodeData, "issue">;

type Props = {
  layout: GraphLayout;
  /** 화면 낭독기가 간선마다 읽을 관계 설명입니다. */
  edgeLabel: (from: string, to: string, type?: string) => string;
  /** smoothstep은 간선을 꺾은 선으로 그립니다. 기본값은 곡선입니다. */
  edgeType?: "default" | "smoothstep";
  issueHref: (issueId: string) => string;
};

/**
 * 탭마다 배치한 이슈를 React Flow로 그립니다. 좌표는 직접 정하므로 노드를 끌거나 잇지 못하게 합니다.
 * 간선에 선 모양(kind)이 있으면 모양마다 class를 붙입니다. 방향이 없는 related에는 화살표를 그리지 않습니다.
 */
export function IssueGraph({ layout, edgeLabel, edgeType = "default", issueHref }: Props) {
  const messages = useMessages();
  const { nodes, edges } = useMemo(
    () => ({
      nodes: layout.nodes.map(({ issue, x, y }): IssueNode => ({
        id: issue.id,
        type: "issue",
        position: { x, y },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        data: { issue, href: issueHref(issue.id) },
      })),
      edges: layout.edges.map(({ from, to, type, kind }): Edge => ({
        id: `${type ?? ""}:${from}->${to}`,
        source: from,
        target: to,
        type: edgeType,
        className: kind && `relation relation-${kind}`,
        markerEnd: kind === "related" ? undefined : { type: MarkerType.ArrowClosed },
        ariaLabel: edgeLabel(from, to, type),
      })),
    }),
    [layout, issueHref, edgeLabel, edgeType],
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
        // 묶음이 많을 때 전체를 한 화면에 맞추면 글자를 읽을 수 없을 만큼 작아지므로, 왼쪽 위부터 원래 크기로 보입니다.
        defaultViewport={{ x: 24, y: 24, zoom: 1 }}
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
        }}
      >
        <Controls showInteractive={false} />
      </ReactFlow>
    </section>
  );
}

/** 노드 전체가 상세 dialog를 여는 링크입니다. 작업 상태 색과 이름은 다른 화면과 같은 workState 기준을 따릅니다. */
function IssueNodeView({ data: { issue, href } }: NodeProps<IssueNode>) {
  const messages = useMessages();
  const state = workState(issue);
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} className="opacity-0" />
      {/*
       * React Flow는 끌기, 선택, 클릭 handler가 없는 노드에 pointer-events: none을 걸므로 링크에서 다시 켭니다.
       * nopan은 링크를 누를 때 그래프가 함께 끌려 움직이지 않게 하는 React Flow의 class입니다.
       */}
      <Link
        href={href}
        scroll={false}
        title={issue.id}
        className="nopan pointer-events-auto flex size-full flex-col gap-1 rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-xs transition hover:border-base-content/30 hover:shadow-sm"
      >
        <span className="flex items-center gap-1.5 text-base-content/55">
          <span className={`tone-dot ${workStateTone(state)}`} />
          {messages.workStates.labels[state]}
          <span className="ml-auto font-mono">{shortIssueId(issue.id)}</span>
        </span>
        <span className="line-clamp-2 text-sm leading-snug font-medium text-base-content">
          {issue.title}
        </span>
      </Link>
      <Handle type="source" position={Position.Right} isConnectable={false} className="opacity-0" />
    </>
  );
}

const NODE_TYPES = { issue: IssueNodeView };
