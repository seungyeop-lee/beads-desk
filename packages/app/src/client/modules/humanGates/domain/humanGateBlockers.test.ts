import type { Issue } from "@beads-desk/bd/issue";
import { describe, expect, test } from "vitest";
import { blockersOf, humanGateTitles } from "./humanGateBlockers";

const gate = { id: "x-gate", title: "Review: x-1" } as Issue;
const gateTitles = humanGateTitles([{ gate, reason: "", blocks: [] }]);
const titles = new Map([["x-2", "선행 작업"]]);

describe("blockersOf", () => {
  test("열린 human gate를 앞에 두고 gate 제목을 담는다", () => {
    expect(blockersOf(["x-2", "x-gate"], gateTitles, (id) => titles.get(id))).toEqual([
      { id: "x-gate", humanGate: true, title: "Review: x-1" },
      { id: "x-2", humanGate: false, title: "선행 작업" },
    ]);
  });

  test("human gate가 아닌 막는 이슈는 받은 순서를 지키고, 제목을 찾지 못하면 비워 둔다", () => {
    expect(blockersOf(["x-3", "x-2"], gateTitles, (id) => titles.get(id))).toEqual([
      { id: "x-3", humanGate: false, title: undefined },
      { id: "x-2", humanGate: false, title: "선행 작업" },
    ]);
  });
});
