import { NON_WORK_TYPES } from "@beads-desk/bd/issue";
import { DEFAULT_TYPES, issueListHref } from "@/client/ui/screens/issues/issueListAddress";

/** 흐름 통계의 처리량 계열입니다. 그날 만든 이슈와 닫은 이슈를 셉니다. */
export const FLOW_SERIES = ["created", "closed"] as const;
export type FlowSeries = (typeof FLOW_SERIES)[number];

/** 처리량은 epic, decision, milestone을 세지 않으므로, 막대에서 여는 목록도 이 유형만 골라 막대의 숫자와 개수를 맞춥니다. */
const FLOW_TYPES = DEFAULT_TYPES.filter((type) => !NON_WORK_TYPES.has(type));

/** 처리량 막대가 여는 이슈 목록 주소입니다. 그날 만들거나 닫은 이슈를 엽니다. */
export function flowBarHref(series: FlowSeries, day: string): string {
  return series === "closed"
    ? issueListHref({
        view: "closed",
        dates: { field: "closed", from: day, to: day },
        types: FLOW_TYPES,
      })
    : issueListHref({ dates: { field: "created", from: day, to: day }, types: FLOW_TYPES });
}
