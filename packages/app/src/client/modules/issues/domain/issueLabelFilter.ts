import { HUMAN_LABEL, type Issue } from "@beads-desk/bd/issue";

/** 라벨이 하나도 없는 이슈를 고르는 선택 값입니다. bd는 빈 라벨을 저장하지 않아 실제 라벨 이름과 겹치지 않습니다. */
export const NO_LABEL = "";

/** 고른 라벨이 없으면 모든 이슈가 맞습니다. 고른 라벨 중 하나라도 붙었거나, NO_LABEL을 골랐고 라벨이 없으면 맞습니다. */
export function matchesLabels(issue: Issue, labels: readonly string[]): boolean {
  if (labels.length === 0) return true;
  if (issue.labels.length === 0) return labels.includes(NO_LABEL);
  return issue.labels.some((label) => labels.includes(label));
}

/**
 * 화면에 라벨로 보일 목록에서 human 라벨을 뺍니다.
 * human 라벨은 제목 옆의 판단 기다림 표시와 겹쳐 보이므로 라벨 칸과 남은 개수에 넣지 않습니다.
 */
export function visibleLabels(labels: readonly string[]): string[] {
  return labels.filter((label) => label !== HUMAN_LABEL);
}

/**
 * 라벨 메뉴의 선택지입니다. NO_LABEL을 맨 앞에 두고, 이슈들에 붙은 라벨을 이름순으로 한 번씩 둡니다.
 * 주소로 고른 라벨이 이슈에 없어도 선택지에 넣어, 사용자가 그 선택을 해제할 수 있게 합니다.
 */
export function labelChoices(issues: Issue[], selected: readonly string[]): string[] {
  const labels = new Set([...issues.flatMap((issue) => issue.labels), ...selected]);
  labels.delete(NO_LABEL);
  return [NO_LABEL, ...[...labels].sort((a, b) => a.localeCompare(b))];
}
