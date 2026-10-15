import {
  parseIssueDateFilter,
  type IssueDateFilter,
} from "@/client/modules/issues/domain/issueDateFilter";
import { parseViewState, type WorkState } from "@/client/modules/issues/domain/workState";

const VIEW_PARAM = "view";
const DATE_FIELD_PARAM = "date";
const FROM_PARAM = "from";
const TO_PARAM = "to";

/** 이슈 목록 주소에 담는 조건입니다. 주소에 남겨 새로고침, 뒤로 가기, 다른 화면의 링크로도 같은 목록을 엽니다. */
export type IssueListAddress = {
  /** null이면 전체 보기입니다. */
  view: WorkState | null;
  dates: IssueDateFilter;
};

/** 이슈 목록 주소를 만듭니다. 기본값인 조건(전체 보기, 만든 날 기준, 빈 날짜)은 주소에 넣지 않습니다. */
export function issueListHref(view: WorkState | null, dates?: IssueDateFilter): string {
  const params = new URLSearchParams();
  if (view) params.set(VIEW_PARAM, view);
  if (dates?.field === "closed") params.set(DATE_FIELD_PARAM, dates.field);
  if (dates?.from) params.set(FROM_PARAM, dates.from);
  if (dates?.to) params.set(TO_PARAM, dates.to);
  return params.size > 0 ? `/issues?${params}` : "/issues";
}

/** 이슈 목록에서 이 작업 상태의 보기 탭을 여는 주소입니다. 지금 화면의 개수 카드도 이 주소로 이동합니다. */
export function issueViewHref(state: WorkState): string {
  return issueListHref(state);
}

export function readIssueListAddress(params: URLSearchParams): IssueListAddress {
  return {
    view: parseViewState(params.get(VIEW_PARAM)),
    dates: parseIssueDateFilter(
      params.get(DATE_FIELD_PARAM),
      params.get(FROM_PARAM),
      params.get(TO_PARAM),
    ),
  };
}
