import { beforeEach, expect, test, vi } from "vitest";
import { THEME_COOKIE } from "@/shared/contract/theme";
import { requestTheme } from "./requestTheme";

/** 요청에 실린 쿠키입니다. */
const cookieValues = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieValues.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

beforeEach(() => cookieValues.clear());

test("설정에서 고른 테마를 쿠키에서 읽는다", async () => {
  cookieValues.set(THEME_COOKIE, "dark");

  expect(await requestTheme()).toBe("dark");
});

test.each([
  ["테마 쿠키가 없으면", undefined],
  ["알 수 없는 테마이면", "sepia"],
])("%s 운영체제 설정을 따르는 system으로 본다", async (_case, value) => {
  if (value !== undefined) cookieValues.set(THEME_COOKIE, value);

  expect(await requestTheme()).toBe("system");
});
