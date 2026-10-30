import { expect, test } from "vitest";
import { MESSAGES } from "@/client/modules/locale/domain/messages";
import { deferUntilLabel, dueAtLabel, formatDate, formatTime } from "./issueTime";

test("보류 기한이 있으면 그 시각을, 없으면 무기한을 보인다", () => {
  const until = Date.parse("2026-10-16T13:04:46Z");

  expect(deferUntilLabel(MESSAGES.ko, "ko", until)).toBe(formatTime("ko", until));
  expect(deferUntilLabel(MESSAGES.ko, "ko", null)).toBe("무기한");
  expect(deferUntilLabel(MESSAGES.en, "en", null)).toBe("Indefinitely");
});

test("마감일은 현지 0시이면 날짜만, 아니면 날짜와 시각을 보인다", () => {
  const dateOnly = new Date(2026, 10, 5).getTime();
  const timed = new Date(2026, 10, 5, 15, 30).getTime();

  for (const locale of ["ko", "en"] as const) {
    expect(dueAtLabel(locale, dateOnly)).toBe(formatDate(locale, dateOnly));
    expect(dueAtLabel(locale, timed)).toMatch(new RegExp(`^${formatDate(locale, timed)}.+3:30`));
  }
});
