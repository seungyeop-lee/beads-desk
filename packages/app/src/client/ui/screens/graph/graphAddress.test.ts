import { expect, test } from "vitest";
import { graphHref, readGraphScope } from "./graphAddress";

const read = (href: string) => readGraphScope(new URL(href, "http://localhost").searchParams);

test.each([
  { kind: "epic", id: "demo-1" },
  { kind: "center", id: "demo-2" },
] as const)("범위를 주소에 담고, 주소에서 그대로 다시 읽는다: %o", (scope) => {
  expect(read(graphHref(scope))).toEqual(scope);
});

test("상세 dialog의 query가 함께 있어도 범위를 읽는다", () => {
  expect(read("/graph?center=demo-2&issue=demo-3&side=demo-4")).toEqual({
    kind: "center",
    id: "demo-2",
  });
});

test("범위가 없으면 null로 읽는다", () => {
  expect(read("/graph")).toBeNull();
  expect(read("/graph?epic=")).toBeNull();
});
