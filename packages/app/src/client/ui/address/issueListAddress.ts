import {
  parseIssueDateFilter,
  type IssueDateFilter,
} from "@/client/modules/issues/domain/issueDateFilter";
import { ISSUE_TYPES } from "@/client/modules/issues/domain/issueTypes";
import { parseViewState, type WorkState } from "@/client/modules/issues/domain/workState";

const VIEW_PARAM = "view";
const DATE_FIELD_PARAM = "date";
const FROM_PARAM = "from";
const TO_PARAM = "to";
const TYPE_PARAM = "type";
const LABEL_PARAM = "label";

/** 결정은 결정 탭에서 보므로, 유형 조건이 없으면 결정만 뺀 유형을 고른 상태로 엽니다. */
export const DEFAULT_TYPES: readonly string[] = ISSUE_TYPES.filter((type) => type !== "decision");

/** 이슈 목록 주소에 담는 조건입니다. 주소에 남겨 새로고침, 뒤로 가기, 다른 화면의 링크로도 같은 목록을 엽니다. */
export type IssueListAddress = {
  /** null이면 전체 보기입니다. */
  view: WorkState | null;
  dates: IssueDateFilter;
  /** 비어 있으면 모든 유형을 보입니다. */
  types: readonly string[];
  /** 비어 있으면 라벨로 거르지 않습니다. 라벨 없음(NO_LABEL)은 빈 값으로 주소에 남습니다. */
  labels: readonly string[];
};

/**
 * 이슈 목록 주소를 만듭니다. 기본값인 조건(전체 보기, 만든 날 기준, 빈 날짜, 기본 유형 선택, 빈 라벨 선택)은 주소에 넣지 않습니다.
 * 유형을 하나도 고르지 않은 선택은 기본 선택과 구별하려고 빈 값으로 남깁니다.
 */
export function issueListHref({ view, dates, types, labels }: Partial<IssueListAddress>): string {
  const params = new URLSearchParams();
  if (view) params.set(VIEW_PARAM, view);
  if (dates?.field === "closed") params.set(DATE_FIELD_PARAM, dates.field);
  if (dates?.from) params.set(FROM_PARAM, dates.from);
  if (dates?.to) params.set(TO_PARAM, dates.to);
  if (types && !sameTypes(types, DEFAULT_TYPES)) {
    if (types.length === 0) params.set(TYPE_PARAM, "");
    for (const type of types) params.append(TYPE_PARAM, type);
  }
  for (const label of labels ?? []) params.append(LABEL_PARAM, label);
  return params.size > 0 ? `/issues?${params}` : "/issues";
}

/** 이슈 목록에서 이 작업 상태의 보기 탭을 여는 주소입니다. 지금 화면의 개수 카드도 이 주소로 이동합니다. */
export function issueViewHref(state: WorkState): string {
  return issueListHref({ view: state });
}

export function readIssueListAddress(params: URLSearchParams): IssueListAddress {
  return {
    view: parseViewState(params.get(VIEW_PARAM)),
    dates: parseIssueDateFilter(
      params.get(DATE_FIELD_PARAM),
      params.get(FROM_PARAM),
      params.get(TO_PARAM),
    ),
    types: params.has(TYPE_PARAM)
      ? params.getAll(TYPE_PARAM).filter((type) => type !== "")
      : DEFAULT_TYPES,
    labels: params.getAll(LABEL_PARAM),
  };
}

function sameTypes(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((type) => b.includes(type));
}
