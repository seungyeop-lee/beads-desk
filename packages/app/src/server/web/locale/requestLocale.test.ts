import { expect, test, vi } from "vitest";
import { LOCALE_COOKIE } from "@/shared/contract/locale";
import { pickLocale, requestLocale } from "./requestLocale";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === LOCALE_COOKIE ? { name, value: "ko" } : undefined),
  }),
  headers: async () => new Headers({ "Accept-Language": "en-US" }),
}));

test.each([
  ["ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7", "ko"],
  ["ko", "ko"],
  ["en-US,en;q=0.9,ko;q=0.8", "en"],
  ["ja-JP,ko;q=0.9", "ja"],
  ["ja", "ja"],
  ["fr-FR,ja;q=0.9", "en"],
  ["en;q=0.5,ko-KR;q=0.8", "ko"],
  ["ko;q=0,en", "en"],
  ["*", "en"],
  ["", "en"],
])("브라우저 언어 %j는 %s로 정한다", (acceptLanguage, locale) => {
  expect(pickLocale(undefined, acceptLanguage)).toBe(locale);
});

test("Accept-Language가 없으면 영어로 정한다", () => {
  expect(pickLocale(undefined, null)).toBe("en");
});

test("고른 언어가 있으면 브라우저 언어보다 앞선다", () => {
  expect(pickLocale("en", "ko-KR")).toBe("en");
  expect(pickLocale("ko", "en-US")).toBe("ko");
  expect(pickLocale("ja", "ko-KR")).toBe("ja");
});

test("알 수 없는 언어를 골랐으면 브라우저 언어로 정한다", () => {
  expect(pickLocale("fr", "ko-KR")).toBe("ko");
});

test("요청의 언어 쿠키에서 설정에서 고른 언어를 읽어 브라우저 언어보다 앞세운다", async () => {
  expect(await requestLocale()).toBe("ko");
});
