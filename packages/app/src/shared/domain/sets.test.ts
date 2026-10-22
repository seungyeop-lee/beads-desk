import { expect, test } from "vitest";
import { toggled } from "./sets";

test("원본 모음을 유지하면서 있던 값은 빼고 없던 값은 넣는다", () => {
  const values = new Set(["a"]);
  expect(toggled(values, "a")).toEqual(new Set());
  expect(toggled(values, "b")).toEqual(new Set(["a", "b"]));
  expect(values).toEqual(new Set(["a"]));
});
