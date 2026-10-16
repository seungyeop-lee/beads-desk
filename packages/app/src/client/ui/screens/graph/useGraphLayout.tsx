import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Issue } from "@beads-desk/bd/issue";
import type { AuxiliaryEdge } from "@/client/modules/graph/domain/centerGraph";
import type { ExecutionOrder } from "@/client/modules/graph/domain/executionOrder";
import {
  centerLayout,
  layeredLayout,
  NODE_HEIGHT,
  NODE_WIDTH,
  PLAN_NODE_HEIGHT,
} from "./graphLayout";
import { IssueCard } from "./IssueCard";

export function useGraphLayout(
  order: ExecutionOrder,
  planned = false,
  center?: { extra: Issue[]; auxiliary: AuxiliaryEdge[]; issue: Issue | undefined },
) {
  const measurementRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<ReadonlyMap<string, number>>(new Map());
  const minimum = planned ? PLAN_NODE_HEIGHT : NODE_HEIGHT;
  const layout = useMemo(() => {
    const main = layeredLayout(order, minimum, heights);
    return center
      ? centerLayout(main, center.extra, center.auxiliary, center.issue, heights)
      : main;
  }, [order, minimum, heights, center]);
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
  return { layout, measurement, ready: layout.nodes.every(({ issue }) => heights.has(issue.id)) };
}
