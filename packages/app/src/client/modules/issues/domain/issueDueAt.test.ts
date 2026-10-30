import { expect, test } from "vitest";
import { dueAtFromInput, dueAtInputOf, isLocalMidnight } from "./issueDueAt";

test("날짜만 고르면 그날 현지 0시를, 시각까지 고르면 그 현지 시각을 UTC 시각으로 바꾼다", () => {
  expect(dueAtFromInput({ day: "2026-11-05", time: "" })).toBe(new Date(2026, 10, 5).toISOString());
  expect(dueAtFromInput({ day: "2026-11-05", time: "15:30" })).toBe(
    new Date(2026, 10, 5, 15, 30).toISOString(),
  );
});

test("저장된 마감 시각을 입력 값으로 되돌리고, 현지 0시이면 시각을 비운다", () => {
  expect(dueAtInputOf(new Date(2026, 10, 5).getTime())).toEqual({ day: "2026-11-05", time: "" });
  expect(dueAtInputOf(new Date(2026, 10, 5, 9, 5).getTime())).toEqual({
    day: "2026-11-05",
    time: "09:05",
  });
});

test("현지 0시에서 1초라도 지나면 날짜만 넣은 마감일이 아니다", () => {
  expect(isLocalMidnight(new Date(2026, 10, 5).getTime())).toBe(true);
  expect(isLocalMidnight(new Date(2026, 10, 5, 0, 0, 1).getTime())).toBe(false);
});
