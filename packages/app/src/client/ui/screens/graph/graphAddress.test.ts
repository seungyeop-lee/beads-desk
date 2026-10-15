import { expect, test } from "vitest";
import { graphHref, readGraphAddress } from "./graphAddress";

const read = (href: string) => readGraphAddress(new URL(href, "http://localhost").searchParams);

test("기본값인 조건은 주소에 넣지 않는다", () => {
  expect(graphHref({ tab: "order", epic: null, types: [], states: [], includeClosed: false })).toBe(
    "/graph",
  );
  expect(read("/graph")).toEqual({
    tab: "order",
    epic: null,
    types: [],
    states: [],
    includeClosed: false,
  });
});

test("탭, 에픽, 유형, 작업 상태, 닫힌 이슈 포함을 함께 담고, 주소에서 그대로 다시 읽는다", () => {
  const address = {
    tab: "hierarchy",
    epic: "demo-1",
    types: ["bug", "task"],
    states: ["ready", "blocked"],
    includeClosed: true,
  } as const;

  expect(read(graphHref(address))).toEqual(address);
});

test("알 수 없는 탭과 작업 상태는 버린다", () => {
  expect(read("/graph?tab=bogus&state=ready&state=bogus")).toMatchObject({
    tab: "order",
    states: ["ready"],
  });
});
