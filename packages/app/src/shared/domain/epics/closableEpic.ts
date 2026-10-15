export type EpicProgress = {
  epic: { status: string };
  totalChildren: number;
  closedChildren: number;
};

/**
 * bd epic close-eligible과 같은 기준으로, 하위 이슈가 하나 이상이고 모두 닫힌 열린 에픽인지 봅니다.
 * 지금 화면의 개수와 정리 페이지의 목록이 같은 규칙을 써야 두 화면의 숫자가 어긋나지 않습니다.
 */
export function isClosableEpic({ epic, totalChildren, closedChildren }: EpicProgress): boolean {
  return epic.status !== "closed" && totalChildren > 0 && closedChildren === totalChildren;
}
