import { ARROW_LENGTH } from "./edgeKind";
import { NODE_WIDTH, type Point } from "./graphLayout";

/** 격자의 한 칸에 놓인 노드입니다. column과 row는 0부터 세고, 한 칸에는 노드 하나만 둡니다. */
export type GridNode = { id: string; column: number; row: number; height: number };

export type GridInput = {
  nodes: GridNode[];
  /** 앞 묶음과 다른 묶음이 시작하는 행입니다. 그 위의 틈은 묶음 사이 간격만큼 넓힙니다. */
  componentStarts: ReadonlySet<number>;
  /** from 노드의 변에서 출발해 to 노드의 변으로 들어가는 간선입니다. 화살촉은 to 쪽에 그립니다. */
  edges: { from: string; to: string }[];
};

/** columns와 rows는 열의 왼쪽 끝 x와 행의 위쪽 끝 y이고, points[i]는 edges[i]의 꺾임점입니다. */
export type GridRoutes = { columns: number[]; rows: number[]; points: Point[][] };

const COLUMN_GAP = 72;
const ROW_GAP = 16;
const COMPONENT_GAP = 56;
/** 트랙에서 노드 변까지의 최소 거리입니다. 노드로 들어가는 마지막 구간이 화살촉보다 길어져 화살촉 뒤로 선이 보입니다. */
const END_CLEARANCE = ARROW_LENGTH + 12;
const TRACK_STEP = 10;
/**
 * 트랙을 나누는 동안에는 틈의 크기를 아직 모르므로, 칸과 틈에 번호를 매긴 가상 좌표로 위치를 비교합니다.
 * 틈 g는 2g, 칸 c는 2c+1 번째 구간이고, 칸 안의 위치는 구간 시작에 노드 안 거리를 더합니다.
 */
const BAND = 1_000_000;

type Side = "left" | "right" | "top" | "bottom";
/** axis가 x이면 열 사이 틈 gap에 세로로 놓이는 트랙이고, y이면 행 사이 틈 gap에 가로로 놓이는 트랙입니다. */
type Channel = { axis: "x" | "y"; gap: number };
type Route = { from: GridNode; to: GridNode; start: Side; end: Side; channels: Channel[] };
/** 노드 변 위의 진입점까지 거리입니다. 왼쪽·오른쪽 변은 노드 위쪽 끝부터, 위·아래 변은 노드 왼쪽 끝부터 잽니다. */
type Ports = { start: number; end: number };

/**
 * 격자에 놓인 노드 사이의 간선을 열 사이 틈과 행 사이 틈으로만 지나는 직각 경로로 잇고, 틈의 크기와 노드 좌표를 정합니다.
 * 같은 틈에서 구간이 겹치는 간선은 서로 다른 트랙을 쓰고, 틈은 트랙 수만큼 넓어집니다.
 */
export function routeGrid({ nodes, componentStarts, edges }: GridInput): GridRoutes {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const columnCount = Math.max(0, ...nodes.map(({ column }) => column + 1));
  const rowCount = Math.max(0, ...nodes.map(({ row }) => row + 1));
  const routes = edges.map(({ from, to }) => chooseRoute(byId.get(from)!, byId.get(to)!));
  const ports = assignPorts(routes);
  const tracks = assignTracks(
    routes,
    routes.map((route, index) => virtualPath(route, ports[index]!)),
  );

  const rowHeights = Array.from({ length: rowCount }, (_, row) =>
    Math.max(0, ...nodes.filter((node) => node.row === row).map(({ height }) => height)),
  );
  const straight = (axis: "x" | "y", gap: number) =>
    routes.some(
      ({ channels, start, from }) =>
        channels.length === 0 &&
        (axis === "x"
          ? start === "right" && from.column + 1 === gap
          : !isVertical(start) && (start === "bottom" ? from.row + 1 : from.row) === gap),
    );
  const gapSize = (axis: "x" | "y", gap: number, base: number) => {
    const count = tracks.counts.get(`${axis}:${gap}`) ?? 0;
    if (count === 0 && !straight(axis, gap)) return base;
    return Math.max(base, 2 * END_CLEARANCE + Math.max(0, count - 1) * TRACK_STEP);
  };
  const columnGaps = Array.from({ length: columnCount + 1 }, (_, gap) =>
    gapSize("x", gap, gap === 0 || gap === columnCount ? 0 : COLUMN_GAP),
  );
  const rowGaps = Array.from({ length: rowCount + 1 }, (_, gap) =>
    gapSize(
      "y",
      gap,
      gap === 0 || gap === rowCount ? 0 : componentStarts.has(gap) ? COMPONENT_GAP : ROW_GAP,
    ),
  );
  const columns = offsets(columnGaps, () => NODE_WIDTH);
  const rows = offsets(rowGaps, (row) => rowHeights[row]!);
  const trackPosition = (axis: "x" | "y", gap: number, track: number) => {
    const [sizes, starts, lengths] =
      axis === "x"
        ? [columnGaps, columns, () => NODE_WIDTH]
        : [rowGaps, rows, (at: number) => rowHeights[at]!];
    const gapStart = gap === 0 ? 0 : starts[gap - 1]! + lengths(gap - 1);
    const count = tracks.counts.get(`${axis}:${gap}`)!;
    return gapStart + (sizes[gap]! - (count - 1) * TRACK_STEP) / 2 + track * TRACK_STEP;
  };
  const points = routes.map((route, index) =>
    simplify(
      tracePath(
        route,
        ports[index]!,
        (node) => ({ x: columns[node.column]!, y: rows[node.row]! }),
        (k) => {
          const { axis, gap } = route.channels[k]!;
          return trackPosition(axis, gap, tracks.of[index]![k]!);
        },
      ),
    ),
  );
  return { columns, rows, points };
}

