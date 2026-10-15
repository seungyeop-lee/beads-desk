import { describe, expect, test } from "vitest";
import { isClosableEpic } from "./closableEpic";

function epic(totalChildren: number, closedChildren: number, status = "open") {
  return { epic: { status }, totalChildren, closedChildren };
}

describe("isClosableEpic", () => {
  test("하위 이슈가 하나 이상이고 모두 닫힌 열린 에픽이면 닫을 수 있다", () => {
    expect(isClosableEpic(epic(2, 2))).toBe(true);
    expect(isClosableEpic(epic(2, 2, "in_progress"))).toBe(true);
  });

  test("닫히지 않은 하위 이슈가 있거나 하위 이슈가 없거나 이미 닫힌 에픽은 아니다", () => {
    expect(isClosableEpic(epic(2, 1))).toBe(false);
    expect(isClosableEpic(epic(0, 0))).toBe(false);
    expect(isClosableEpic(epic(1, 1, "closed"))).toBe(false);
  });
});
