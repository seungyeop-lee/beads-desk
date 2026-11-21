import { type GraphLayout, NODE_WIDTH, type PlacedIssue, type Point } from "./graphLayout";

export function routeProblem(layout: GraphLayout): string | undefined {
  for (const edge of [...layout.edges, ...layout.auxiliary]) {
    const { from, to, points } = edge;
    const id = `${from}->${to}`;
    if (points.length < 2) return `${id}: 양 끝점 없음`;
    const a = layout.nodeOf.get(from)!;
    const b = layout.nodeOf.get(to)!;
    const first = points[0]!;
    const last = points.at(-1)!;
    const joinsNodes =
      (onBorder(first, a) && onBorder(last, b)) ||
      ("type" in edge && edge.type === "related" && onBorder(first, b) && onBorder(last, a));
    if (!joinsNodes) return `${id}: 양 끝점이 연결한 카드의 변을 벗어남`;
    for (let i = 1; i < points.length; i++) {
      const start = points[i - 1]!;
      const end = points[i]!;
      if (start.x !== end.x && start.y !== end.y) return `${id}: 대각선 선분`;
      const left = Math.min(start.x, end.x);
      const right = Math.max(start.x, end.x);
      const top = Math.min(start.y, end.y);
      const bottom = Math.max(start.y, end.y);
      const crossed = layout.nodes.find(
        ({ x, y, height }) => right > x && left < x + NODE_WIDTH && bottom > y && top < y + height,
      );
      if (crossed) return `${id}: ${crossed.issue.id} 카드를 가로지름`;
    }
  }
}

function onBorder({ x, y }: Point, node: PlacedIssue) {
  const right = node.x + NODE_WIDTH;
  const bottom = node.y + node.height;
  return (
    ((x === node.x || x === right) && node.y <= y && y <= bottom) ||
    ((y === node.y || y === bottom) && node.x <= x && x <= right)
  );
}

export function overlappingPair({ nodes }: GraphLayout): string[] | undefined {
  for (const [index, a] of nodes.entries()) {
    const overlap = nodes.find(
      (b, at) =>
        at > index &&
        a.x < b.x + NODE_WIDTH &&
        b.x < a.x + NODE_WIDTH &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height,
    );
    if (overlap) return [a.issue.id, overlap.issue.id];
  }
}