/**
 * 오른쪽 열로 가는 간선은 출발 노드의 오른쪽 변에서 나와 도착 노드의 왼쪽 변으로 들어가고, 사이 열은 행 사이 틈으로 건넙니다.
 * 같은 열의 간선은 위·아래 변으로 잇고, 사이에 다른 노드가 있으면 오른쪽 열 사이 틈으로 돌아갑니다.
 * 왼쪽 열로 돌아가는 간선도 오른쪽 변에서 나와 행 사이 틈으로 돌아 왼쪽 변으로 들어갑니다.
 */
function chooseRoute(from: GridNode, to: GridNode): Route {
  const { column: fromColumn, row: fromRow } = from;
  const { column: toColumn, row: toRow } = to;
  if (fromColumn === toColumn) {
    const down = fromRow < toRow;
    const [start, end]: Side[] = down ? ["bottom", "top"] : ["top", "bottom"];
    if (Math.abs(toRow - fromRow) === 1) return { from, to, start, end, channels: [] };
    return {
      from,
      to,
      start,
      end,
      channels: [
        { axis: "y", gap: down ? fromRow + 1 : fromRow },
        { axis: "x", gap: fromColumn + 1 },
        { axis: "y", gap: down ? toRow : toRow + 1 },
      ],
    };
  }
  const sides = { from, to, start: "right", end: "left" } as const;
  if (toColumn === fromColumn + 1) {
    return { ...sides, channels: fromRow === toRow ? [] : [{ axis: "x", gap: toColumn }] };
  }
  return {
    ...sides,
    channels: [
      { axis: "x", gap: fromColumn + 1 },
      { axis: "y", gap: toRow >= fromRow ? fromRow + 1 : fromRow },
      { axis: "x", gap: toColumn },
    ],
  };
}

/** 출발 변의 점에서 트랙을 차례로 지나 도착 변의 점까지 가는 꺾은선입니다. corner는 노드의 왼쪽 위 좌표입니다. */
function tracePath(
  route: Route,
  ports: Ports,
  corner: (node: GridNode) => Point,
  channelAt: (index: number) => number,
): Point[] {
  let point = sidePoint(route.from, route.start, ports.start, corner);
  const points = [point];
  route.channels.forEach(({ axis }, index) => {
    point =
      axis === "x" ? { x: channelAt(index), y: point.y } : { x: point.x, y: channelAt(index) };
    points.push(point);
  });
  const end = sidePoint(route.to, route.end, ports.end, corner);
  points.push(isVertical(route.end) ? { x: point.x, y: end.y } : { x: end.x, y: point.y }, end);
  return points;
}

function sidePoint(
  node: GridNode,
  side: Side,
  offset: number,
  corner: (node: GridNode) => Point,
): Point {
  const { x, y } = corner(node);
  switch (side) {
    case "left":
      return { x, y: y + offset };
    case "right":
      return { x: x + NODE_WIDTH, y: y + offset };
    case "top":
      return { x: x + offset, y };
    case "bottom":
      return { x: x + offset, y: y + node.height };
  }
}

/** 왼쪽·오른쪽 변입니다. 이 변의 진입점은 세로로 나열되고, 변에 닿는 구간은 가로입니다. */
function isVertical(side: Side) {
  return side === "left" || side === "right";
}

