import type { GraphScope } from "@/client/modules/graph/domain/graphScope";

/**
 * 범위마다 이슈 id를 담는 query 이름입니다.
 * 상세 dialog가 모든 화면에서 issue와 side를 쓰므로 다른 이름을 씁니다. 같은 이름을 쓰면 노드를 눌러 dialog를 열고 닫을 때 범위가 덮이거나 지워집니다.
 */
const SCOPE_PARAMS = { epic: "epic", center: "center" } as const satisfies Record<
  GraphScope["kind"],
  string
>;

export function graphHref({ kind, id }: GraphScope): string {
  return `/graph?${new URLSearchParams({ [SCOPE_PARAMS[kind]]: id })}`;
}

/** 범위가 없으면 null입니다. 그래프는 화면 안의 링크로만 열므로, 둘 다 있는 주소는 에픽 보기로 읽습니다. */
export function readGraphScope(params: URLSearchParams): GraphScope | null {
  for (const kind of ["epic", "center"] as const) {
    const id = params.get(SCOPE_PARAMS[kind]);
    if (id) return { kind, id };
  }
  return null;
}
