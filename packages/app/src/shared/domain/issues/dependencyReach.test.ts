import { expect, test } from "vitest";
import { reachableIssueIds } from "./dependencyReach";

const next = (edges: [string, string[]][]): ReadonlyMap<string, string[]> => new Map(edges);

test("시작 id에서 이어지는 id를 모두 담고 시작 id 자신은 뺀다", () => {
  const reached = reachableIssueIds(
    "a",
    next([
      ["a", ["b"]],
      ["b", ["c"]],
    ]),
  );

  expect([...reached].sort()).toEqual(["b", "c"]);
});

test("여러 길로 닿는 id는 한 번만 담는다", () => {
  const reached = reachableIssueIds(
    "a",
    next([
      ["a", ["b", "c"]],
      ["b", ["d"]],
      ["c", ["d"]],
    ]),
  );

  expect(reached.size).toBe(3);
});

test("순환이 있어도 끝나고 순환을 따라 시작 id에 되돌아와도 담지 않는다", () => {
  const reached = reachableIssueIds(
    "a",
    next([
      ["a", ["b"]],
      ["b", ["c"]],
      ["c", ["a", "d"]],
    ]),
  );

  expect([...reached].sort()).toEqual(["b", "c", "d"]);
});

test("시작 id에서 갈 곳이 없으면 빈 집합을 돌려준다", () => {
  expect(reachableIssueIds("a", next([]))).toEqual(new Set());
});