/** 가상 좌표로 그린 경로입니다. 트랙은 아직 번호가 없으므로 틈의 시작에 둡니다. */
function virtualPath(route: Route, ports: Ports): Point[] {
  return tracePath(
    route,
    ports,
    ({ column, row }) => ({ x: (2 * column + 1) * BAND, y: (2 * row + 1) * BAND }),
    (index) => 2 * route.channels[index]!.gap * BAND,
  );
}

/**
 * 같은 틈을 마주 보는 변들(한 행에서 마주 보는 오른쪽·왼쪽 변, 한 열에서 마주 보는 아래·위 변)의 진입점을 함께 나눕니다.
 * 서로 다른 간선이 같은 높이로 틈에 들어가면 그 구간이 겹치므로, 마주 보는 변 사이에서도 진입점을 겹치지 않게 둡니다.
 * 한 틈 안에서 바로 이어지는 간선은 양 끝이 같은 진입점을 써서 곧은 선이 됩니다.
 * 진입점은 간선이 이어서 향하는 쪽 순서로 나열해, 위로 가는 간선이 위쪽 진입점을 쓰게 합니다.
 */
function assignPorts(routes: Route[]): Ports[] {
  /** nodes는 이 진입점을 쓰는 노드입니다. 곧은 선은 양 끝 노드가 진입점 하나를 함께 씁니다. */
  type End = { route: number; at: "start" | "end"; nodes: GridNode[]; key: PortKey };
  const pools = new Map<string, End[]>();
  const provisional = routes.map((route) =>
    virtualPath(route, {
      start: portCenter(route.from, route.start),
      end: portCenter(route.to, route.end),
    }),
  );
  routes.forEach((route, index) => {
    const path = provisional[index]!;
    const straight = route.channels.length === 0;
    const ends: End[] = [
      {
        route: index,
        at: "start",
        nodes: straight ? [route.from, route.to] : [route.from],
        key: portKey(path, route.start, route.to, straight),
      },
    ];
    if (!straight) {
      const back = path.toReversed();
      ends.push({
        route: index,
        at: "end",
        nodes: [route.to],
        key: portKey(back, route.end, route.from, false),
      });
    }
    for (const end of ends) {
      const pool = poolKey(end.nodes[0]!, end.at === "start" ? route.start : route.end);
      pools.set(pool, [...(pools.get(pool) ?? []), end]);
    }
  });
  const ports = routes.map(() => ({ start: 0, end: 0 }));
  for (const [pool, ends] of pools) {
    const extent = pool.startsWith("x")
      ? Math.min(...ends.flatMap(({ nodes }) => nodes.map(({ height }) => height)))
      : NODE_WIDTH;
    ends
      .toSorted((a, b) => compareKeys(a.key, b.key) || a.route - b.route)
      .forEach(({ route, at }, index) => {
        const offset = (extent * (index + 1)) / (ends.length + 1);
        if (at === "start") ports[route]!.start = offset;
        if (at === "end" || routes[route]!.channels.length === 0) ports[route]!.end = offset;
      });
  }
  return ports;
}

function portCenter(node: GridNode, side: Side) {
  return isVertical(side) ? node.height / 2 : NODE_WIDTH / 2;
}

/** 변이 마주 보는 틈과, 그 틈을 따라 같은 높이(또는 같은 x)에 놓이는 행(또는 열)입니다. */
function poolKey({ column, row }: GridNode, side: Side) {
  switch (side) {
    case "left":
      return `x:${column}:${row}`;
    case "right":
      return `x:${column + 1}:${row}`;
    case "top":
      return `y:${row}:${column}`;
    case "bottom":
      return `y:${row + 1}:${column}`;
  }
}

/**
 * 진입점 순서를 정하는 값입니다. moves는 변을 떠난 경로가 진입점이 나열되는 축을 따라 움직이는 거리를 차례로 담고(위·왼쪽이 음수),
 * 곧은 선은 움직이지 않으므로 비어 있습니다. 위로 가는 간선이 위쪽, 곧은 선이 가운데, 아래로 가는 간선이 아래쪽 진입점을 씁니다.
 * 움직임이 같으면 반대쪽 노드까지의 거리로 정합니다. 같은 쪽으로 돌아가는 간선 가운데 먼 노드로 가는 간선이 바깥쪽 진입점을 써야
 * 서로 엇갈리지 않습니다.
 */
type PortKey = { moves: number[]; ties: number[] };

function portKey(path: Point[], side: Side, other: GridNode, straight: boolean): PortKey {
  const axis = isVertical(side) ? "y" : "x";
  const across = isVertical(side) ? "x" : "y";
  const moves = straight
    ? []
    : path
        .slice(1)
        .map((point) => point[axis] - path[0]![axis])
        .filter((move) => move !== 0);
  const distance = Math.abs(path.at(-1)![across] - path[0]![across]);
  return { moves, ties: [distance, other.column, other.row] };
}

