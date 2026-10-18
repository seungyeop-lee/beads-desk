import { expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture";
import { waiterCounts } from "./waiterCounts";

const countOf = (counts: ReadonlyMap<string, number>, id: string) => counts.get(id) ?? 0;

test("사슬을 따라 뒤에서 기다리는 이슈를 모두 센다", () => {
  const counts = waiterCounts([
    issue("a"),
    issue("b", { blockedBy: ["a"] }),
    issue("c", { blockedBy: ["b"] }),
  ]);

  expect(["a", "b", "c"].map((id) => countOf(counts, id))).toEqual([2, 1, 0]);
});

test("여러 길로 이어진 이슈는 한 번만 센다", () => {
  const counts = waiterCounts([
    issue("a"),
    issue("b", { blockedBy: ["a"] }),
    issue("c", { blockedBy: ["a"] }),
    issue("d", { blockedBy: ["b", "c"] }),
  ]);

  expect(countOf(counts, "a")).toBe(3);
});

test("닫힌 후속 이슈는 세지 않는다", () => {
  const counts = waiterCounts([
    issue("a"),
    issue("b", { blockedBy: ["a"] }),
    issue("done", { status: "closed", blockedBy: ["a"] }),
  ]);

  expect(countOf(counts, "a")).toBe(1);
});

test("순환이 있어도 계산이 끝나고, 자기 자신은 세지 않는다", () => {
  const counts = waiterCounts([
    issue("a", { blockedBy: ["c"] }),
    issue("b", { blockedBy: ["a"] }),
    issue("c", { blockedBy: ["b"] }),
  ]);

  expect(["a", "b", "c"].map((id) => countOf(counts, id))).toEqual([2, 2, 2]);
});
