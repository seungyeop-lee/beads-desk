import { expect, test } from "vitest";
import { earliestDeferDay } from "./issueDeferral";

// 현지 시각으로 만들어, 테스트를 실행하는 시간대와 관계없이 하루의 경계를 확인합니다.
test("날짜 지정은 현지 날짜로 내일부터 고를 수 있다", () => {
  expect(earliestDeferDay(new Date(2026, 9, 15, 0, 0).getTime())).toBe("2026-10-16");
  expect(earliestDeferDay(new Date(2026, 9, 15, 23, 59).getTime())).toBe("2026-10-16");
});

test("달과 해가 바뀌는 날도 다음 날을 돌려준다", () => {
  expect(earliestDeferDay(new Date(2026, 9, 31, 12, 0).getTime())).toBe("2026-11-01");
  expect(earliestDeferDay(new Date(2026, 11, 31, 12, 0).getTime())).toBe("2027-01-01");
});