function compareKeys(a: PortKey, b: PortKey) {
  for (let at = 0; at < Math.max(a.moves.length, b.moves.length); at++) {
    const difference = (a.moves[at] ?? 0) - (b.moves[at] ?? 0);
    if (difference !== 0) return difference;
  }
  const at = a.ties.findIndex((value, index) => value !== b.ties[index]);
  return at < 0 ? 0 : a.ties[at]! - b.ties[at]!;
}

/**
 * 틈마다 그 틈을 지나는 구간에 트랙 번호를 줍니다. 번호가 작은 트랙이 왼쪽(가로 틈이면 위쪽)입니다.
 * 구간 끝에서 꺾여 나가는 선이 다른 구간을 가로지르지 않도록, 왼쪽으로 꺾여 나가는 구간을 그 구간과 겹치는 구간보다 왼쪽 트랙에 둡니다.
 * 이 순서가 서로 엇갈리면(선이 교차할 수밖에 없으면) 순서를 무시하고 남은 구간을 채웁니다.
 */
function assignTracks(routes: Route[], paths: Point[][]) {
  type Span = {
    route: number;
    channel: number;
    low: number;
    high: number;
    turns: { at: number; toward: number }[];
  };
  const spans = new Map<string, Span[]>();
  routes.forEach(({ channels }, route) => {
    const path = paths[route]!;
    channels.forEach(({ axis, gap }, channel) => {
      const along = axis === "x" ? "y" : "x";
      const [before, first, last, after] = path.slice(channel, channel + 4);
      const span: Span = {
        route,
        channel,
        low: Math.min(first![along], last![along]),
        high: Math.max(first![along], last![along]),
        turns: [
          { at: first![along], toward: Math.sign(before![axis] - first![axis]) },
          { at: last![along], toward: Math.sign(after![axis] - last![axis]) },
        ],
      };
      const key = `${axis}:${gap}`;
      spans.set(key, [...(spans.get(key) ?? []), span]);
    });
  });

  const of = routes.map(({ channels }) => channels.map(() => 0));
  const counts = new Map<string, number>();
  for (const [key, group] of spans) {
    const overlaps = (a: Span, b: Span) => a.low <= b.high && b.low <= a.high;
    /** before.get(b)는 b보다 작은 번호의 트랙에 있어야 하는 구간입니다. */
    const before = new Map<Span, Set<Span>>(group.map((span) => [span, new Set()]));
    for (const a of group)
      for (const b of group) {
        if (a === b || !overlaps(a, b)) continue;
        for (const { at, toward } of a.turns) {
          if (at <= b.low || at >= b.high) continue;
          if (toward < 0) before.get(b)!.add(a);
          if (toward > 0) before.get(a)!.add(b);
        }
      }
    let remaining = group.toSorted((a, b) => a.low - b.low || a.high - b.high || a.route - b.route);
    let track = 0;
    while (remaining.length > 0) {
      const ready = remaining.filter((span) =>
        [...before.get(span)!].every((earlier) => !remaining.includes(earlier)),
      );
      const candidates = ready.length > 0 ? ready : remaining;
      const placed: Span[] = [];
      for (const span of candidates) {
        if (placed.some((other) => overlaps(other, span))) continue;
        placed.push(span);
        of[span.route]![span.channel] = track;
      }
      remaining = remaining.filter((span) => !placed.includes(span));
      track++;
    }
    counts.set(key, track);
  }
  return { of, counts };
}

/** 틈과 칸을 차례로 쌓아 칸마다 시작 좌표를 구합니다. gaps[i]는 칸 i 앞의 틈입니다. */
function offsets(gaps: number[], length: (index: number) => number): number[] {
  const starts: number[] = [];
  let at = 0;
  for (let index = 0; index < gaps.length - 1; index++) {
    at += gaps[index]!;
    starts.push(at);
    at += length(index);
  }
  return starts;
}

/** 길이가 없는 구간과 한 직선 위의 가운데 점을 지웁니다. */
function simplify(points: Point[]): Point[] {
  const distinct = points.filter(
    (point, index) =>
      index === 0 || point.x !== points[index - 1]!.x || point.y !== points[index - 1]!.y,
  );
  return distinct.filter((point, index) => {
    const previous = distinct[index - 1];
    const next = distinct[index + 1];
    if (!previous || !next) return true;
    return !(
      (previous.x === point.x && point.x === next.x) ||
      (previous.y === point.y && point.y === next.y)
    );
  });
}
