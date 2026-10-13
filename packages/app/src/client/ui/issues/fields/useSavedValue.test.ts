import { expect, test } from "vitest";
import { shownSavedValue } from "./useSavedValue";

test("저장한 값이 없으면 서버 값을 보인다", () => {
  expect(shownSavedValue(null, "server")).toEqual({ shown: "server", settled: false });
});

test("서버 값이 저장할 때 그대로면 다시 읽기 전이므로 저장한 값을 보인다", () => {
  expect(shownSavedValue({ value: "mine", before: "server" }, "server")).toEqual({
    shown: "mine",
    settled: false,
  });
});

test("서버 값이 바뀌면 저장이 반영됐거나 다른 곳에서 고친 것이므로 서버 값을 보이고 저장한 값을 버린다", () => {
  expect(shownSavedValue({ value: "mine", before: "server" }, "other")).toEqual({
    shown: "other",
    settled: true,
  });
});
