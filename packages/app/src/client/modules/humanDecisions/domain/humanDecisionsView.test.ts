import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import type { HumanGateSummary } from "@/shared/contract/humanGates";
import { issue } from "@/shared/domain/issues/issueFixture";
import { sortByRequestedAt } from "./humanDecisionsView";

function gateSummary(id: string, fields: Partial<Issue> = {}): HumanGateSummary {
  return {
    gate: issue(id, { issueType: "gate", ...fields }),
    reason: "",
    blocks: [],
    previousGateCount: 0,
  };
}

test("확인 요청과 질문 각각을 요청 시각 내림차순으로 가장 최근 요청부터 보인다", () => {
  const sorted = sortByRequestedAt({
    gates: [
      gateSummary("old-gate", { createdAt: 1_000 }),
      gateSummary("new-gate", { createdAt: 2_000 }),
    ],
    questions: [
      issue("old-question", { createdAt: 1_000, labels: ["human"] }),
      issue("new-question", { createdAt: 2_000, labels: ["human"] }),
    ],
    count: 4,
  });

  expect(sorted.gates.map(({ gate }) => gate.id)).toEqual(["new-gate", "old-gate"]);
  expect(sorted.questions.map(({ id }) => id)).toEqual(["new-question", "old-question"]);
  expect(sorted.count).toBe(4);
});

test("같은 시각에 만든 항목은 id 오름차순으로 순서를 정한다", () => {
  const sorted = sortByRequestedAt({
    gates: [
      gateSummary("inv-10", { createdAt: 1_000 }),
      gateSummary("inv-2", { createdAt: 1_000 }),
    ],
    questions: [issue("inv-10", { createdAt: 1_000 }), issue("inv-2", { createdAt: 1_000 })],
    count: 4,
  });

  expect(sorted.gates.map(({ gate }) => gate.id)).toEqual(["inv-2", "inv-10"]);
  expect(sorted.questions.map(({ id }) => id)).toEqual(["inv-2", "inv-10"]);
});
