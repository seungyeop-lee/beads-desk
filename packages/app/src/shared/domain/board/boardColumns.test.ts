import { expect, test } from "vitest";
import { BOARD_COLUMNS } from "./boardColumns";

test("보드 열을 화면 왼쪽부터의 순서로 한 번씩 담는다", () => {
  expect(BOARD_COLUMNS).toEqual(["blocked", "ready", "in_progress", "closed"]);
});
