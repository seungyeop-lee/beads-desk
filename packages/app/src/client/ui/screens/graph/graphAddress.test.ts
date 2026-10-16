import { expect, test } from "vitest";
import { graphHref, readGraphAddress } from "./graphAddress";

const read = (href: string) => readGraphAddress(new URL(href, "http://localhost").searchParams);

test("기본값인 조건은 주소에 넣지 않는다", () => {
  expect(
    graphHref({
      tab: "order",
      epic: { kind: "all" },
      types: [],
      states: [],
      includeClosed: false,
    }),
  ).toBe("/graph");
  expect(read("/graph")).toEqual({
    tab: "order",
    epic: { kind: "all" },
    types: [],
    states: [],
    includeClosed: false,
  });
});

test("탭, 에픽, 유형, 작업 상태, 닫힌 이슈 포함을 함께 담고, 주소에서 그대로 다시 읽는다", () => {
  const address = {
    tab: "hierarchy",
    epic: { kind: "epic", id: "demo-1" },
    types: ["bug", "task"],
    states: ["ready", "blocked"],
    includeClosed: true,
  } as const;

  expect(read(graphHref(address))).toEqual(address);
});

test("에픽에 속한 이슈와 속하지 않은 이슈는 이슈 id와 다른 이름으로 담고, 주소에서 그대로 다시 읽는다", () => {
  const base = { tab: "order", types: [], states: [], includeClosed: false } as const;

  expect(graphHref({ ...base, epic: { kind: "inEpic" } })).toBe("/graph?in-epic=1");
  expect(graphHref({ ...base, epic: { kind: "noEpic" } })).toBe("/graph?in-epic=0");
  expect(read("/graph?in-epic=1").epic).toEqual({ kind: "inEpic" });
  expect(read("/graph?in-epic=0").epic).toEqual({ kind: "noEpic" });
});

test("알 수 없는 에픽 소속 값은 전체로 읽는다", () => {
  expect(read("/graph?in-epic=bogus").epic).toEqual({ kind: "all" });
});

test("알 수 없는 탭과 작업 상태는 버린다", () => {
  expect(read("/graph?tab=bogus&state=ready&state=bogus")).toMatchObject({
    tab: "order",
    states: ["ready"],
  });
});
