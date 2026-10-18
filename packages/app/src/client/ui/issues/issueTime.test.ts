import { expect, test } from "vitest";
import { MESSAGES } from "@/client/modules/locale/domain/messages";
import { deferUntilLabel, formatTime } from "./issueTime";

test("보류 기한이 있으면 그 시각을, 없으면 무기한을 보인다", () => {
  const until = Date.parse("2026-10-16T13:04:46Z");

  expect(deferUntilLabel(MESSAGES.ko, "ko", until)).toBe(formatTime("ko", until));
  expect(deferUntilLabel(MESSAGES.ko, "ko", null)).toBe("무기한");
  expect(deferUntilLabel(MESSAGES.en, "en", null)).toBe("Indefinitely");
});
