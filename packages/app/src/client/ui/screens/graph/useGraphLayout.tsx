import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { blocksEdgeLook } from "@/client/modules/graph/domain/edgeKind";
import type { ExecutionOrder } from "@/client/modules/graph/domain/executionOrder";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  PLAN_NODE_HEIGHT,
} from "@/client/modules/graph/domain/graphLayout";
import { type GraphLayoutInput, layoutGraph } from "@/client/modules/graph/domain/layoutGraph";
import { IssueCard } from "./IssueCard";

export function useGraphLayout(
  order: ExecutionOrder,
  planned = false,
  auxiliary?: GraphLayoutInput["auxiliary"],
) {
  const measurementRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<ReadonlyMap<string, number>>(new Map());
  const minimum = planned ? PLAN_NODE_HEIGHT : NODE_HEIGHT;
  const layout = useMemo(
    () => layoutGraph({ order, heights, nodeHeight: minimum, auxiliary }),
    [order, minimum, heights, auxiliary],
  );
  // 간선 표현은 그래프와 범례가 함께 쓰므로 배치마다 한 번만 계산합니다.
  const edgeLooks = useMemo(
    () => layout.edges.map((edge) => blocksEdgeLook(layout, edge)),
    [layout],
  );
  useLayoutEffect(() => {
    const root = measurementRef.current;
    if (!root) return;
    const measure = () => {
      if (root.getBoundingClientRect().width === 0) return;
      const next = new Map(
        Array.from(root.children, (element) => [
          element.getAttribute("data-issue")!,
          Math.max(minimum, Math.ceil(element.getBoundingClientRect().height)),
        ]),
      );
      setHeights((previous) =>
        next.size === previous.size &&
        [...next].every(([id, height]) => previous.get(id) === height)
          ? previous
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const element of root.children) observer.observe(element);
    return () => observer.disconnect();
  }, [order, minimum]);
  const measurement = (
    <div
      ref={measurementRef}
      aria-hidden
      inert
      className="pointer-events-none invisible fixed -left-[10000px] top-0"
      style={{ width: NODE_WIDTH }}
    >
      {layout.nodes.map(({ issue }) => (
        <div key={issue.id} data-issue={issue.id}>
          <IssueCard
            issue={issue}
            href="#"
            plan={planned ? { outside: true, waiters: 1 } : undefined}
          />
        </div>
      ))}
    </div>
  );
  return {
    layout,
    edgeLooks,
    measurement,
    ready: layout.nodes.every(({ issue }) => heights.has(issue.id)),
  };
}
