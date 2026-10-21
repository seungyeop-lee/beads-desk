import { describe, expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { blockersOf, gateTitles } from "./humanGateBlockers";

const gates = gateTitles([
  issue("x-gate", { title: "Review: x-1", issueType: "gate", awaitType: "human" }),
  issue("x-timer", { title: "Wait 72 hours", issueType: "gate", awaitType: "timer" }),
]);
const titles = new Map([["x-2", "선행 작업"]]);

describe("blockersOf", () => {
  test("열린 human gate를 앞에 두고 gate 제목을 담는다", () => {
    expect(blockersOf(["x-2", "x-gate"], gates, (id) => titles.get(id))).toEqual([
      { id: "x-gate", humanGate: true, title: "Review: x-1" },
      { id: "x-2", humanGate: false, title: "선행 작업" },
    ]);
  });

  test("human gate가 아닌 막는 이슈는 받은 순서를 지키고, 제목을 찾지 못하면 비워 둔다", () => {
    expect(blockersOf(["x-3", "x-2"], gates, (id) => titles.get(id))).toEqual([
      { id: "x-3", humanGate: false, title: undefined },
      { id: "x-2", humanGate: false, title: "선행 작업" },
    ]);
  });

  test("human gate가 아닌 gate는 사람 확인을 기다리지 않는 막는 이슈로 두고 gate 제목을 담는다", () => {
    expect(blockersOf(["x-timer"], gates, (id) => titles.get(id))).toEqual([
      { id: "x-timer", humanGate: false, title: "Wait 72 hours" },
    ]);
  });

  test("gate 목록을 아직 받지 못했으면 막는 이슈를 하나도 돌려주지 않는다", () => {
    expect(blockersOf(["x-2", "x-gate"], null, (id) => titles.get(id))).toEqual([]);
  });
});
