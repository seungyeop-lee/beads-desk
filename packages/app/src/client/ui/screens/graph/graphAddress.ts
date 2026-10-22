import type { GraphScope } from "@/client/modules/graph/domain/graphScope";
import { ISSUE_DETAIL_PARAMS } from "@/client/ui/issues/issueDetailParams";
import { SCREEN_PATHS } from "@/shared/domain/screenPaths";

/**
 * 범위마다 이슈 id를 담는 query 이름입니다.
 * 상세 dialog가 모든 화면에서 issue와 side를 쓰므로 다른 이름을 씁니다. 같은 이름을 쓰면 노드를 눌러 dialog를 열고 닫을 때 범위가 덮이거나 지워집니다.
 */
const SCOPE_PARAMS = { epic: "epic", center: "center" } as const satisfies Record<
  GraphScope["kind"],
  string
>;

const RETURN_PARAM = "returnTo";

export function graphHref(scope: GraphScope, from?: string): string {
  const params = new URLSearchParams({ [SCOPE_PARAMS[scope.kind]]: scope.id });
  if (!from) return `/graph?${params}`;

  const source = readScreenAddress(from);
  if (!source) return `/graph?${params}`;
  const trail = readReturnTrail(source.searchParams) ?? [];
  source.searchParams.delete(RETURN_PARAM);
  const sourceScope = readGraphScope(source.searchParams);
  if (sourceScope?.kind !== scope.kind || sourceScope.id !== scope.id) {
    trail.push(`${source.pathname}${source.search}`);
  }
  for (const key of ["epic", "center", ...ISSUE_DETAIL_PARAMS]) source.searchParams.delete(key);
  for (const [key, value] of source.searchParams) params.append(key, value);
  for (const address of trail) params.append(RETURN_PARAM, address);
  return `${source.pathname}?${params}`;
}

export function graphBackHref(scope: GraphScope, params: URLSearchParams): string {
  const trail = readReturnTrail(params);
  const previous = trail?.pop();
  if (!previous) {
    return scope.kind === "epic" ? "/epics" : `/issues?${new URLSearchParams({ issue: scope.id })}`;
  }
  const target = readScreenAddress(previous)!;
  if (readGraphScope(target.searchParams)) {
    for (const address of trail!) target.searchParams.append(RETURN_PARAM, address);
  }
  return `${target.pathname}${target.search}`;
}

/**
 * 그래프를 처음 연 화면 주소의 query입니다. 그래프 아래에 깔린 화면의 상세 dialog는 이 query의 issue·side를 보여 줍니다.
 * 그래프를 이어 열어도 복귀 정보의 첫 주소는 바뀌지 않으므로, 아래의 상세는 그래프를 모두 닫을 때까지 같은 이슈를 보여 줍니다.
 * 복귀 정보가 없거나 잘못됐을 때, 첫 주소가 그래프이거나 지금 화면과 다른 화면일 때는 null입니다.
 */
export function graphOriginParams(
  params: URLSearchParams,
  pathname: string,
): URLSearchParams | null {
  const first = readReturnTrail(params)?.[0];
  const origin = first ? readScreenAddress(first) : null;
  if (!origin || origin.pathname !== pathname || readGraphScope(origin.searchParams)) return null;
  return origin.searchParams;
}

function readReturnTrail(params: URLSearchParams): string[] | null {
  const trail = params.getAll(RETURN_PARAM);
  return trail.every((address) => {
    const screen = readScreenAddress(address);
    return screen && !screen.searchParams.has(RETURN_PARAM);
  })
    ? trail
    : null;
}

function readScreenAddress(address: string): URL | null {
  if (
    !address.startsWith("/") ||
    address.startsWith("//") ||
    /[\\#]/.test(address) ||
    [...address].some((character) => character <= " ")
  ) {
    return null;
  }
  try {
    decodeURIComponent(address);
    const url = new URL(address, "http://localhost");
    if (url.pathname !== address.split("?")[0]) return null;
    if (url.pathname === "/graph") return readGraphScope(url.searchParams) ? url : null;
    return SCREEN_PATHS.has(url.pathname) ? url : null;
  } catch {
    return null;
  }
}

/** 범위가 없으면 null입니다. 그래프는 화면 안의 링크로만 열므로, 둘 다 있는 주소는 에픽 보기로 읽습니다. */
export function readGraphScope(params: URLSearchParams): GraphScope | null {
  for (const kind of ["epic", "center"] as const) {
    const id = params.get(SCOPE_PARAMS[kind]);
    if (id) return { kind, id };
  }
  return null;
}
