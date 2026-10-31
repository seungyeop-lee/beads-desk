import type { BdError } from "@beads-desk/bd";
import { expect, test, vi } from "vitest";
import type { Locale } from "@/shared/contract/locale";
import { requestLocale } from "./requestLocale";
import { bdErrorMessage } from "./serverMessages";

// Next 요청 밖에서는 쿠키와 헤더를 읽을 수 없으므로 테스트마다 언어를 정합니다.
vi.mock("./requestLocale", () => ({ requestLocale: vi.fn<typeof requestLocale>() }));

test.each<[Locale, BdError, string]>([
  ["ko", { kind: "emptyTitle", exitCode: null }, "제목이 비어 있습니다."],
  ["en", { kind: "emptyTitle", exitCode: null }, "The title is empty."],
  ["ko", { kind: "invalidDeferDate", exitCode: null }, "보류 날짜는 YYYY-MM-DD 형식이어야 합니다."],
  [
    "en",
    { kind: "invalidDeferDate", exitCode: null },
    "The defer date must be in YYYY-MM-DD format.",
  ],
  ["ko", { kind: "unparsableOutput", exitCode: 0 }, "bd 출력을 JSON으로 해석하지 못했습니다."],
  ["en", { kind: "unparsableOutput", exitCode: 0 }, "Could not parse the bd output as JSON."],
  ["ja", { kind: "emptyTitle", exitCode: null }, "タイトルが空です。"],
])("%s 요청에서는 adapter 오류 %j를 그 언어의 문구로 바꾼다", async (locale, error, message) => {
  vi.mocked(requestLocale).mockResolvedValue(locale);

  await expect(bdErrorMessage(error)).resolves.toBe(message);
});

test.each<Locale>(["ko", "en", "ja"])(
  "%s 요청에서도 bd가 남긴 실패 이유는 번역하지 않고 앞뒤 공백만 던다",
  async (locale) => {
    vi.mocked(requestLocale).mockResolvedValue(locale);

    await expect(bdErrorMessage({ message: "no issue found\n", exitCode: 1 })).resolves.toBe(
      "no issue found",
    );
  },
);
