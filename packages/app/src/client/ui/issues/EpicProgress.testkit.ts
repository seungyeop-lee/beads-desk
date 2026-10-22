import { expect } from "vitest";
import type { ChildProgress } from "@/client/modules/epics/domain/epicsView";

/**
 * 진행률 막대(EpicProgressBar)가 왼쪽 끝부터 닫힌 구간을, 그 바로 뒤에 진행 중 구간을 하위 이슈 수에 비례한 폭으로 다른 색으로 그렸는지 잽니다.
 * 두 구간은 접근 가능한 이름이 없는 장식 요소라 막대 안의 DOM 구조로 찾습니다.
 */
export function expectEpicProgressSegments(
  bar: Element,
  { closed, inProgress, total }: ChildProgress,
) {
  const [closedSegment, inProgressSegment] = bar.querySelectorAll(":scope > span > span");
  const barBox = bar.getBoundingClientRect();
  const closedBox = closedSegment!.getBoundingClientRect();
  const inProgressBox = inProgressSegment!.getBoundingClientRect();
  const widthOf = (count: number) => (barBox.width * count) / Math.max(total, 1);

  expect(closedBox.left, "닫힌 구간 왼쪽 끝").toBeCloseTo(barBox.left, 0);
  expect(closedBox.width, "닫힌 구간 폭").toBeCloseTo(widthOf(closed), 0);
  expect(inProgressBox.left, "진행 중 구간 왼쪽 끝").toBeCloseTo(closedBox.right, 0);
  expect(inProgressBox.width, "진행 중 구간 폭").toBeCloseTo(widthOf(inProgress), 0);
  expect(getComputedStyle(inProgressSegment!).backgroundColor, "구간 색").not.toBe(
    getComputedStyle(closedSegment!).backgroundColor,
  );
}

/** 진행 중인 하위 이슈 수를 `진행 중 N`이나 `N in progress` 글자로 보인 요소를 찾습니다. 진행 중은 막대 구간으로만 보이므로 화면에 없어야 합니다. */
export const IN_PROGRESS_COUNT_TEXT = /^(진행 중 \d+|\d+ in progress)$/;
