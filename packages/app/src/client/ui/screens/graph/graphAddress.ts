import type { GraphFilter } from "@/client/modules/graph/domain/graphFilter";
import { WORK_STATE_ORDER, type WorkState } from "@/client/modules/issues/domain/workState";

/** 의존 그래프의 관점별 탭입니다. */
export const GRAPH_TABS = ["order", "hierarchy", "relations"] as const;
export type GraphTab = (typeof GRAPH_TABS)[number];

const TAB_PARAM = "tab";
const EPIC_PARAM = "epic";
const TYPE_PARAM = "type";
const STATE_PARAM = "state";
const CLOSED_PARAM = "closed";

/** 의존 그래프 주소에 담는 조건입니다. 새로고침과 링크로도 같은 그래프를 엽니다. */
export type GraphAddress = GraphFilter & { tab: GraphTab; includeClosed: boolean };

/** 기본값인 조건(첫 탭, 모든 에픽, 모든 유형, 모든 작업 상태, 닫힌 이슈 제외)은 주소에 넣지 않습니다. */
export function graphHref({ tab, epic, types, states, includeClosed }: GraphAddress): string {
  const params = new URLSearchParams();
  if (tab !== GRAPH_TABS[0]) params.set(TAB_PARAM, tab);
  if (epic) params.set(EPIC_PARAM, epic);
  for (const type of types) params.append(TYPE_PARAM, type);
  for (const state of states) params.append(STATE_PARAM, state);
  if (includeClosed) params.set(CLOSED_PARAM, "1");
  return params.size > 0 ? `/graph?${params}` : "/graph";
}

export function readGraphAddress(params: URLSearchParams): GraphAddress {
  return {
    tab: GRAPH_TABS.find((tab) => tab === params.get(TAB_PARAM)) ?? GRAPH_TABS[0],
    epic: params.get(EPIC_PARAM) || null,
    types: params.getAll(TYPE_PARAM).filter((type) => type !== ""),
    states: params
      .getAll(STATE_PARAM)
      .filter((state): state is WorkState => (WORK_STATE_ORDER as string[]).includes(state)),
    includeClosed: params.get(CLOSED_PARAM) === "1",
  };
}
